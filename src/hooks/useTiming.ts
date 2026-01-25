/**
 * useTiming Hook - React integration for TimingManager
 *
 * Provides access to bar-based timing, scheduled changes,
 * and time-aware pattern scheduling.
 *
 * @references FR-020
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getTimingManager,
  TimingManager,
  type TimingState,
  type ScheduledChange,
  parseTimingCommand,
} from '@/engine/TimingManager'
import { useStore } from '@/store'

export interface UseTimingResult {
  /** Current timing state */
  state: TimingState
  /** List of scheduled changes */
  scheduledChanges: ScheduledChange[]
  /** Start the timing clock */
  start: () => void
  /** Stop the timing clock */
  stop: () => void
  /** Reset timing to bar 0 */
  reset: () => void
  /** Schedule a pattern change */
  scheduleChange: (
    pattern: string,
    barsFromNow: number,
    options?: {
      type?: ScheduledChange['type']
      description?: string
      onExecute?: (pattern: string) => void
    }
  ) => string
  /** Schedule at next bar boundary */
  scheduleAtNextBar: (
    pattern: string,
    options?: {
      type?: ScheduledChange['type']
      description?: string
      onExecute?: (pattern: string) => void
    }
  ) => string
  /** Cancel a scheduled change */
  cancelChange: (id: string) => boolean
  /** Cancel all scheduled changes */
  cancelAllChanges: () => void
  /** Parse timing from a command string */
  parseCommand: typeof parseTimingCommand
  /** Get time until next bar */
  getTimeToNextBar: () => number
  /** Get time until next beat */
  getTimeToNextBeat: () => number
  /** Whether there are pending changes */
  hasPendingChanges: boolean
  /** The next pending change */
  nextChange: ScheduledChange | null
  /** The timing manager instance */
  timingManager: TimingManager
}

export function useTiming(): UseTimingResult {
  const managerRef = useRef<TimingManager>(getTimingManager())
  const bpm = useStore(state => state.bpm)
  const isPlaying = useStore(state => state.isPlaying)

  const [state, setState] = useState<TimingState>(() => managerRef.current.getState())
  const [scheduledChanges, setScheduledChanges] = useState<ScheduledChange[]>([])

  // Sync BPM with store
  useEffect(() => {
    managerRef.current.setBPM(bpm)
  }, [bpm])

  // Auto-start/stop with playback
  useEffect(() => {
    if (isPlaying) {
      managerRef.current.start()
    } else {
      managerRef.current.stop()
    }
  }, [isPlaying])

  // Subscribe to timing state updates
  useEffect(() => {
    const unsubscribeState = managerRef.current.subscribe(newState => {
      setState(newState)
    })

    const unsubscribeChanges = managerRef.current.subscribeToChanges(changes => {
      setScheduledChanges(changes)
    })

    return () => {
      unsubscribeState()
      unsubscribeChanges()
    }
  }, [])

  const start = useCallback(() => {
    managerRef.current.start()
  }, [])

  const stop = useCallback(() => {
    managerRef.current.stop()
  }, [])

  const reset = useCallback(() => {
    managerRef.current.reset()
  }, [])

  const scheduleChange = useCallback(
    (
      pattern: string,
      barsFromNow: number,
      options?: {
        type?: ScheduledChange['type']
        description?: string
        onExecute?: (pattern: string) => void
      }
    ) => {
      return managerRef.current.scheduleChange(pattern, barsFromNow, options)
    },
    []
  )

  const scheduleAtNextBar = useCallback(
    (
      pattern: string,
      options?: {
        type?: ScheduledChange['type']
        description?: string
        onExecute?: (pattern: string) => void
      }
    ) => {
      return managerRef.current.scheduleAtNextBar(pattern, options)
    },
    []
  )

  const cancelChange = useCallback((id: string) => {
    return managerRef.current.cancelChange(id)
  }, [])

  const cancelAllChanges = useCallback(() => {
    managerRef.current.cancelAllChanges()
  }, [])

  const getTimeToNextBar = useCallback(() => {
    return managerRef.current.getTimeToNextBar()
  }, [])

  const getTimeToNextBeat = useCallback(() => {
    return managerRef.current.getTimeToNextBeat()
  }, [])

  return {
    state,
    scheduledChanges,
    start,
    stop,
    reset,
    scheduleChange,
    scheduleAtNextBar,
    cancelChange,
    cancelAllChanges,
    parseCommand: parseTimingCommand,
    getTimeToNextBar,
    getTimeToNextBeat,
    hasPendingChanges: scheduledChanges.length > 0,
    nextChange: scheduledChanges[0] || null,
    timingManager: managerRef.current,
  }
}

/**
 * Lightweight hook for just reading timing state
 */
export function useTimingState(): TimingState {
  const [state, setState] = useState<TimingState>(() => getTimingManager().getState())

  useEffect(() => {
    const unsubscribe = getTimingManager().subscribe(newState => {
      setState(newState)
    })
    return unsubscribe
  }, [])

  return state
}

/**
 * Hook for watching scheduled changes
 */
export function useScheduledChanges(): ScheduledChange[] {
  const [changes, setChanges] = useState<ScheduledChange[]>([])

  useEffect(() => {
    const unsubscribe = getTimingManager().subscribeToChanges(newChanges => {
      setChanges(newChanges)
    })
    return unsubscribe
  }, [])

  return changes
}
