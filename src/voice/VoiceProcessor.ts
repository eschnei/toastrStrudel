/**
 * VoiceProcessor - Orchestration layer for voice recording and processing
 *
 * Coordinates AudioRecorder, AudioEffects, and SampleRegistry to provide
 * a high-level API for recording voice snippets, processing them with
 * effects, and registering them with Strudel.
 */

import { AudioRecorder, type RecordingResult } from './AudioRecorder'
import { AudioEffects } from './AudioEffects'
import { SampleRegistry } from './SampleRegistry'
import type {
  VoiceSnippet,
  VoiceEffectType,
  EffectOptions,
  RecordingState,
  VoiceSampleContext,
} from './types'

/**
 * Voice processor state
 */
export interface VoiceProcessorState {
  recordingState: RecordingState
  snippets: VoiceSnippet[]
  currentRecordingDuration: number
  audioLevel: number
}

/**
 * State change callback
 */
export type VoiceProcessorStateCallback = (state: VoiceProcessorState) => void

/**
 * Generate unique ID
 */
function generateId(): string {
  return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * VoiceProcessor class - main orchestration layer
 */
export class VoiceProcessor {
  private recorder: AudioRecorder
  private effects: AudioEffects
  private registry: SampleRegistry
  private snippets: VoiceSnippet[] = []
  private stateListeners: Set<VoiceProcessorStateCallback> = new Set()
  private recordingState: RecordingState = 'idle'
  private audioLevelInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.recorder = new AudioRecorder()
    this.effects = new AudioEffects()
    this.registry = new SampleRegistry()

    // Subscribe to recorder state changes
    this.recorder.onStateChange((state) => {
      this.recordingState = state
      this.notifyStateChange()
    })
  }

  /**
   * Set AudioContext (usually from StrudelEngine)
   */
  setAudioContext(context: AudioContext): void {
    this.recorder.setAudioContext(context)
    this.effects.setAudioContext(context)
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: VoiceProcessorStateCallback): () => void {
    this.stateListeners.add(callback)
    callback(this.getState())
    return () => {
      this.stateListeners.delete(callback)
    }
  }

  /**
   * Get current state
   */
  getState(): VoiceProcessorState {
    return {
      recordingState: this.recordingState,
      snippets: [...this.snippets],
      currentRecordingDuration: this.recorder.getCurrentDuration(),
      audioLevel: this.recorder.getAudioLevel(),
    }
  }

  /**
   * Check if recording is supported
   */
  isSupported(): boolean {
    return AudioRecorder.isSupported()
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (this.recordingState !== 'idle') {
      console.warn('[VoiceProcessor] Already recording or processing')
      return
    }

    await this.recorder.startRecording()

    // Start audio level monitoring
    this.audioLevelInterval = setInterval(() => {
      this.notifyStateChange()
    }, 50)
  }

  /**
   * Stop recording and get result
   */
  async stopRecording(): Promise<RecordingResult | null> {
    // Stop audio level monitoring
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval)
      this.audioLevelInterval = null
    }

    const result = await this.recorder.stopRecording()
    return result
  }

  /**
   * Cancel recording
   */
  cancelRecording(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval)
      this.audioLevelInterval = null
    }
    this.recorder.cancelRecording()
  }

  /**
   * Process the current recording with an effect and register it
   */
  async processAndRegister(
    recording: RecordingResult,
    effect: VoiceEffectType,
    instruction: string,
    options?: EffectOptions
  ): Promise<VoiceSnippet | null> {
    if (!recording) {
      console.error('[VoiceProcessor] No recording to process')
      return null
    }

    this.recordingState = 'processing'
    this.notifyStateChange()

    try {
      // Apply effect
      const effectResult = await this.effects.applyEffect(recording.buffer, effect, options)

      // Handle chop effect (multiple samples)
      if (effect === 'chop' && options?.chopSlices) {
        const slices = await this.effects.getChopSlices(recording.buffer, options.chopSlices)
        const registeredSamples = await this.registry.registerMultipleSamples(slices)

        // Create snippet for the chop
        const snippet: VoiceSnippet = {
          id: generateId(),
          sampleName: 'voice',
          sampleIndex: registeredSamples[0].index,
          duration: recording.duration,
          effect,
          instruction,
          timestamp: Date.now(),
          waveformData: recording.waveformData,
          originalBuffer: recording.buffer,
          processedBuffer: effectResult.buffer,
          previewUrl: URL.createObjectURL(recording.blob),
          isRegistered: true,
        }

        this.snippets.push(snippet)
        this.recordingState = 'idle'
        this.notifyStateChange()

        console.log(`[VoiceProcessor] Registered chopped sample: ${registeredSamples.length} slices`)
        return snippet
      }

      // Single sample registration
      const registeredSample = await this.registry.registerSample(effectResult.buffer)

      const snippet: VoiceSnippet = {
        id: generateId(),
        sampleName: registeredSample.name,
        sampleIndex: registeredSample.index,
        duration: effectResult.buffer.duration,
        effect,
        instruction,
        timestamp: Date.now(),
        waveformData: recording.waveformData,
        originalBuffer: recording.buffer,
        processedBuffer: effectResult.buffer,
        previewUrl: registeredSample.dataUrl,
        isRegistered: true,
      }

      this.snippets.push(snippet)
      this.recordingState = 'idle'
      this.notifyStateChange()

      console.log(`[VoiceProcessor] Registered sample: ${registeredSample.strudelRef}`)
      return snippet
    } catch (error) {
      console.error('[VoiceProcessor] Failed to process and register:', error)
      this.recordingState = 'idle'
      this.notifyStateChange()
      return null
    }
  }

  /**
   * Quick record-process-register flow
   * Returns snippet after recording stops
   */
  async recordAndProcess(
    effect: VoiceEffectType,
    instruction: string,
    options?: EffectOptions
  ): Promise<VoiceSnippet | null> {
    const recording = await this.stopRecording()
    if (!recording) return null

    return this.processAndRegister(recording, effect, instruction, options)
  }

  /**
   * Re-process an existing snippet with a different effect
   */
  async reprocessSnippet(
    snippetId: string,
    newEffect: VoiceEffectType,
    options?: EffectOptions
  ): Promise<VoiceSnippet | null> {
    const snippet = this.snippets.find(s => s.id === snippetId)
    if (!snippet || !snippet.originalBuffer) {
      console.error('[VoiceProcessor] Snippet not found or has no original buffer')
      return null
    }

    this.recordingState = 'processing'
    this.notifyStateChange()

    try {
      const effectResult = await this.effects.applyEffect(snippet.originalBuffer, newEffect, options)
      const registeredSample = await this.registry.registerSample(effectResult.buffer)

      // Update snippet
      snippet.effect = newEffect
      snippet.processedBuffer = effectResult.buffer
      snippet.sampleIndex = registeredSample.index
      snippet.previewUrl = registeredSample.dataUrl

      this.recordingState = 'idle'
      this.notifyStateChange()

      return snippet
    } catch (error) {
      console.error('[VoiceProcessor] Failed to reprocess:', error)
      this.recordingState = 'idle'
      this.notifyStateChange()
      return null
    }
  }

  /**
   * Remove a snippet
   */
  removeSnippet(snippetId: string): boolean {
    const index = this.snippets.findIndex(s => s.id === snippetId)
    if (index === -1) return false

    const snippet = this.snippets[index]

    // Revoke preview URL to free memory
    if (snippet.previewUrl && snippet.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(snippet.previewUrl)
    }

    this.snippets.splice(index, 1)
    this.notifyStateChange()
    return true
  }

  /**
   * Get all snippets
   */
  getSnippets(): VoiceSnippet[] {
    return [...this.snippets]
  }

  /**
   * Get snippet by ID
   */
  getSnippet(snippetId: string): VoiceSnippet | undefined {
    return this.snippets.find(s => s.id === snippetId)
  }

  /**
   * Get voice sample context for AI
   */
  getVoiceSampleContext(): VoiceSampleContext {
    const samples = this.snippets.map(snippet => ({
      name: `${snippet.sampleName}:${snippet.sampleIndex}`,
      duration: snippet.duration,
      effect: snippet.effect,
      instruction: snippet.instruction,
    }))

    return {
      samples,
      hasVoiceSamples: samples.length > 0,
    }
  }

  /**
   * Play preview of a snippet
   */
  async playPreview(snippetId: string): Promise<void> {
    const snippet = this.snippets.find(s => s.id === snippetId)
    if (!snippet || !snippet.previewUrl) {
      console.warn('[VoiceProcessor] Cannot play preview: snippet not found or no preview URL')
      return
    }

    await SampleRegistry.playPreview(snippet.previewUrl)
  }

  /**
   * Clear all snippets
   */
  clearAll(): void {
    // Revoke all preview URLs
    for (const snippet of this.snippets) {
      if (snippet.previewUrl && snippet.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(snippet.previewUrl)
      }
    }

    this.snippets = []
    this.registry.clear()
    this.notifyStateChange()
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recordingState === 'recording'
  }

  /**
   * Check if currently processing
   */
  isProcessing(): boolean {
    return this.recordingState === 'processing'
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    return this.recorder.getCurrentDuration()
  }

  /**
   * Get current audio level
   */
  getAudioLevel(): number {
    return this.recorder.getAudioLevel()
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    const state = this.getState()
    this.stateListeners.forEach(callback => callback(state))
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.cancelRecording()
    this.clearAll()
    this.recorder.dispose()
    this.stateListeners.clear()
  }
}

// Singleton instance
let processorInstance: VoiceProcessor | null = null

export function getVoiceProcessor(): VoiceProcessor {
  if (!processorInstance) {
    processorInstance = new VoiceProcessor()
  }
  return processorInstance
}

export function resetVoiceProcessor(): void {
  if (processorInstance) {
    processorInstance.dispose()
  }
  processorInstance = null
}
