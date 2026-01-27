/**
 * useVoiceRecorder Hook
 *
 * React hook for voice recording functionality.
 * Provides recording state, controls, and processing.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getVoiceProcessor, type VoiceProcessorState } from '@/voice/VoiceProcessor'
import { type RecordingResult } from '@/voice/AudioRecorder'
import { getStrudelEngine } from '@/engine/StrudelEngine'
import type { VoiceSnippet, VoiceEffectType, EffectOptions, RecordingState } from '@/voice/types'

/**
 * Hook return type
 */
export interface UseVoiceRecorderReturn {
  /** Whether recording is supported */
  isSupported: boolean
  /** Current recording state */
  recordingState: RecordingState
  /** Whether currently recording */
  isRecording: boolean
  /** Whether currently processing */
  isProcessing: boolean
  /** Current recording duration in seconds */
  recordingDuration: number
  /** Current audio level (0-1) */
  audioLevel: number
  /** Last recording result (available after recording stops) */
  lastRecording: RecordingResult | null
  /** All registered snippets */
  snippets: VoiceSnippet[]
  /** Start recording */
  startRecording: () => Promise<void>
  /** Stop recording and return result */
  stopRecording: () => Promise<RecordingResult | null>
  /** Cancel recording */
  cancelRecording: () => void
  /** Process and register a recording */
  processAndRegister: (
    effect: VoiceEffectType,
    instruction: string,
    options?: EffectOptions
  ) => Promise<VoiceSnippet | null>
  /** Reprocess a snippet with a different effect */
  reprocessSnippet: (
    snippetId: string,
    newEffect: VoiceEffectType,
    options?: EffectOptions
  ) => Promise<VoiceSnippet | null>
  /** Remove a snippet */
  removeSnippet: (snippetId: string) => void
  /** Clear all snippets */
  clearAll: () => void
  /** Play preview of a snippet */
  playPreview: (snippetId: string) => Promise<void>
}

/**
 * useVoiceRecorder - hook for voice recording
 */
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const processorRef = useRef(getVoiceProcessor())
  const [state, setState] = useState<VoiceProcessorState>(() => processorRef.current.getState())
  const [lastRecording, setLastRecording] = useState<RecordingResult | null>(null)
  const [isSupported] = useState(() => processorRef.current.isSupported())

  // Initialize with Strudel's AudioContext
  useEffect(() => {
    const engine = getStrudelEngine()
    const audioContext = engine.getAudioContext()

    if (audioContext) {
      processorRef.current.setAudioContext(audioContext)
    }

    // Subscribe to engine state changes to get AudioContext when ready
    const unsubscribe = engine.onStateChange((engineState) => {
      if (engineState.isReady) {
        const ctx = engine.getAudioContext()
        if (ctx) {
          processorRef.current.setAudioContext(ctx)
        }
      }
    })

    return unsubscribe
  }, [])

  // Subscribe to processor state changes
  useEffect(() => {
    const processor = processorRef.current
    const unsubscribe = processor.onStateChange((newState) => {
      setState(newState)
    })

    return unsubscribe
  }, [])

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    setLastRecording(null)
    await processorRef.current.startRecording()
  }, [])

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    const result = await processorRef.current.stopRecording()
    setLastRecording(result)
    return result
  }, [])

  /**
   * Cancel recording
   */
  const cancelRecording = useCallback(() => {
    processorRef.current.cancelRecording()
    setLastRecording(null)
  }, [])

  /**
   * Process and register
   */
  const processAndRegister = useCallback(
    async (
      effect: VoiceEffectType,
      instruction: string,
      options?: EffectOptions
    ): Promise<VoiceSnippet | null> => {
      if (!lastRecording) {
        console.error('[useVoiceRecorder] No recording to process')
        return null
      }

      const snippet = await processorRef.current.processAndRegister(
        lastRecording,
        effect,
        instruction,
        options
      )

      if (snippet) {
        setLastRecording(null)
      }

      return snippet
    },
    [lastRecording]
  )

  /**
   * Reprocess snippet
   */
  const reprocessSnippet = useCallback(
    async (
      snippetId: string,
      newEffect: VoiceEffectType,
      options?: EffectOptions
    ): Promise<VoiceSnippet | null> => {
      return processorRef.current.reprocessSnippet(snippetId, newEffect, options)
    },
    []
  )

  /**
   * Remove snippet
   */
  const removeSnippet = useCallback((snippetId: string) => {
    processorRef.current.removeSnippet(snippetId)
  }, [])

  /**
   * Clear all
   */
  const clearAll = useCallback(() => {
    processorRef.current.clearAll()
    setLastRecording(null)
  }, [])

  /**
   * Play preview
   */
  const playPreview = useCallback(async (snippetId: string) => {
    await processorRef.current.playPreview(snippetId)
  }, [])

  return {
    isSupported,
    recordingState: state.recordingState,
    isRecording: state.recordingState === 'recording',
    isProcessing: state.recordingState === 'processing',
    recordingDuration: state.currentRecordingDuration,
    audioLevel: state.audioLevel,
    lastRecording,
    snippets: state.snippets,
    startRecording,
    stopRecording,
    cancelRecording,
    processAndRegister,
    reprocessSnippet,
    removeSnippet,
    clearAll,
    playPreview,
  }
}

export default useVoiceRecorder
