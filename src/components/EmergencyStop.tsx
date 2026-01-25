/**
 * EmergencyStop Component
 *
 * Immediate audio cutoff control that is always visible.
 * Provides a distinct red warning button with Escape key shortcut.
 *
 * @references FR-015, Phase 6 Deliverables
 */

import { useEffect, useCallback, useState } from 'react'
import { useStore } from '@/store'
import { useStrudel } from '@/hooks'
import styles from './EmergencyStop.module.css'

export interface EmergencyStopProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Show keyboard hint */
  showHint?: boolean
  /** Position style */
  position?: 'inline' | 'fixed'
  /** Callback after stop */
  onStop?: () => void
}

/**
 * EmergencyStop - immediate audio cutoff
 */
export function EmergencyStop({
  size = 'medium',
  showHint = true,
  position = 'inline',
  onStop,
}: EmergencyStopProps) {
  const isPlaying = useStore(state => state.isPlaying)
  const { stop, isReady } = useStrudel()
  const [isPressed, setIsPressed] = useState(false)
  const [recentlyStopped, setRecentlyStopped] = useState(false)

  /**
   * Handle emergency stop
   */
  const handleStop = useCallback(() => {
    if (isPlaying) {
      stop()
      setRecentlyStopped(true)
      onStop?.()

      // Reset recently stopped state after animation
      setTimeout(() => {
        setRecentlyStopped(false)
      }, 1000)
    }
  }, [isPlaying, stop, onStop])

  /**
   * Handle Escape key shortcut
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleStop()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleStop])

  /**
   * Handle pointer events for press animation
   */
  const handlePointerDown = useCallback(() => {
    setIsPressed(true)
  }, [])

  const handlePointerUp = useCallback(() => {
    setIsPressed(false)
  }, [])

  return (
    <button
      className={`
        ${styles.button}
        ${styles[size]}
        ${position === 'fixed' ? styles.fixed : ''}
        ${isPressed ? styles.pressed : ''}
        ${isPlaying ? styles.active : ''}
        ${recentlyStopped ? styles.stopped : ''}
      `}
      onClick={handleStop}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      disabled={!isPlaying && !recentlyStopped}
      title="Emergency Stop (Escape)"
      aria-label="Emergency Stop"
    >
      <svg viewBox="0 0 24 24" className={styles.icon}>
        <rect x="6" y="6" width="12" height="12" rx="1" />
      </svg>
      <span className={styles.label}>STOP</span>
      {showHint && size !== 'small' && (
        <span className={styles.hint}>ESC</span>
      )}
    </button>
  )
}

/**
 * Fixed position emergency stop for always-visible access
 */
export function FixedEmergencyStop({
  onStop,
}: {
  onStop?: () => void
}) {
  return (
    <EmergencyStop
      size="medium"
      showHint={true}
      position="fixed"
      onStop={onStop}
    />
  )
}

/**
 * Compact inline stop button
 */
export function CompactStopButton({
  onStop,
}: {
  onStop?: () => void
}) {
  return (
    <EmergencyStop
      size="small"
      showHint={false}
      position="inline"
      onStop={onStop}
    />
  )
}
