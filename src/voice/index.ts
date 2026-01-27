/**
 * Voice Recording Module
 *
 * Exports for voice recording, processing, and Strudel integration.
 */

// Types
export * from './types'

// Core modules
export { AudioRecorder, type RecordingResult, type RecorderStateCallback } from './AudioRecorder'
export { AudioEffects, getAudioEffects, resetAudioEffects } from './AudioEffects'
export { SampleRegistry, getSampleRegistry, resetSampleRegistry, type RegisteredSample, type RegistrationResult } from './SampleRegistry'
export { VoiceProcessor, getVoiceProcessor, resetVoiceProcessor, type VoiceProcessorState, type VoiceProcessorStateCallback } from './VoiceProcessor'
