/**
 * StatusBar Component
 *
 * Displays playback state, energy level, and BPM in a minimal, non-intrusive design.
 * Clickable BPM opens the BPM slider control.
 * Energy dots reflect actual pattern analysis.
 *
 * Optimized with React.memo and useMemo for performance.
 *
 * @references FR-014, FR-019, PERF-002
 */

import { useState, memo, useMemo, useCallback } from 'react'
import { useStore } from '@/store'
import { useEnergyDisplay, useEnergyLevel } from '@/hooks/useEnergy'
import { BPMSlider } from './BPMSlider'
import { QueuedIndicator } from './QueuedChanges'
import styles from './StatusBar.module.css'

/**
 * Memoized energy dots component - prevents re-render when energy unchanged
 */
const EnergyDots = memo(function EnergyDots({
  energyLevel,
  energyDots,
  energyColor,
  trend,
}: {
  energyLevel: number
  energyDots: number
  energyColor: string
  trend: 'rising' | 'falling' | 'stable'
}) {
  const trendIndicator = trend === 'rising' ? '^' : trend === 'falling' ? 'v' : ''

  return (
    <div
      className={styles.energyDots}
      title={`Energy: ${energyLevel}/100`}
      style={{ '--energy-color': energyColor } as React.CSSProperties}
    >
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`${styles.energyDot} ${i <= energyDots ? styles.active : ''}`}
        />
      ))}
      {trend !== 'stable' && (
        <span className={styles.trendIndicator}>{trendIndicator}</span>
      )}
    </div>
  )
})

/**
 * Memoized status indicator component
 */
const StatusIndicator = memo(function StatusIndicator({
  playbackStatus,
  isPlaying,
}: {
  playbackStatus: 'stopped' | 'playing' | 'generating'
  isPlaying: boolean
}) {
  const statusText = useMemo(() => {
    switch (playbackStatus) {
      case 'generating':
        return 'THINKING'
      case 'playing':
        return 'PLAYING'
      default:
        return 'STOPPED'
    }
  }, [playbackStatus])

  const statusColor = useMemo(() => {
    switch (playbackStatus) {
      case 'generating':
        return 'var(--color-warning)'
      case 'playing':
        return 'var(--color-success)'
      default:
        return 'var(--color-text-muted)'
    }
  }, [playbackStatus])

  return (
    <div
      className={styles.statusIndicator}
      style={{ '--status-color': statusColor } as React.CSSProperties}
    >
      <span
        className={`${styles.statusDot} ${isPlaying ? styles.pulse : ''}`}
      />
      <span className={styles.statusText}>{statusText}</span>
    </div>
  )
})

function StatusBarBase() {
  const [showBPMSlider, setShowBPMSlider] = useState(false)
  const isPlaying = useStore(state => state.isPlaying)
  const bpm = useStore(state => state.bpm)
  const playbackStatus = useStore(state => state.playbackStatus)

  // Energy tracking
  const { dots: energyDots, color: energyColor, trend } = useEnergyDisplay()
  const energyLevel = useEnergyLevel()

  // Memoize toggle handler
  const toggleBPMSlider = useCallback(() => {
    setShowBPMSlider(prev => !prev)
  }, [])

  const closeBPMSlider = useCallback(() => {
    setShowBPMSlider(false)
  }, [])

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.appName}>Toastr Strudel</span>
        <StatusIndicator playbackStatus={playbackStatus} isPlaying={isPlaying} />

        {/* Queued changes indicator */}
        <QueuedIndicator />
      </div>

      <div className={styles.center}>
        {/* Energy dots */}
        <EnergyDots
          energyLevel={energyLevel}
          energyDots={energyDots}
          energyColor={energyColor}
          trend={trend}
        />
      </div>

      <div className={styles.right}>
        <button
          className={styles.bpmButton}
          onClick={toggleBPMSlider}
          title="Adjust tempo"
        >
          <span className={styles.bpmValue}>{bpm}</span>
          <span className={styles.bpmLabel}>BPM</span>
        </button>

        {showBPMSlider && (
          <div className={styles.bpmSliderContainer}>
            <BPMSlider onClose={closeBPMSlider} />
          </div>
        )}
      </div>
    </div>
  )
}

export const StatusBar = memo(StatusBarBase)
