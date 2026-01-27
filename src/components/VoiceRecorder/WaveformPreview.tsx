/**
 * WaveformPreview Component
 *
 * Canvas-based waveform visualization for recorded audio.
 * Shows playhead during playback and allows seeking.
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import styles from './VoiceRecorder.module.css'

export interface WaveformPreviewProps {
  /** Waveform data points (0-1 normalized) */
  waveformData: number[]
  /** Duration in seconds */
  duration: number
  /** Whether audio is currently playing */
  isPlaying?: boolean
  /** Current playback position (0-1) */
  playbackPosition?: number
  /** Waveform color */
  color?: string
  /** Whether to show play button */
  showPlayButton?: boolean
  /** Called when play is clicked */
  onPlay?: () => void
  /** Called when seeking */
  onSeek?: (position: number) => void
}

/**
 * WaveformPreview - displays audio waveform
 */
export function WaveformPreview({
  waveformData,
  duration,
  isPlaying = false,
  playbackPosition = 0,
  color = 'var(--color-accent)',
  showPlayButton = true,
  onPlay,
  onSeek,
}: WaveformPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverPosition, setHoverPosition] = useState(0)

  /**
   * Draw waveform on canvas
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Size canvas
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }

    const width = rect.width
    const height = rect.height

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // Resolve CSS variable color
    const computedColor = color.startsWith('var(')
      ? getComputedStyle(document.documentElement).getPropertyValue(
          color.slice(4, -1)
        ).trim() || '#6366f1'
      : color

    // Draw waveform bars
    const barWidth = width / waveformData.length
    const centerY = height / 2
    const maxBarHeight = height * 0.8

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth
      const barHeight = waveformData[i] * maxBarHeight
      const normalizedPosition = i / waveformData.length

      // Color based on playback position
      if (normalizedPosition < playbackPosition) {
        ctx.fillStyle = computedColor
      } else {
        ctx.fillStyle = `${computedColor}66` // 40% opacity
      }

      // Draw mirrored bar
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight)
    }

    // Draw playhead if playing
    if (isPlaying || playbackPosition > 0) {
      const playheadX = playbackPosition * width
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }

    // Draw hover indicator
    if (isHovering && onSeek) {
      const hoverX = hoverPosition * width
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(hoverX, 0)
      ctx.lineTo(hoverX, height)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [waveformData, playbackPosition, isPlaying, color, isHovering, hoverPosition, onSeek])

  /**
   * Handle mouse move for seek preview
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !onSeek) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const position = Math.max(0, Math.min(1, x / rect.width))
      setHoverPosition(position)
    },
    [onSeek]
  )

  /**
   * Handle click for seeking
   */
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !onSeek) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const position = Math.max(0, Math.min(1, x / rect.width))
      onSeek(position)
    },
    [onSeek]
  )

  // Redraw on data change
  useEffect(() => {
    draw()
  }, [draw])

  // Animation loop for smooth playhead
  useEffect(() => {
    if (!isPlaying) return

    let animationId: number

    const animate = () => {
      draw()
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [isPlaying, draw])

  // Format duration
  const formatDuration = (seconds: number): string => {
    return seconds.toFixed(1) + 's'
  }

  return (
    <div
      ref={containerRef}
      className={styles.waveformContainer}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Play button */}
      {showPlayButton && onPlay && (
        <button
          className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? <StopIcon /> : <PlayIcon />}
        </button>
      )}

      {/* Waveform canvas */}
      <canvas ref={canvasRef} className={styles.waveformCanvas} />

      {/* Duration label */}
      <span className={styles.durationLabel}>{formatDuration(duration)}</span>
    </div>
  )
}

/**
 * Play icon
 */
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon}>
      <polygon points="5,3 19,12 5,21" fill="currentColor" />
    </svg>
  )
}

/**
 * Stop icon
 */
function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon}>
      <rect x="6" y="6" width="12" height="12" fill="currentColor" />
    </svg>
  )
}
