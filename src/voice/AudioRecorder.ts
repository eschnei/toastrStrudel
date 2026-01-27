/**
 * AudioRecorder - MediaRecorder API wrapper for voice recording
 *
 * Handles microphone access, recording state, and waveform analysis.
 * Designed to work with the existing StrudelEngine AudioContext.
 */

import type { RecordingOptions, WaveformAnalysis } from './types'

/**
 * Recorder state change callback
 */
export type RecorderStateCallback = (state: 'idle' | 'recording' | 'processing') => void

/**
 * Recording result
 */
export interface RecordingResult {
  /** The recorded AudioBuffer */
  buffer: AudioBuffer
  /** Duration in seconds */
  duration: number
  /** Waveform data for visualization */
  waveformData: number[]
  /** Blob of the recording (for preview playback) */
  blob: Blob
}

/**
 * Default recording options
 */
const DEFAULT_OPTIONS: Required<RecordingOptions> = {
  maxDuration: 10,
  minDuration: 1,
  sampleRate: 44100,
}

/**
 * AudioRecorder class - records audio from the microphone
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private analyserNode: AnalyserNode | null = null
  private chunks: Blob[] = []
  private options: Required<RecordingOptions>
  private stateCallback: RecorderStateCallback | null = null
  private recordingStartTime: number = 0
  private maxDurationTimeout: ReturnType<typeof setTimeout> | null = null
  private waveformDataPoints: number[] = []
  private waveformIntervalId: ReturnType<typeof setInterval> | null = null

  constructor(audioContext?: AudioContext, options: RecordingOptions = {}) {
    this.audioContext = audioContext || null
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Set the AudioContext (can be called later if not available at construction)
   */
  setAudioContext(context: AudioContext): void {
    this.audioContext = context
    this.options.sampleRate = context.sampleRate
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: RecorderStateCallback): () => void {
    this.stateCallback = callback
    return () => {
      this.stateCallback = null
    }
  }

  /**
   * Check if recording is supported
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    )
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (!AudioRecorder.isSupported()) {
      throw new Error('MediaRecorder not supported in this browser')
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      console.warn('[AudioRecorder] Already recording')
      return
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: this.options.sampleRate,
        },
      })

      // Create AudioContext if not provided
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }

      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Create analyser for waveform visualization
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 256
      const source = this.audioContext.createMediaStreamSource(this.stream)
      source.connect(this.analyserNode)

      // Set up MediaRecorder
      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })
      this.chunks = []
      this.waveformDataPoints = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data)
        }
      }

      // Start recording
      this.mediaRecorder.start(100) // Collect data every 100ms
      this.recordingStartTime = Date.now()
      this.notifyState('recording')

      // Start waveform sampling
      this.startWaveformSampling()

      // Set max duration timeout
      this.maxDurationTimeout = setTimeout(() => {
        this.stopRecording()
      }, this.options.maxDuration * 1000)

      console.log('[AudioRecorder] Recording started')
    } catch (error) {
      console.error('[AudioRecorder] Failed to start recording:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Stop recording and return the result
   */
  async stopRecording(): Promise<RecordingResult | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      console.warn('[AudioRecorder] Not recording')
      return null
    }

    // Clear max duration timeout
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout)
      this.maxDurationTimeout = null
    }

    // Stop waveform sampling
    this.stopWaveformSampling()

    // Check minimum duration
    const duration = (Date.now() - this.recordingStartTime) / 1000
    if (duration < this.options.minDuration) {
      console.warn('[AudioRecorder] Recording too short, discarding')
      this.cleanup()
      this.notifyState('idle')
      return null
    }

    this.notifyState('processing')

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null)
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          // Create blob from chunks
          const blob = new Blob(this.chunks, { type: this.getSupportedMimeType() })

          // Convert to AudioBuffer
          const arrayBuffer = await blob.arrayBuffer()

          if (!this.audioContext) {
            this.audioContext = new AudioContext()
          }

          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

          const result: RecordingResult = {
            buffer: audioBuffer,
            duration: audioBuffer.duration,
            waveformData: this.waveformDataPoints.length > 0
              ? this.waveformDataPoints
              : this.extractWaveformFromBuffer(audioBuffer),
            blob,
          }

          console.log('[AudioRecorder] Recording complete:', result.duration.toFixed(2), 'seconds')

          this.cleanup()
          this.notifyState('idle')
          resolve(result)
        } catch (error) {
          console.error('[AudioRecorder] Failed to process recording:', error)
          this.cleanup()
          this.notifyState('idle')
          resolve(null)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Cancel recording without saving
   */
  cancelRecording(): void {
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout)
      this.maxDurationTimeout = null
    }
    this.stopWaveformSampling()

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }

    this.cleanup()
    this.notifyState('idle')
    console.log('[AudioRecorder] Recording cancelled')
  }

  /**
   * Get current recording duration in seconds
   */
  getCurrentDuration(): number {
    if (!this.recordingStartTime) return 0
    return (Date.now() - this.recordingStartTime) / 1000
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  /**
   * Get real-time audio level (0-1)
   */
  getAudioLevel(): number {
    if (!this.analyserNode) return 0

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(dataArray)

    // Calculate RMS
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length) / 255

    return rms
  }

  /**
   * Analyze waveform of an AudioBuffer
   */
  static analyzeWaveform(buffer: AudioBuffer, numPoints: number = 100): WaveformAnalysis {
    const channelData = buffer.getChannelData(0) // Use first channel
    const samplesPerPoint = Math.floor(channelData.length / numPoints)
    const waveformData: number[] = []
    let peak = 0
    let sumSquares = 0

    for (let i = 0; i < numPoints; i++) {
      const start = i * samplesPerPoint
      const end = Math.min(start + samplesPerPoint, channelData.length)

      let pointMax = 0
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j])
        if (abs > pointMax) pointMax = abs
        if (abs > peak) peak = abs
        sumSquares += channelData[j] * channelData[j]
      }

      waveformData.push(pointMax)
    }

    const rms = Math.sqrt(sumSquares / channelData.length)

    return { peak, rms, waveformData }
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'audio/webm' // Default fallback
  }

  /**
   * Start sampling waveform during recording
   */
  private startWaveformSampling(): void {
    if (!this.analyserNode) return

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)

    this.waveformIntervalId = setInterval(() => {
      if (!this.analyserNode) return

      this.analyserNode.getByteTimeDomainData(dataArray)

      // Find peak amplitude in this sample
      let peak = 0
      for (let i = 0; i < dataArray.length; i++) {
        const value = Math.abs(dataArray[i] - 128) / 128
        if (value > peak) peak = value
      }

      this.waveformDataPoints.push(peak)
    }, 50) // Sample every 50ms
  }

  /**
   * Stop waveform sampling
   */
  private stopWaveformSampling(): void {
    if (this.waveformIntervalId) {
      clearInterval(this.waveformIntervalId)
      this.waveformIntervalId = null
    }
  }

  /**
   * Extract waveform data from AudioBuffer (fallback)
   */
  private extractWaveformFromBuffer(buffer: AudioBuffer): number[] {
    return AudioRecorder.analyzeWaveform(buffer, 100).waveformData
  }

  /**
   * Notify state change
   */
  private notifyState(state: 'idle' | 'recording' | 'processing'): void {
    if (this.stateCallback) {
      this.stateCallback(state)
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    this.mediaRecorder = null
    this.chunks = []
  }

  /**
   * Dispose of the recorder
   */
  dispose(): void {
    this.cancelRecording()
    this.audioContext = null
    this.stateCallback = null
  }
}
