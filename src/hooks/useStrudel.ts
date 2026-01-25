/**
 * useStrudel Hook - React interface for StrudelEngine
 *
 * Manages the StrudelEngine instance lifecycle and provides
 * a clean React interface for audio playback control.
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { getStrudelEngine, type StrudelEngineState } from '@/engine'
import { useStore } from '@/store'

export interface UseStrudelReturn {
  // State
  isPlaying: boolean
  isReady: boolean
  currentBPM: number
  error: string | null
  audioContextState: string

  // Actions
  play: () => Promise<void>
  stop: () => void
  toggle: () => Promise<void>
  updatePattern: (code: string) => Promise<boolean>
  setBPM: (bpm: number) => void
  initialize: () => Promise<void>
  clearError: () => void

  // Engine access (for advanced use)
  getAudioContext: () => AudioContext | null
  getAnalyserNode: () => AnalyserNode | null
}

// Get initial engine state outside of component
const getInitialState = () => getStrudelEngine().getState()

/**
 * Hook for interacting with the Strudel audio engine
 */
export function useStrudel(): UseStrudelReturn {
  const engineRef = useRef(getStrudelEngine())
  const [engineState, setEngineState] = useState<StrudelEngineState>(getInitialState)

  // Store actions
  const setStorePattern = useStore(state => state.setPattern)
  const setStorePlaying = useStore(state => state.setPlaying)
  const setStoreBPM = useStore(state => state.setBPM)
  const setStoreEngineReady = useStore(state => state.setEngineReady)
  const setStoreError = useStore(state => state.setError)

  // Subscribe to engine state changes
  useEffect(() => {
    const engine = engineRef.current

    const unsubscribe = engine.onStateChange((state: StrudelEngineState) => {
      setEngineState(state)

      // Sync relevant state to store
      setStorePlaying(state.isPlaying)
      setStoreEngineReady(state.isReady)
      if (state.error) {
        setStoreError(state.error)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [setStorePlaying, setStoreEngineReady, setStoreError])

  // Initialize the engine
  const initialize = useCallback(async () => {
    try {
      await engineRef.current.initialize()
    } catch (error) {
      const err = error as Error
      console.error('[useStrudel] Initialization failed:', err)
      setStoreError(err.message)
    }
  }, [setStoreError])

  // Play
  const play = useCallback(async () => {
    try {
      await engineRef.current.play()
    } catch (error) {
      const err = error as Error
      console.error('[useStrudel] Play failed:', err)
      setStoreError(err.message)
    }
  }, [setStoreError])

  // Stop
  const stop = useCallback(() => {
    engineRef.current.stop()
  }, [])

  // Toggle
  const toggle = useCallback(async () => {
    try {
      await engineRef.current.toggle()
    } catch (error) {
      const err = error as Error
      console.error('[useStrudel] Toggle failed:', err)
      setStoreError(err.message)
    }
  }, [setStoreError])

  // Update pattern
  const updatePattern = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const success = await engineRef.current.updatePattern(code)
        if (success) {
          setStorePattern(code)
        }
        return success
      } catch (error) {
        const err = error as Error
        console.error('[useStrudel] Pattern update failed:', err)
        setStoreError(err.message)
        return false
      }
    },
    [setStorePattern, setStoreError]
  )

  // Set BPM
  const setBPM = useCallback(
    (bpm: number) => {
      engineRef.current.setBPM(bpm)
      setStoreBPM(bpm)
    },
    [setStoreBPM]
  )

  // Clear error
  const clearError = useCallback(() => {
    engineRef.current.clearError()
    setStoreError(null)
  }, [setStoreError])

  // Get audio context
  const getAudioContext = useCallback(() => {
    return engineRef.current.getAudioContext()
  }, [])

  // Get analyser node
  const getAnalyserNode = useCallback(() => {
    return engineRef.current.getAnalyserNode()
  }, [])

  return {
    // State
    isPlaying: engineState.isPlaying,
    isReady: engineState.isReady,
    currentBPM: engineState.bpm,
    error: engineState.error,
    audioContextState: engineState.audioContextState,

    // Actions
    play,
    stop,
    toggle,
    updatePattern,
    setBPM,
    initialize,
    clearError,
    getAudioContext,
    getAnalyserNode,
  }
}
