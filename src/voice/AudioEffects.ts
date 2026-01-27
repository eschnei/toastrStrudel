/**
 * AudioEffects - Voice processing effects using Web Audio API
 *
 * Implements 5 effects for voice samples:
 * - raw: Passthrough (no processing)
 * - tune: Pitch shift to nearest scale note
 * - chop: Slice into equal segments
 * - vocode: Vocoder effect with carrier oscillator
 * - stretch: Time stretch using granular synthesis
 */

import type { VoiceEffectType, EffectOptions, EffectResult } from './types'

/**
 * Default effect options
 */
const DEFAULT_OPTIONS: Required<EffectOptions> = {
  scale: 'C:major',
  chopSlices: 8,
  vocodeCarrierFreq: 200,
  stretchRatio: 2.0,
  grainSize: 0.05,
}

/**
 * Scale note frequencies (in Hz, based on A4 = 440Hz)
 */
const SCALE_NOTES: Record<string, number[]> = {
  'C:major': [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88], // C D E F G A B
  'C:minor': [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16], // C D Eb F G Ab Bb
  'A:minor': [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00], // A B C D E F G
}

/**
 * AudioEffects class - processes audio with various effects
 */
export class AudioEffects {
  private audioContext: AudioContext

  constructor(audioContext?: AudioContext) {
    this.audioContext = audioContext || new AudioContext()
  }

  /**
   * Set AudioContext
   */
  setAudioContext(context: AudioContext): void {
    this.audioContext = context
  }

