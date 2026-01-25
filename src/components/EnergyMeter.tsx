/**
 * EnergyMeter Component
 *
 * Prominent energy level display showing 0-100 energy.
 * Supports bar, arc, and radial display styles with smooth updates
 * and color changes based on energy level.
 *
 * @references Phase 6 Deliverables, FR-019
 */

import { useState, useEffect } from 'react'
import { useEnergyDisplay, useEnergyLevel } from '@/hooks/useEnergy'
import { getEnergyColor, getEnergyCategory } from '@/engine/EnergyManager'
import styles from './EnergyMeter.module.css'

export interface EnergyMeterProps {
  /** Visual style */
  style?: 'bar' | 'arc' | 'radial'
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Show numeric value */
  showValue?: boolean
  /** Show label */
  showLabel?: boolean
  /** Label text */
  label?: string
  /** Animation duration (ms) */
  animationDuration?: number
  /** Show trend indicator */
  showTrend?: boolean
}

/**
 * Get gradient colors based on energy level
 */
function getGradientColors(level: number): { start: string; end: string } {
  if (level >= 80) {
    return { start: '#ef4444', end: '#dc2626' } // Red
  } else if (level >= 60) {
    return { start: '#f59e0b', end: '#d97706' } // Orange
  } else if (level >= 40) {
    return { start: '#22c55e', end: '#16a34a' } // Green
  } else if (level >= 20) {
    return { start: '#6366f1', end: '#4f46e5' } // Indigo
  }
  return { start: '#64748b', end: '#475569' } // Gray
}

/**
 * EnergyMeter - prominent energy display
 */
export function EnergyMeter({
  style = 'bar',
  size = 'medium',
  showValue = true,
  showLabel = false,
  label = 'ENERGY',
  animationDuration = 300,
  showTrend = true,
}: EnergyMeterProps) {
  const energyLevel = useEnergyLevel()
  const { trend } = useEnergyDisplay()
  const [displayLevel, setDisplayLevel] = useState(energyLevel)

  // Smooth energy level transitions
  useEffect(() => {
    const startLevel = displayLevel
    const targetLevel = energyLevel
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / animationDuration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      setDisplayLevel(Math.round(startLevel + (targetLevel - startLevel) * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [energyLevel, animationDuration])

  const gradientColors = getGradientColors(displayLevel)
  const category = getEnergyCategory(displayLevel)

  /**
   * Render bar style meter
   */
  const renderBar = () => {
    return (
      <div className={`${styles.barContainer} ${styles[size]}`}>
        <div
          className={styles.barTrack}
          style={{
            '--gradient-start': gradientColors.start,
            '--gradient-end': gradientColors.end,
          } as React.CSSProperties}
        >
          <div
            className={styles.barFill}
            style={{
              width: `${displayLevel}%`,
              background: `linear-gradient(90deg, ${gradientColors.start}, ${gradientColors.end})`,
            }}
          />
        </div>
        {showValue && (
          <div className={styles.barValue}>
            {displayLevel}
            {showTrend && trend !== 'stable' && (
              <span className={styles.trendIndicator}>
                {trend === 'rising' ? '^' : 'v'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  /**
   * Render arc style meter
   */
  const renderArc = () => {
    const radius = size === 'small' ? 30 : size === 'large' ? 60 : 45
    const strokeWidth = size === 'small' ? 4 : size === 'large' ? 8 : 6
    const circumference = Math.PI * radius
    const offset = circumference * (1 - displayLevel / 100)

    return (
      <div className={`${styles.arcContainer} ${styles[size]}`}>
        <svg
          viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius + strokeWidth}`}
          className={styles.arcSvg}
        >
          {/* Background track */}
          <path
            d={`M ${strokeWidth / 2} ${radius + strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius + strokeWidth / 2}`}
            fill="none"
            stroke="var(--color-surface-active)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d={`M ${strokeWidth / 2} ${radius + strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius + strokeWidth / 2}`}
            fill="none"
            stroke={`url(#arcGradient-${size})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={styles.arcPath}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`arcGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
          </defs>
        </svg>
        {showValue && (
          <div className={styles.arcValue}>
            {displayLevel}
            {showTrend && trend !== 'stable' && (
              <span className={styles.trendIndicator}>
                {trend === 'rising' ? '^' : 'v'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  /**
   * Render radial style meter
   */
  const renderRadial = () => {
    const radius = size === 'small' ? 24 : size === 'large' ? 48 : 36
    const strokeWidth = size === 'small' ? 4 : size === 'large' ? 8 : 6
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - displayLevel / 100)

    return (
      <div className={`${styles.radialContainer} ${styles[size]}`}>
        <svg viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`} className={styles.radialSvg}>
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="var(--color-surface-active)"
            strokeWidth={strokeWidth}
          />
          {/* Filled circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={`url(#radialGradient-${size})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={styles.radialPath}
            transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`radialGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
          </defs>
        </svg>
        {showValue && (
          <div className={styles.radialValue}>
            {displayLevel}
            {showTrend && trend !== 'stable' && (
              <span className={styles.trendIndicator}>
                {trend === 'rising' ? '^' : 'v'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  /**
   * Render based on style
   */
  const renderMeter = () => {
    switch (style) {
      case 'arc':
        return renderArc()
      case 'radial':
        return renderRadial()
      case 'bar':
      default:
        return renderBar()
    }
  }

  return (
    <div
      className={`${styles.container} ${styles[size]} ${styles[category]}`}
      title={`Energy: ${energyLevel}% (${category.replace('_', ' ')})`}
    >
      {showLabel && <div className={styles.label}>{label}</div>}
      {renderMeter()}
    </div>
  )
}

/**
 * Compact energy meter for inline use
 */
export function CompactEnergyMeter() {
  return (
    <EnergyMeter
      style="bar"
      size="small"
      showValue={true}
      showLabel={false}
      showTrend={false}
    />
  )
}
