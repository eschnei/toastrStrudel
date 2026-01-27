/**
 * Voice Recording Types
 *
 * TypeScript interfaces for voice snippet recording, processing, and playback.
 */

/**
 * Recording state enum
 */
export type RecordingState = 'idle' | 'recording' | 'processing'

/**
 * Available voice effects
 */
export type VoiceEffectType = 'raw' | 'tune' | 'chop' | 'vocode' | 'stretch'

/**
 * Voice snippet - a recorded audio sample with metadata
 */
export interface VoiceSnippet {
  /** Unique identifier */
  id: string
  /** Sample name for Strudel (e.g., "voice:0") */
  sampleName: string
  /** Sample index for this snippet */
  sampleIndex: number
  /** Duration in seconds */
  duration: number
  /** Effect applied */
  effect: VoiceEffectType
  /** User's instruction for how to use this sample */
  instruction: string
  /** Timestamp when recorded */
  timestamp: number
  /** Waveform data for display (normalized 0-1) */
  waveformData: number[]
  /** Original AudioBuffer (for effects reprocessing) */
  originalBuffer?: AudioBuffer
  /** Processed AudioBuffer (after effects) */
  processedBuffer?: AudioBuffer
  /** Data URL of the audio for playback preview */
  previewUrl?: string
  /** Whether this snippet has been registered with Strudel */
  isRegistered: boolean
}

/**
 * Options for recording
 */
export interface RecordingOptions {
  /** Maximum recording duration in seconds (default: 10) */
  maxDuration?: number
  /** Minimum recording duration in seconds (default: 1) */
  minDuration?: number
  /** Sample rate (default: AudioContext.sampleRate) */
  sampleRate?: number
}

/**
 * Effect processing options
 */
export interface EffectOptions {
  /** For tune: target scale (default: 'C:major') */
  scale?: string
  /** For chop: number of slices (default: 8) */
  chopSlices?: number
  /** For vocode: carrier frequency (default: 200) */
  vocodeCarrierFreq?: number
  /** For stretch: stretch ratio (default: 2.0) */
  stretchRatio?: number
  /** For stretch: grain size in seconds (default: 0.05) */
  grainSize?: number
}

/**
 * Result of processing an effect
 */
export interface EffectResult {
  /** The processed buffer */
  buffer: AudioBuffer
  /** Array of sample names if multiple samples were created (e.g., chop) */
  sampleNames: string[]
  /** Effect that was applied */
  effect: VoiceEffectType
}

/**
 * Waveform analysis result
 */
export interface WaveformAnalysis {
  /** Peak amplitude (0-1) */
  peak: number
  /** RMS (average) amplitude (0-1) */
  rms: number
  /** Waveform data points for visualization */
  waveformData: number[]
}

/**
 * Voice sample context for AI generation
 */
export interface VoiceSampleContext {
  /** Available voice samples and their Strudel names */
  samples: Array<{
    name: string
    duration: number
    effect: VoiceEffectType
    instruction: string
  }>
  /** Whether voice samples are available */
  hasVoiceSamples: boolean
}
