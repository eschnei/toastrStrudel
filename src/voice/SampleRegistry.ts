/**
 * SampleRegistry - Register voice samples with Strudel/superdough
 *
 * Converts AudioBuffers to data URLs and registers them with superdough's
 * samples() function so they can be used in Strudel patterns.
 */

// @ts-expect-error - superdough lacks TypeScript definitions
import { samples } from 'superdough'

/**
 * Registered sample info
 */
export interface RegisteredSample {
  /** Sample name (e.g., "voice") */
  name: string
  /** Sample index (e.g., 0, 1, 2) */
  index: number
  /** Full Strudel reference (e.g., "voice:0") */
  strudelRef: string
  /** Data URL of the sample */
  dataUrl: string
}

/**
 * Sample registration result
 */
export interface RegistrationResult {
  success: boolean
  samples: RegisteredSample[]
  error?: string
}

/**
 * SampleRegistry class - manages voice sample registration
 */
export class SampleRegistry {
  private registeredSamples: Map<string, RegisteredSample> = new Map()
  private nextIndex: number = 0
  private samplePrefix: string = 'voice'

  constructor(prefix: string = 'voice') {
    this.samplePrefix = prefix
  }

  /**
   * Convert AudioBuffer to WAV data URL
   */
  static audioBufferToDataUrl(buffer: AudioBuffer): string {
    // Create WAV file in memory
    const wavBuffer = SampleRegistry.createWavBuffer(buffer)

    // Convert to base64 data URL
    const base64 = SampleRegistry.arrayBufferToBase64(wavBuffer)
    return `data:audio/wav;base64,${base64}`
  }

  /**
   * Create WAV buffer from AudioBuffer
   */
  private static createWavBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1 // PCM
    const bitsPerSample = 16

    // Interleave channels
    const interleaved = SampleRegistry.interleaveChannels(audioBuffer)

    // Create WAV header and data
    const dataLength = interleaved.length * 2 // 16-bit = 2 bytes
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)

    // Write WAV header
    // "RIFF" chunk descriptor
    SampleRegistry.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    SampleRegistry.writeString(view, 8, 'WAVE')

    // "fmt " sub-chunk
    SampleRegistry.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // Sub-chunk size
    view.setUint16(20, format, true) // Audio format (PCM)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true) // Byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8, true) // Block align
    view.setUint16(34, bitsPerSample, true)

    // "data" sub-chunk
    SampleRegistry.writeString(view, 36, 'data')
    view.setUint32(40, dataLength, true)

    // Write audio data
    SampleRegistry.floatTo16BitPCM(view, 44, interleaved)

    return buffer
  }

  /**
   * Interleave audio channels
   */
  private static interleaveChannels(audioBuffer: AudioBuffer): Float32Array {
    const numChannels = audioBuffer.numberOfChannels
    const length = audioBuffer.length

    if (numChannels === 1) {
      return audioBuffer.getChannelData(0)
    }

    // Interleave stereo channels
    const result = new Float32Array(length * numChannels)
    const channels: Float32Array[] = []

    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch))
    }

    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        result[i * numChannels + ch] = channels[ch][i]
      }
    }

    return result
  }

  /**
   * Write string to DataView
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  /**
   * Convert Float32 samples to 16-bit PCM
   */
  private static floatTo16BitPCM(view: DataView, offset: number, samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      const val = s < 0 ? s * 0x8000 : s * 0x7FFF
      view.setInt16(offset + i * 2, val, true)
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Register a single AudioBuffer as a voice sample
   */
  async registerSample(buffer: AudioBuffer, customIndex?: number): Promise<RegisteredSample> {
    const index = customIndex ?? this.nextIndex++
    const strudelRef = `${this.samplePrefix}:${index}`
    const dataUrl = SampleRegistry.audioBufferToDataUrl(buffer)

    // Register with superdough
    const sampleMap: Record<string, Record<string, string>> = {
      [this.samplePrefix]: {
        [String(index)]: dataUrl,
      },
    }

    try {
      await samples(sampleMap, '/')
      console.log(`[SampleRegistry] Registered sample: ${strudelRef}`)
    } catch (error) {
      console.error(`[SampleRegistry] Failed to register sample:`, error)
      throw error
    }

    const registered: RegisteredSample = {
      name: this.samplePrefix,
      index,
      strudelRef,
      dataUrl,
    }

    this.registeredSamples.set(strudelRef, registered)
    return registered
  }

  /**
   * Register multiple AudioBuffers (e.g., from chop effect)
   */
  async registerMultipleSamples(buffers: AudioBuffer[]): Promise<RegisteredSample[]> {
    const results: RegisteredSample[] = []
    const sampleMap: Record<string, Record<string, string>> = {
      [this.samplePrefix]: {},
    }

    for (let i = 0; i < buffers.length; i++) {
      const index = this.nextIndex++
      const strudelRef = `${this.samplePrefix}:${index}`
      const dataUrl = SampleRegistry.audioBufferToDataUrl(buffers[i])

      sampleMap[this.samplePrefix][String(index)] = dataUrl

      const registered: RegisteredSample = {
        name: this.samplePrefix,
        index,
        strudelRef,
        dataUrl,
      }

      this.registeredSamples.set(strudelRef, registered)
      results.push(registered)
    }

    try {
      await samples(sampleMap, '/')
      console.log(`[SampleRegistry] Registered ${buffers.length} samples`)
    } catch (error) {
      console.error(`[SampleRegistry] Failed to register samples:`, error)
      throw error
    }

    return results
  }

  /**
   * Get a registered sample by its Strudel reference
   */
  getSample(strudelRef: string): RegisteredSample | undefined {
    return this.registeredSamples.get(strudelRef)
  }

  /**
   * Get all registered samples
   */
  getAllSamples(): RegisteredSample[] {
    return Array.from(this.registeredSamples.values())
  }

  /**
   * Get the next available sample index
   */
  getNextIndex(): number {
    return this.nextIndex
  }

  /**
   * Clear all registered samples
   * Note: This doesn't unregister from superdough (not supported),
   * but clears our internal tracking
   */
  clear(): void {
    this.registeredSamples.clear()
    this.nextIndex = 0
  }

  /**
   * Create preview audio element for playback
   */
  static createPreviewPlayer(dataUrl: string): HTMLAudioElement {
    const audio = new Audio(dataUrl)
    audio.preload = 'auto'
    return audio
  }

  /**
   * Play a preview of a sample
   */
  static async playPreview(dataUrl: string): Promise<void> {
    const audio = SampleRegistry.createPreviewPlayer(dataUrl)
    await audio.play()
  }
}

// Singleton instance for convenience
let registryInstance: SampleRegistry | null = null

export function getSampleRegistry(): SampleRegistry {
  if (!registryInstance) {
    registryInstance = new SampleRegistry()
  }
  return registryInstance
}

export function resetSampleRegistry(): void {
  if (registryInstance) {
    registryInstance.clear()
  }
  registryInstance = null
}
