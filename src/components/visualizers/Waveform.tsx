/**
 * Waveform Visualizer Component
 *
 * Oscilloscope-style waveform display that connects to Web Audio AnalyserNode.
 * Renders audio waveform data in real-time at 60fps.
 *
 * @references UI-002, Section 7.6 Visualizer Options
 */

import { useEffect, useRef, useCallback } from 'react'
import styles from './Waveform.module.css'

export interface WaveformProps {
  /** Web Audio AnalyserNode to read audio data from */
  analyserNode: AnalyserNode | null
  /** Whether the visualizer is active (playing) */
  isActive?: boolean
  /** Color of the waveform line */
  color?: string
  /** Line width */
  lineWidth?: number
  /** Whether to show the center line */
  showCenterLine?: boolean
  /** Glow intensity (0-1) */
  glowIntensity?: number
}

/**
 * Waveform visualizer - oscilloscope-style display
 */
export function Waveform({
  analyserNode,
  isActive = false,
  color = 'var(--color-accent)',
  lineWidth = 2,
  showCenterLine = true,
  glowIntensity = 0.5,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  /**
   * Draw the waveform on the canvas
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw center line if enabled
    if (showCenterLine) {
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()
    }

    // Get waveform data from analyser
    if (analyserNode && dataArrayRef.current && isActive) {
      analyserNode.getByteTimeDomainData(dataArrayRef.current)
      const bufferLength = dataArrayRef.current.length

      // Resolve CSS variable color
      const computedColor = color.startsWith('var(')
        ? getComputedStyle(document.documentElement).getPropertyValue(
            color.slice(4, -1)
          ).trim() || '#6366f1'
        : color

      // Set up glow effect
      if (glowIntensity > 0) {
        ctx.shadowBlur = 10 * glowIntensity
        ctx.shadowColor = computedColor
      }

      // Draw waveform
      ctx.beginPath()
      ctx.strokeStyle = computedColor
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const sliceWidth = width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArrayRef.current[i] / 128.0
        const y = (v * height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.stroke()

      // Reset shadow
      ctx.shadowBlur = 0
    } else {
      // Draw idle state - flat line with subtle pulse
      const time = Date.now() / 1000
      const pulse = Math.sin(time * 2) * 0.02 + 0.5

      ctx.beginPath()
      ctx.strokeStyle = `rgba(99, 102, 241, ${pulse})`
      ctx.lineWidth = 1
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()
    }

    // Continue animation loop
    animationRef.current = requestAnimationFrame(draw)
  }, [analyserNode, isActive, color, lineWidth, showCenterLine, glowIntensity])

  /**
   * Initialize canvas and analyser data array
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set up high-DPI canvas
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Set up analyser data array
    if (analyserNode) {
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount)
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [analyserNode])

  /**
   * Start/stop animation loop
   */
  useEffect(() => {
    // Start animation
    animationRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [draw])

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
