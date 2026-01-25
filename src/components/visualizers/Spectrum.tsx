/**
 * Spectrum Visualizer Component
 *
 * Frequency spectrum display with bars or smooth curve.
 * Performs FFT analysis and shows bass, mid, and high frequency regions.
 *
 * @references UI-002, Section 7.6 Visualizer Options
 */

import { useEffect, useRef, useCallback } from 'react'
import styles from './Spectrum.module.css'

export interface SpectrumProps {
  /** Web Audio AnalyserNode to read frequency data from */
  analyserNode: AnalyserNode | null
  /** Whether the visualizer is active (playing) */
  isActive?: boolean
  /** Display mode: bars or curve */
  mode?: 'bars' | 'curve'
  /** Number of bars to display */
  barCount?: number
  /** Gap between bars (as fraction of bar width) */
  barGap?: number
  /** Smoothing time constant (0-1) */
  smoothing?: number
  /** Whether to show frequency region indicators */
  showRegions?: boolean
  /** Colors for bass, mid, high frequency regions */
  regionColors?: {
    bass: string
    mid: string
    high: string
  }
  /** Glow intensity (0-1) */
  glowIntensity?: number
}

/** Frequency region boundaries (approximate) */
const FREQUENCY_REGIONS = {
  bass: { start: 0, end: 0.15 },     // ~20-250Hz
  mid: { start: 0.15, end: 0.5 },    // ~250-2kHz
  high: { start: 0.5, end: 1.0 },    // ~2kHz-20kHz
}

/**
 * Get color for a bar based on its position in the frequency spectrum
 */
function getBarColor(
  index: number,
  total: number,
  regionColors: SpectrumProps['regionColors'],
  defaultColor: string
): string {
  if (!regionColors) return defaultColor

  const position = index / total

  if (position < FREQUENCY_REGIONS.bass.end) {
    return regionColors.bass
  } else if (position < FREQUENCY_REGIONS.mid.end) {
    return regionColors.mid
  } else {
    return regionColors.high
  }
}

/**
 * Spectrum visualizer - frequency bars or curve display
 */
