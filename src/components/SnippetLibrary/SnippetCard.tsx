/**
 * SnippetCard Component
 *
 * Individual voice snippet card with playback, effect display, and controls.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { CompactEffectSelector } from '../VoiceRecorder/EffectSelector'
import { WaveformPreview } from '../VoiceRecorder/WaveformPreview'
import type { VoiceSnippet, VoiceEffectType } from '@/voice/types'
import styles from './SnippetLibrary.module.css'

export interface SnippetCardProps {
  /** The voice snippet to display */
  snippet: VoiceSnippet
  /** Whether the card is selected */
  isSelected?: boolean
  /** Whether to show compact view */
  compact?: boolean
  /** Called when the snippet is played */
  onPlay?: (snippet: VoiceSnippet) => void
  /** Called when the effect is changed */
  onEffectChange?: (snippetId: string, effect: VoiceEffectType) => void
  /** Called when the snippet is deleted */
  onDelete?: (snippetId: string) => void
  /** Called when the snippet is clicked */
  onClick?: (snippet: VoiceSnippet) => void
}

/**
 * Format timestamp to relative time
 */
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

/**
 * SnippetCard - displays a voice snippet
 */
export function SnippetCard({
  snippet,
  isSelected = false,
  compact = false,
  onPlay,
  onEffectChange,
  onDelete,
  onClick,
}: SnippetCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Handle play/stop
   */
  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }, [isPlaying, snippet])

  /**
   * Start playback
   */
  const startPlayback = useCallback(() => {
    if (!snippet.previewUrl) return

    const audio = new Audio(snippet.previewUrl)
    audioRef.current = audio

    audio.onended = () => {
      stopPlayback()
    }

    audio.play()
    setIsPlaying(true)
    setPlaybackPosition(0)

    if (onPlay) {
      onPlay(snippet)
    }

    playbackIntervalRef.current = setInterval(() => {
      if (audio.duration) {
        setPlaybackPosition(audio.currentTime / audio.duration)
      }
    }, 50)
  }, [snippet, onPlay])

  /**
   * Stop playback
   */
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
    setIsPlaying(false)
    setPlaybackPosition(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [stopPlayback])

  /**
   * Handle effect change
   */
  const handleEffectChange = useCallback(
    (effect: VoiceEffectType) => {
      if (onEffectChange) {
        onEffectChange(snippet.id, effect)
      }
    },
    [snippet.id, onEffectChange]
  )

  /**
   * Handle delete
   */
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onDelete) {
        onDelete(snippet.id)
      }
    },
    [snippet.id, onDelete]
  )

  /**
   * Handle card click
   */
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(snippet)
    }
  }, [snippet, onClick])

  // Compact view
  if (compact) {
    return (
      <div
        className={`${styles.cardCompact} ${isSelected ? styles.selected : ''}`}
        onClick={handleClick}
      >
        <button
          className={`${styles.playButtonCompact} ${isPlaying ? styles.playing : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            handlePlayToggle()
          }}
        >
          {isPlaying ? '■' : '▶'}
        </button>

        <div className={styles.cardInfoCompact}>
          <span className={styles.sampleName}>
            {snippet.sampleName}:{snippet.sampleIndex}
          </span>
          <span className={styles.effect}>{snippet.effect}</span>
        </div>

        {onDelete && (
          <button className={styles.deleteButtonCompact} onClick={handleDelete}>
            ×
          </button>
        )}
      </div>
    )
  }

  // Full view
  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
    >
      {/* Header with sample name and time */}
      <div className={styles.cardHeader}>
        <span className={styles.sampleName}>
          {snippet.sampleName}:{snippet.sampleIndex}
        </span>
        <span className={styles.timestamp}>{formatTime(snippet.timestamp)}</span>
      </div>

      {/* Waveform */}
      <WaveformPreview
        waveformData={snippet.waveformData}
        duration={snippet.duration}
        isPlaying={isPlaying}
        playbackPosition={playbackPosition}
        onPlay={handlePlayToggle}
      />

      {/* Effect selector */}
      <div className={styles.effectRow}>
        <CompactEffectSelector
          selectedEffect={snippet.effect}
          onSelectEffect={handleEffectChange}
          disabled={!onEffectChange}
        />

        {onDelete && (
          <button className={styles.deleteButton} onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>

      {/* Instruction */}
      {snippet.instruction && (
        <div className={styles.instruction}>
          "{snippet.instruction}"
        </div>
      )}

      {/* Strudel hint */}
      <div className={styles.hint}>
        Use: <code>s("{snippet.sampleName}:{snippet.sampleIndex}")</code>
      </div>
    </div>
  )
}
