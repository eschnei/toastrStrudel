/**
 * SectionIndicator Component
 *
 * Displays current arrangement section (INTRO, BUILD, DROP, BREAKDOWN, OUTRO).
 * Updates based on arrangement state with optional auto-detection from pattern analysis.
 *
 * @references Phase 6 Deliverables
 */

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { useEnergyLevel } from '@/hooks/useEnergy'
import styles from './SectionIndicator.module.css'

/** Available section types */
export type SectionType = 'intro' | 'build' | 'drop' | 'breakdown' | 'outro' | 'none'

export interface SectionIndicatorProps {
  /** Current section (controlled mode) */
  section?: SectionType
  /** Enable auto-detection from energy/pattern analysis */
  autoDetect?: boolean
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Show icon */
  showIcon?: boolean
  /** Animate transitions */
  animate?: boolean
  /** Callback when section changes */
  onSectionChange?: (section: SectionType) => void
}

/** Section display configuration */
const SECTION_CONFIG: Record<SectionType, {
  label: string
  icon: string
  color: string
  bgColor: string
}> = {
  intro: {
    label: 'INTRO',
    icon: 'M3 12h2l3-9 3 18 3-9h2',
    color: 'var(--color-info)',
    bgColor: 'rgba(99, 102, 241, 0.15)',
  },
  build: {
    label: 'BUILD',
    icon: 'M4 12l4-4 4 4 4-4 4 4',
    color: 'var(--color-warning)',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  drop: {
    label: 'DROP',
    icon: 'M12 4v16m-6-4l6 4 6-4',
    color: 'var(--color-error)',
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
  breakdown: {
    label: 'BREAKDOWN',
    icon: 'M4 8h16M4 12h12M4 16h8',
    color: 'var(--color-success)',
    bgColor: 'rgba(34, 197, 94, 0.15)',
  },
  outro: {
    label: 'OUTRO',
    icon: 'M12 4v16M8 8l-4 4 4 4M16 8l4 4-4 4',
    color: 'var(--color-text-muted)',
    bgColor: 'rgba(100, 116, 139, 0.15)',
  },
  none: {
    label: '---',
    icon: '',
    color: 'var(--color-text-muted)',
    bgColor: 'transparent',
  },
}

/**
 * Auto-detect section from energy level and trend
 */
function detectSectionFromEnergy(
  energyLevel: number,
  isPlaying: boolean,
  previousSection: SectionType
): SectionType {
  if (!isPlaying) return 'none'

  // Simple heuristic based on energy level
  if (energyLevel >= 85) {
    return 'drop'
  } else if (energyLevel >= 65) {
    // Could be build or coming down from drop
    if (previousSection === 'drop') {
      return 'drop' // Stay in drop until energy drops more
    }
    return 'build'
  } else if (energyLevel >= 40) {
    // Mid-range - could be intro, build, or breakdown
    if (previousSection === 'drop' || previousSection === 'build') {
      return 'breakdown'
    }
    return 'intro'
  } else if (energyLevel >= 20) {
    // Low energy - intro or breakdown
    if (previousSection === 'breakdown') {
      return 'breakdown'
    }
    return 'intro'
  } else {
    // Very low - intro or outro
    if (previousSection === 'breakdown' || previousSection === 'outro') {
      return 'outro'
    }
    return 'intro'
  }
}

/**
 * SectionIndicator - shows current arrangement section
 */
export function SectionIndicator({
  section: controlledSection,
  autoDetect = true,
  size = 'medium',
  showIcon = true,
  animate = true,
  onSectionChange,
}: SectionIndicatorProps) {
  const isPlaying = useStore(state => state.isPlaying)
  const energyLevel = useEnergyLevel()

  const [currentSection, setCurrentSection] = useState<SectionType>(
    controlledSection || 'none'
  )
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [previousSection, setPreviousSection] = useState<SectionType>('none')

  // Handle controlled section changes
  useEffect(() => {
    if (controlledSection !== undefined) {
      if (controlledSection !== currentSection) {
        if (animate) {
          setIsTransitioning(true)
          setTimeout(() => {
            setPreviousSection(currentSection)
            setCurrentSection(controlledSection)
            setIsTransitioning(false)
          }, 150)
        } else {
          setPreviousSection(currentSection)
          setCurrentSection(controlledSection)
        }
      }
    }
  }, [controlledSection, currentSection, animate])

  // Auto-detect section from energy
  useEffect(() => {
    if (controlledSection !== undefined || !autoDetect) return

    const detected = detectSectionFromEnergy(energyLevel, isPlaying, previousSection)

    if (detected !== currentSection) {
      if (animate) {
        setIsTransitioning(true)
        setTimeout(() => {
          setPreviousSection(currentSection)
          setCurrentSection(detected)
          onSectionChange?.(detected)
          setIsTransitioning(false)
        }, 150)
      } else {
        setPreviousSection(currentSection)
        setCurrentSection(detected)
        onSectionChange?.(detected)
      }
    }
  }, [energyLevel, isPlaying, autoDetect, controlledSection, currentSection, previousSection, animate, onSectionChange])

  // Reset when playback stops
  useEffect(() => {
    if (!isPlaying && currentSection !== 'none') {
      setCurrentSection('none')
      setPreviousSection('none')
    }
  }, [isPlaying, currentSection])

  const config = SECTION_CONFIG[currentSection]

  return (
    <div
      className={`
        ${styles.container}
        ${styles[size]}
        ${isTransitioning ? styles.transitioning : ''}
      `}
      style={{
        '--section-color': config.color,
        '--section-bg': config.bgColor,
      } as React.CSSProperties}
      title={currentSection !== 'none' ? `Current section: ${config.label}` : 'No section'}
    >
      {showIcon && currentSection !== 'none' && (
        <svg viewBox="0 0 20 20" className={styles.icon}>
          <path d={config.icon} />
        </svg>
      )}
      <span className={styles.label}>{config.label}</span>
    </div>
  )
}

/**
 * Manual section selector for override
 */
export function SectionSelector({
  currentSection,
  onSelect,
  size = 'small',
}: {
  currentSection: SectionType
  onSelect: (section: SectionType) => void
  size?: 'small' | 'medium'
}) {
  const sections: SectionType[] = ['intro', 'build', 'drop', 'breakdown', 'outro']

  return (
    <div className={`${styles.selector} ${styles[size]}`}>
      {sections.map(section => {
        const config = SECTION_CONFIG[section]
        const isActive = section === currentSection

        return (
          <button
            key={section}
            className={`${styles.selectorButton} ${isActive ? styles.active : ''}`}
            onClick={() => onSelect(section)}
            style={{
              '--section-color': config.color,
              '--section-bg': config.bgColor,
            } as React.CSSProperties}
          >
            {config.label}
          </button>
        )
      })}
    </div>
  )
}
