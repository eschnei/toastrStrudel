/**
 * RecordButton Component
 *
 * Hold-to-record button with visual feedback.
 * Shows recording state, duration, and audio level.
 */

import { useCallback, useRef, useEffect } from 'react'
import styles from './VoiceRecorder.module.css'

export interface RecordButtonProps {
  /** Whether currently recording */
  isRecording: boolean
  /** Current recording duration in seconds */
  duration: number
  /** Current audio level (0-1) */
  audioLevel: number
  /** Whether recording is supported */
  isSupported: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Called when recording starts (mouse/touch down) */
  onRecordStart: () => void
  /** Called when recording ends (mouse/touch up) */
  onRecordEnd: () => void
}

/**
 * Format duration as seconds with one decimal
 */
function formatDuration(seconds: number): string {
  return seconds.toFixed(1) + 's'
}

/**
 * RecordButton - hold-to-record button
 */
export function RecordButton({
  isRecording,
  duration,
  audioLevel,
  isSupported,
  disabled = false,
  onRecordStart,
  onRecordEnd,
}: RecordButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isHolding = useRef(false)

  /**
   * Handle mouse/touch down - start recording
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !isSupported) return

      e.preventDefault()
      isHolding.current = true
      onRecordStart()

      // Capture pointer for reliable release detection
      if (buttonRef.current) {
        buttonRef.current.setPointerCapture(e.pointerId)
      }
    },
    [disabled, isSupported, onRecordStart]
  )

  /**
   * Handle mouse/touch up - stop recording
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isHolding.current) return

      e.preventDefault()
      isHolding.current = false
      onRecordEnd()

      if (buttonRef.current) {
        buttonRef.current.releasePointerCapture(e.pointerId)
      }
    },
    [onRecordEnd]
  )

  /**
   * Handle pointer cancel (e.g., touch interrupted)
   */
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!isHolding.current) return

      isHolding.current = false
      onRecordEnd()

      if (buttonRef.current) {
        buttonRef.current.releasePointerCapture(e.pointerId)
      }
    },
    [onRecordEnd]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isHolding.current = false
    }
  }, [])

  // Not supported
  if (!isSupported) {
    return (
      <div className={styles.recordButtonContainer}>
        <button
          className={`${styles.recordButton} ${styles.unsupported}`}
          disabled
          title="Voice recording not supported in this browser"
        >
          <MicIcon crossed />
        </button>
        <span className={styles.recordLabel}>Not supported</span>
      </div>
    )
  }

  return (
    <div className={styles.recordButtonContainer}>
      <button
        ref={buttonRef}
        className={`
          ${styles.recordButton}
          ${isRecording ? styles.recording : ''}
          ${disabled ? styles.disabled : ''}
        `}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerUp}
        title={isRecording ? 'Release to stop' : 'Hold to record'}
        style={{
          '--audio-level': audioLevel,
        } as React.CSSProperties}
      >
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <span className={styles.pulseRing} style={{ animationDelay: '0ms' }} />
            <span className={styles.pulseRing} style={{ animationDelay: '400ms' }} />
            <span className={styles.pulseRing} style={{ animationDelay: '800ms' }} />
          </>
        )}

        {/* Audio level indicator */}
        {isRecording && (
          <span
            className={styles.levelIndicator}
            style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
          />
        )}

        <MicIcon />
      </button>

      <span className={`${styles.recordLabel} ${isRecording ? styles.active : ''}`}>
        {isRecording ? formatDuration(duration) : 'hold to record'}
      </span>
    </div>
  )
}

/**
 * Microphone icon component
 */
function MicIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.micIcon}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
      {crossed && (
        <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" />
      )}
    </svg>
  )
}
