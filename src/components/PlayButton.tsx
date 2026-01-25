/**
 * PlayButton Component
 *
 * Play/stop toggle button with visual feedback.
 * Handles audio context initialization on first click.
 * Keyboard shortcut: spacebar
 */

import { useCallback, useEffect } from 'react'
import { useStrudel } from '@/hooks'
import { useStore } from '@/store'
import styles from './PlayButton.module.css'

interface PlayButtonProps {
  size?: 'small' | 'medium' | 'large'
}

export function PlayButton({ size = 'medium' }: PlayButtonProps) {
  const { isPlaying, toggle, isReady } = useStrudel()
  const playbackStatus = useStore(state => state.playbackStatus)

  const handleClick = useCallback(async () => {
    await toggle()
  }, [toggle])

  // Spacebar shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        handleClick()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClick])

  const isLoading = playbackStatus === 'generating'

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${styles.button} ${styles[size]} ${isPlaying ? styles.playing : ''}`}
      title={isPlaying ? 'Stop (Space)' : 'Play (Space)'}
      aria-label={isPlaying ? 'Stop' : 'Play'}
    >
      {isLoading ? (
        <span className={styles.loader} />
      ) : isPlaying ? (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={styles.icon}
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={styles.icon}
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}

      {!isReady && !isLoading && (
        <span className={styles.initHint}>click to start</span>
      )}
    </button>
  )
}
