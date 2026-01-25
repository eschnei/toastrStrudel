/**
 * ErrorDisplay Component
 *
 * Shows error messages in a non-intrusive way.
 * Auto-dismisses after a timeout.
 */

import { useEffect, useRef, useCallback } from 'react'
import styles from './ErrorDisplay.module.css'

interface ErrorDisplayProps {
  message: string | null
  onDismiss?: () => void
  autoDismissMs?: number
}

export function ErrorDisplay({
  message,
  onDismiss,
  autoDismissMs = 5000,
}: ErrorDisplayProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = useCallback(() => {
    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    if (message && autoDismissMs > 0) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        handleDismiss()
      }, autoDismissMs)

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }
  }, [message, autoDismissMs, handleDismiss])

  if (!message) return null

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <span className={styles.icon}>!</span>
        <span className={styles.message}>{message}</span>
        <button className={styles.dismiss} onClick={handleDismiss}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
