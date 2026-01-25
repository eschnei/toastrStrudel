/**
 * BeatIndicator Component
 *
 * Visual indication of current beat in the bar.
 * Shows 4 dots/segments with one lighting up per beat,
 * synced to the TimingManager's internal clock.
 *
 * @references Phase 6 Deliverables
 */

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { getTimingManager, type TimingState } from '@/engine'
import styles from './BeatIndicator.module.css'

export interface BeatIndicatorProps {
  /** Number of beats to display (default: 4 for 4/4 time) */
  beatsPerBar?: number
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Show beat number text */
  showNumbers?: boolean
  /** Visual style */
  style?: 'dots' | 'segments' | 'bars'
  /** Accent color */
  accentColor?: string
  /** Pulse animation intensity */
  pulseIntensity?: number
}

/**
 * BeatIndicator - shows current beat in bar
 */
export function BeatIndicator({
  beatsPerBar = 4,
  size = 'medium',
  showNumbers = false,
  style = 'dots',
  accentColor = 'var(--color-accent)',
  pulseIntensity = 1,
}: BeatIndicatorProps) {
  const isPlaying = useStore(state => state.isPlaying)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Subscribe to timing changes
  useEffect(() => {
    const timingManager = getTimingManager()

    const handleTimingChange = (state: TimingState) => {
      if (state.currentBeat !== currentBeat) {
        // Trigger pulse animation
        setIsTransitioning(true)
        setCurrentBeat(state.currentBeat)

        // Reset transition state
        setTimeout(() => {
          setIsTransitioning(false)
        }, 100)
      }
    }

    // Subscribe to timing updates
    const unsubscribe = timingManager.subscribe(handleTimingChange)

    // Start timing manager if playing
    if (isPlaying) {
      timingManager.start()
    } else {
      timingManager.stop()
    }

    return () => {
      unsubscribe()
    }
  }, [isPlaying, currentBeat])

  // Sync timing manager with playback state
  useEffect(() => {
    const timingManager = getTimingManager()

    if (isPlaying) {
      timingManager.start()
    } else {
      timingManager.stop()
      setCurrentBeat(0)
    }
  }, [isPlaying])

  /**
   * Render beat indicator dots
   */
  const renderDots = useCallback(() => {
    const dots = []

    for (let i = 0; i < beatsPerBar; i++) {
      const isActive = isPlaying && i === currentBeat
      const isFirst = i === 0

      dots.push(
        <div
          key={i}
          className={`
            ${styles.dot}
            ${isActive ? styles.active : ''}
            ${isFirst && isActive ? styles.downbeat : ''}
            ${isTransitioning && isActive ? styles.pulse : ''}
          `}
          style={{
            '--accent-color': accentColor,
            '--pulse-intensity': pulseIntensity,
          } as React.CSSProperties}
        >
          {showNumbers && <span className={styles.beatNumber}>{i + 1}</span>}
        </div>
      )
    }

    return dots
  }, [beatsPerBar, currentBeat, isPlaying, isTransitioning, showNumbers, accentColor, pulseIntensity])

  /**
   * Render beat indicator segments
   */
  const renderSegments = useCallback(() => {
    const segments = []

    for (let i = 0; i < beatsPerBar; i++) {
      const isActive = isPlaying && i === currentBeat
      const isFirst = i === 0

      segments.push(
        <div
          key={i}
          className={`
            ${styles.segment}
            ${isActive ? styles.active : ''}
            ${isFirst && isActive ? styles.downbeat : ''}
            ${isTransitioning && isActive ? styles.pulse : ''}
          `}
          style={{
            '--accent-color': accentColor,
            '--pulse-intensity': pulseIntensity,
          } as React.CSSProperties}
        />
      )
    }

    return segments
  }, [beatsPerBar, currentBeat, isPlaying, isTransitioning, accentColor, pulseIntensity])

  /**
   * Render beat indicator bars
   */
  const renderBars = useCallback(() => {
    const bars = []

    for (let i = 0; i < beatsPerBar; i++) {
      const isActive = isPlaying && i === currentBeat
      const isFirst = i === 0
      // Varying heights for visual interest
      const height = isFirst ? 1.0 : (i % 2 === 0 ? 0.7 : 0.5)

      bars.push(
        <div
          key={i}
          className={`
            ${styles.bar}
            ${isActive ? styles.active : ''}
            ${isFirst && isActive ? styles.downbeat : ''}
            ${isTransitioning && isActive ? styles.pulse : ''}
          `}
          style={{
            '--accent-color': accentColor,
            '--pulse-intensity': pulseIntensity,
            '--bar-height': height,
          } as React.CSSProperties}
        />
      )
    }

    return bars
  }, [beatsPerBar, currentBeat, isPlaying, isTransitioning, accentColor, pulseIntensity])

  /**
   * Render based on style
   */
  const renderIndicator = () => {
    switch (style) {
      case 'segments':
        return renderSegments()
      case 'bars':
        return renderBars()
      case 'dots':
      default:
        return renderDots()
    }
  }

  return (
    <div
      className={`${styles.container} ${styles[size]} ${styles[style]}`}
      title={isPlaying ? `Beat ${currentBeat + 1} of ${beatsPerBar}` : 'Stopped'}
    >
      {renderIndicator()}
    </div>
  )
}

/**
 * Compact beat indicator for inline use
 */
export function CompactBeatIndicator() {
  return <BeatIndicator size="small" style="dots" beatsPerBar={4} />
}
