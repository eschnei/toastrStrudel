/**
 * PromptInput Component
 *
 * Main prompt input field for describing desired music vibes.
 * Context-aware placeholder text based on playback state.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from '@/store'
import styles from './PromptInput.module.css'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  disabled?: boolean
}

export function PromptInput({ onSubmit, disabled = false }: PromptInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const playbackStatus = useStore(state => state.playbackStatus)
  const isPlaying = useStore(state => state.isPlaying)

  // Get context-aware placeholder
  const getPlaceholder = () => {
    if (playbackStatus === 'generating') {
      return '(thinking...)'
    }
    if (isPlaying) {
      return "What's next?"
    }
    return 'Describe the vibe...'
  }

  // Handle submit
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmed = value.trim()
      if (trimmed && !disabled) {
        onSubmit(trimmed)
        setValue('')
      }
    },
    [value, disabled, onSubmit]
  )

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  // Focus input on mount
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [disabled])

  // Auto-focus when done generating
  useEffect(() => {
    if (playbackStatus !== 'generating' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [playbackStatus])

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={disabled || playbackStatus === 'generating'}
          className={`${styles.input} ${playbackStatus === 'generating' ? styles.generating : ''}`}
          autoComplete="off"
          spellCheck={false}
        />

        {playbackStatus === 'generating' && (
          <div className={styles.loadingIndicator}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}

        {value.trim() && playbackStatus !== 'generating' && (
          <button type="submit" className={styles.submitButton} disabled={disabled}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </form>
  )
}