  /**
   * Apply an effect to an AudioBuffer
   */
  async applyEffect(
    buffer: AudioBuffer,
    effect: VoiceEffectType,
    options: EffectOptions = {}
  ): Promise<EffectResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    switch (effect) {
      case 'raw':
        return this.applyRaw(buffer)
      case 'tune':
        return this.applyTune(buffer, opts.scale)
      case 'chop':
        return this.applyChop(buffer, opts.chopSlices)
      case 'vocode':
        return this.applyVocode(buffer, opts.vocodeCarrierFreq)
      case 'stretch':
        return this.applyStretch(buffer, opts.stretchRatio, opts.grainSize)
      default:
        return this.applyRaw(buffer)
    }
  }

  /**
   * Raw effect - passthrough
   */
  private async applyRaw(buffer: AudioBuffer): Promise<EffectResult> {
    return {
      buffer,
      sampleNames: ['voice:0'],
      effect: 'raw',
    }
  }

  /**
   * Tune effect - pitch shift using playbackRate
   * Shifts pitch to nearest note in the scale
   */
  private async applyTune(buffer: AudioBuffer, scale: string): Promise<EffectResult> {
    // Detect the dominant frequency of the input
    const dominantFreq = await this.detectPitch(buffer)

    // Find nearest scale note
    const scaleNotes = SCALE_NOTES[scale] || SCALE_NOTES['C:major']
    const nearestNote = this.findNearestNote(dominantFreq, scaleNotes)

    // Calculate pitch shift ratio
    const ratio = nearestNote / dominantFreq

    // Apply pitch shift using offline context
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      Math.ceil(buffer.length / ratio),
      buffer.sampleRate
    )

    const source = offlineContext.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = ratio
    source.connect(offlineContext.destination)
    source.start()

    const processedBuffer = await offlineContext.startRendering()

    return {
      buffer: processedBuffer,
      sampleNames: ['voice:0'],
      effect: 'tune',
    }
  }

  /**
   * Chop effect - slice buffer into equal segments
   */
  private async applyChop(buffer: AudioBuffer, numSlices: number): Promise<EffectResult> {
    const sliceLength = Math.floor(buffer.length / numSlices)
    const slices: AudioBuffer[] = []
    const sampleNames: string[] = []

    for (let i = 0; i < numSlices; i++) {
      const start = i * sliceLength
      const end = Math.min(start + sliceLength, buffer.length)
      const sliceData = new Float32Array(end - start)

      // Copy channel data
      const sourceData = buffer.getChannelData(0)
      for (let j = 0; j < sliceData.length; j++) {
        sliceData[j] = sourceData[start + j]
      }

      // Create new AudioBuffer for slice
      const sliceBuffer = this.audioContext.createBuffer(
        1, // mono
        sliceData.length,
        buffer.sampleRate
      )
      sliceBuffer.getChannelData(0).set(sliceData)

      slices.push(sliceBuffer)
      sampleNames.push(`voice:${i}`)
    }

    // Return the first slice as the main buffer, all slices will be registered separately
    return {
      buffer: slices[0],
      sampleNames,
      effect: 'chop',
    }
  }

  /**
   * Vocode effect - vocoder with carrier oscillator
   * Creates a robotic/synthetic voice effect
   */
  private async applyVocode(buffer: AudioBuffer, carrierFreq: number): Promise<EffectResult> {
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    )

    // Create source
    const source = offlineContext.createBufferSource()
    source.buffer = buffer

    // Create carrier oscillator
    const carrier = offlineContext.createOscillator()
    carrier.type = 'sawtooth'
    carrier.frequency.value = carrierFreq

    // Create filter bank (8 bands)
    const numBands = 8
    const minFreq = 100
    const maxFreq = 8000
    const bands: BiquadFilterNode[] = []
    const followers: GainNode[] = []

    for (let i = 0; i < numBands; i++) {
      // Calculate center frequency for this band (logarithmic spacing)
      const centerFreq = minFreq * Math.pow(maxFreq / minFreq, i / (numBands - 1))

      // Bandpass filter for modulator (voice)
      const modFilter = offlineContext.createBiquadFilter()
      modFilter.type = 'bandpass'
      modFilter.frequency.value = centerFreq
      modFilter.Q.value = 2

      // Bandpass filter for carrier
      const carFilter = offlineContext.createBiquadFilter()
      carFilter.type = 'bandpass'
      carFilter.frequency.value = centerFreq
      carFilter.Q.value = 2

      // Envelope follower (simplified as gain node)
      const follower = offlineContext.createGain()
      follower.gain.value = 0.5

      // Connect modulator chain
      source.connect(modFilter)
      modFilter.connect(follower)

      // Connect carrier chain
      carrier.connect(carFilter)
      carFilter.connect(follower)

      // Connect to output
      follower.connect(offlineContext.destination)

      bands.push(modFilter)
      followers.push(follower)
    }

    // Start source and carrier
    source.start()
    carrier.start()

    const processedBuffer = await offlineContext.startRendering()

    // Normalize the output
    const normalizedBuffer = this.normalizeBuffer(processedBuffer)

    return {
      buffer: normalizedBuffer,
      sampleNames: ['voice:0'],
      effect: 'vocode',
    }
  }

  /**
   * Stretch effect - time stretch using granular synthesis
   * Similar to TimeStretch.ts but for voice samples
   */
  private async applyStretch(
    buffer: AudioBuffer,
    stretchRatio: number,
    grainSize: number
  ): Promise<EffectResult> {
    const sampleRate = buffer.sampleRate
    const grainSamples = Math.floor(grainSize * sampleRate)
    const hopSize = Math.floor(grainSamples / 4) // 75% overlap
    const inputData = buffer.getChannelData(0)

    // Calculate output length
    const outputLength = Math.floor(buffer.length * stretchRatio)
    const outputData = new Float32Array(outputLength)

    // Hann window function
    const window = new Float32Array(grainSamples)
    for (let i = 0; i < grainSamples; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (grainSamples - 1)))
    }

    // Process grains
    let inputPosition = 0
    let outputPosition = 0
    const outputHopSize = Math.floor(hopSize * stretchRatio)

    while (outputPosition + grainSamples < outputLength && inputPosition + grainSamples < inputData.length) {
      // Extract and window grain
      for (let i = 0; i < grainSamples; i++) {
        const inputIdx = Math.floor(inputPosition) + i
        if (inputIdx < inputData.length) {
          const grainSample = inputData[inputIdx] * window[i]
          outputData[outputPosition + i] += grainSample
        }
      }

      inputPosition += hopSize
      outputPosition += outputHopSize
    }

    // Create output buffer
    const stretchedBuffer = this.audioContext.createBuffer(
      1,
      outputLength,
      sampleRate
    )
    stretchedBuffer.getChannelData(0).set(outputData)

    // Normalize
    const normalizedBuffer = this.normalizeBuffer(stretchedBuffer)

    return {
      buffer: normalizedBuffer,
      sampleNames: ['voice:0'],
      effect: 'stretch',
    }
  }

  /**
   * Get chop slices for separate registration
   */
  async getChopSlices(buffer: AudioBuffer, numSlices: number): Promise<AudioBuffer[]> {
    const sliceLength = Math.floor(buffer.length / numSlices)
    const slices: AudioBuffer[] = []

    for (let i = 0; i < numSlices; i++) {
      const start = i * sliceLength
      const end = Math.min(start + sliceLength, buffer.length)
      const sliceData = new Float32Array(end - start)

      const sourceData = buffer.getChannelData(0)
      for (let j = 0; j < sliceData.length; j++) {
        sliceData[j] = sourceData[start + j]
      }

      const sliceBuffer = this.audioContext.createBuffer(
        1,
        sliceData.length,
        buffer.sampleRate
      )
      sliceBuffer.getChannelData(0).set(sliceData)

      slices.push(sliceBuffer)
    }

    return slices
  }

  /**
   * Detect dominant pitch using autocorrelation
   */
  private async detectPitch(buffer: AudioBuffer): Promise<number> {
    const data = buffer.getChannelData(0)
    const sampleRate = buffer.sampleRate

    // Simple autocorrelation-based pitch detection
    const minPeriod = Math.floor(sampleRate / 500) // Max 500Hz
    const maxPeriod = Math.floor(sampleRate / 80)  // Min 80Hz
    const numSamples = Math.min(data.length, sampleRate * 0.1) // Use first 100ms

    let bestCorrelation = 0
    let bestPeriod = minPeriod

    for (let period = minPeriod; period < maxPeriod; period++) {
      let correlation = 0
      for (let i = 0; i < numSamples - period; i++) {
        correlation += data[i] * data[i + period]
      }
      correlation /= numSamples - period

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestPeriod = period
      }
    }

    const frequency = sampleRate / bestPeriod

    // Default to 200Hz if detection fails
    if (frequency < 80 || frequency > 500 || bestCorrelation < 0.1) {
      return 200
    }

    return frequency
  }

  /**
   * Find nearest note in scale
   */
  private findNearestNote(frequency: number, scaleNotes: number[]): number {
    // Extend scale to multiple octaves
    const allNotes: number[] = []
    for (let octave = -2; octave <= 2; octave++) {
      for (const note of scaleNotes) {
        allNotes.push(note * Math.pow(2, octave))
      }
    }

    // Find closest note
    let closest = allNotes[0]
    let minDiff = Math.abs(Math.log2(frequency / closest))

    for (const note of allNotes) {
      const diff = Math.abs(Math.log2(frequency / note))
      if (diff < minDiff) {
        minDiff = diff
        closest = note
      }
    }

    return closest
  }

  /**
   * Normalize buffer to prevent clipping
   */
  private normalizeBuffer(buffer: AudioBuffer): AudioBuffer {
    const data = buffer.getChannelData(0)
    let max = 0

    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i])
      if (abs > max) max = abs
    }

    if (max > 0 && max !== 1) {
      const scale = 0.9 / max // Leave headroom
      for (let i = 0; i < data.length; i++) {
        data[i] *= scale
      }
    }

    return buffer
  }
}

// Singleton instance
let effectsInstance: AudioEffects | null = null

export function getAudioEffects(audioContext?: AudioContext): AudioEffects {
  if (!effectsInstance) {
    effectsInstance = new AudioEffects(audioContext)
  } else if (audioContext) {
    effectsInstance.setAudioContext(audioContext)
  }
  return effectsInstance
}

export function resetAudioEffects(): void {
  effectsInstance = null
}