export function Spectrum({
  analyserNode,
  isActive = false,
  mode = 'bars',
  barCount = 64,
  barGap = 0.3,
  smoothing = 0.8,
  showRegions = false,
  regionColors = {
    bass: '#ef4444',    // Red
    mid: '#f59e0b',     // Orange/Yellow
    high: '#6366f1',    // Indigo
  },
  glowIntensity = 0.4,
}: SpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const smoothedDataRef = useRef<Float32Array | null>(null)

  /**
   * Draw the spectrum on the canvas
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Ensure canvas is sized correctly
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }

    const width = rect.width
    const height = rect.height

    // Reset transform and apply DPI scale
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Get frequency data from analyser
    if (analyserNode && dataArrayRef.current && isActive) {
      analyserNode.getByteFrequencyData(dataArrayRef.current)
      const bufferLength = dataArrayRef.current.length

      // Apply smoothing
      if (!smoothedDataRef.current) {
        smoothedDataRef.current = new Float32Array(bufferLength)
      }

      for (let i = 0; i < bufferLength; i++) {
        smoothedDataRef.current[i] =
          smoothedDataRef.current[i] * smoothing +
          dataArrayRef.current[i] * (1 - smoothing)
      }

      // Calculate bar dimensions
      const actualBarCount = Math.min(barCount, bufferLength)
      const binSize = Math.floor(bufferLength / actualBarCount)
      const barWidth = width / actualBarCount
      const gap = barWidth * barGap

      if (mode === 'bars') {
        // Draw frequency bars
        for (let i = 0; i < actualBarCount; i++) {
          // Average the bin values
          let sum = 0
          for (let j = 0; j < binSize; j++) {
            sum += smoothedDataRef.current[i * binSize + j]
          }
          const average = sum / binSize

          // Calculate bar height (normalized to 0-1, then scaled)
          const normalizedHeight = average / 255
          const barHeight = normalizedHeight * height * 0.9

          // Get color for this bar
          const barColor = getBarColor(i, actualBarCount, regionColors, '#6366f1')

          // Resolve CSS variable if needed
          const computedColor = barColor.startsWith('var(')
            ? getComputedStyle(document.documentElement)
                .getPropertyValue(barColor.slice(4, -1))
                .trim() || '#6366f1'
            : barColor

          // Set up glow effect
          if (glowIntensity > 0 && normalizedHeight > 0.3) {
            ctx.shadowBlur = 8 * glowIntensity * normalizedHeight
            ctx.shadowColor = computedColor
          }

          // Draw bar with rounded top
          const x = i * barWidth + gap / 2
          const y = height - barHeight
          const w = barWidth - gap
          const h = barHeight

          ctx.fillStyle = computedColor

          // Draw rounded rectangle
          const radius = Math.min(w / 2, 4)
          ctx.beginPath()
          ctx.moveTo(x + radius, y)
          ctx.lineTo(x + w - radius, y)
          ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
          ctx.lineTo(x + w, y + h)
          ctx.lineTo(x, y + h)
          ctx.lineTo(x, y + radius)
          ctx.quadraticCurveTo(x, y, x + radius, y)
          ctx.closePath()
          ctx.fill()

          // Reset shadow
          ctx.shadowBlur = 0
        }
      } else {
        // Draw smooth curve
        ctx.beginPath()
        ctx.strokeStyle = regionColors.mid
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Set up glow
        if (glowIntensity > 0) {
          ctx.shadowBlur = 10 * glowIntensity
          ctx.shadowColor = regionColors.mid
        }

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, height, 0, 0)
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)')
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.4)')

        // Start from bottom left
        ctx.moveTo(0, height)

        // Draw curve through frequency points
        for (let i = 0; i < actualBarCount; i++) {
          let sum = 0
          for (let j = 0; j < binSize; j++) {
            sum += smoothedDataRef.current[i * binSize + j]
          }
          const average = sum / binSize
          const normalizedHeight = average / 255
          const y = height - normalizedHeight * height * 0.9
          const x = (i / actualBarCount) * width

          if (i === 0) {
            ctx.lineTo(x, y)
          } else {
            // Use quadratic curve for smoothness
            const prevX = ((i - 1) / actualBarCount) * width
            const cpX = (prevX + x) / 2
            ctx.quadraticCurveTo(prevX, ctx.canvas.height, cpX, y)
          }
        }

        // Close path
        ctx.lineTo(width, height)
        ctx.closePath()

        // Fill with gradient
        ctx.fillStyle = gradient
        ctx.fill()

        // Stroke the curve
        ctx.stroke()

        // Reset shadow
        ctx.shadowBlur = 0
      }

      // Draw region indicators if enabled
      if (showRegions) {
        ctx.font = '10px var(--font-sans)'
        ctx.textAlign = 'center'

        const regions = [
          { name: 'BASS', pos: FREQUENCY_REGIONS.bass.end / 2, color: regionColors.bass },
          { name: 'MID', pos: (FREQUENCY_REGIONS.mid.start + FREQUENCY_REGIONS.mid.end) / 2, color: regionColors.mid },
          { name: 'HIGH', pos: (FREQUENCY_REGIONS.high.start + 1) / 2, color: regionColors.high },
        ]

        regions.forEach(region => {
          ctx.fillStyle = region.color
          ctx.globalAlpha = 0.5
          ctx.fillText(region.name, region.pos * width, height - 5)
          ctx.globalAlpha = 1
        })
      }
    } else {
      // Draw idle state - subtle gradient bars
      const time = Date.now() / 1000
      const idleBarCount = 32

      for (let i = 0; i < idleBarCount; i++) {
        const phase = (i / idleBarCount) * Math.PI * 2
        const wave = Math.sin(time * 0.5 + phase) * 0.5 + 0.5
        const barHeight = wave * height * 0.1

        const barWidth = width / idleBarCount
        const gap = barWidth * 0.3
        const x = i * barWidth + gap / 2
        const w = barWidth - gap

        ctx.fillStyle = `rgba(99, 102, 241, ${0.1 + wave * 0.1})`
        ctx.fillRect(x, height - barHeight, w, barHeight)
      }
    }

    // Continue animation loop
    animationRef.current = requestAnimationFrame(draw)
  }, [analyserNode, isActive, mode, barCount, barGap, smoothing, showRegions, regionColors, glowIntensity])

  /**
   * Initialize analyser data array when analyserNode changes
   */
  useEffect(() => {
    if (analyserNode) {
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount)
      // Configure analyser for spectrum
      analyserNode.smoothingTimeConstant = smoothing
    }
  }, [analyserNode, smoothing])

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
