/**
 * VibePicker Component
 *
 * UI for selecting and previewing vibe themes.
 * Shows all available vibes with color previews.
 *
 * @references Section 7.7 Color System
 */

import { useState, useCallback } from 'react'
import { useVibeTheme, type VibeType, getVibeDisplayInfo } from '@/hooks/useVibeTheme'
import styles from './VibePicker.module.css'

export interface VibePickerProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Show labels */
  showLabels?: boolean
  /** Show current vibe indicator */
  showCurrent?: boolean
  /** Layout */
  layout?: 'horizontal' | 'vertical' | 'grid'
  /** Callback when vibe changes */
  onVibeChange?: (vibe: VibeType) => void
}

/**
 * Individual vibe option button
 */
function VibeOption({
  vibe,
  isActive,
  size,
  showLabel,
  onClick,
}: {
  vibe: VibeType
  isActive: boolean
  size: 'small' | 'medium' | 'large'
  showLabel: boolean
  onClick: () => void
}) {
  const info = getVibeDisplayInfo(vibe)

  return (
    <button
      className={`
        ${styles.vibeOption}
        ${styles[size]}
        ${isActive ? styles.active : ''}
      `}
      onClick={onClick}
      title={`${info.label}: ${info.description}`}
      style={{
        '--preview-bg': info.previewColors.bg,
        '--preview-accent': info.previewColors.accent,
      } as React.CSSProperties}
    >
      <span className={styles.colorPreview}>
        <span className={styles.accentDot} />
      </span>
      {showLabel && <span className={styles.label}>{info.label}</span>}
    </button>
  )
}

/**
 * VibePicker - theme selector
 */
export function VibePicker({
  size = 'medium',
  showLabels = true,
  showCurrent = true,
  layout = 'horizontal',
  onVibeChange,
}: VibePickerProps) {
  const { currentVibe, setVibe, availableVibes } = useVibeTheme(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleVibeSelect = useCallback(
    (vibe: VibeType) => {
      setVibe(vibe)
      onVibeChange?.(vibe)
      setIsExpanded(false)
    },
    [setVibe, onVibeChange]
  )

  const currentInfo = getVibeDisplayInfo(currentVibe)

  return (
    <div className={`${styles.container} ${styles[layout]}`}>
      {/* Current vibe indicator (collapsed view) */}
      {showCurrent && !isExpanded && (
        <button
          className={`${styles.currentVibe} ${styles[size]}`}
          onClick={() => setIsExpanded(true)}
          title="Click to change vibe theme"
          style={{
            '--preview-bg': currentInfo.previewColors.bg,
            '--preview-accent': currentInfo.previewColors.accent,
          } as React.CSSProperties}
        >
          <span className={styles.colorPreview}>
            <span className={styles.accentDot} />
          </span>
          {showLabels && <span className={styles.label}>{currentInfo.label}</span>}
          <svg className={styles.expandIcon} viewBox="0 0 20 20">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>
      )}

      {/* Expanded vibe options */}
      {(isExpanded || !showCurrent) && (
        <div className={styles.options}>
          {showCurrent && (
            <button
              className={styles.closeButton}
              onClick={() => setIsExpanded(false)}
            >
              Done
            </button>
          )}
          <div className={`${styles.optionsList} ${styles[layout]}`}>
            {availableVibes.map(vibe => (
              <VibeOption
                key={vibe}
                vibe={vibe}
                isActive={vibe === currentVibe}
                size={size}
                showLabel={showLabels}
                onClick={() => handleVibeSelect(vibe)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact vibe indicator (shows current vibe only)
 */
export function VibeIndicator() {
  const { currentVibe } = useVibeTheme(false)
  const info = getVibeDisplayInfo(currentVibe)

  return (
    <div
      className={styles.indicator}
      style={{
        '--preview-bg': info.previewColors.bg,
        '--preview-accent': info.previewColors.accent,
      } as React.CSSProperties}
      title={`Current vibe: ${info.label}`}
    >
      <span className={styles.colorPreview}>
        <span className={styles.accentDot} />
      </span>
    </div>
  )
}

/**
 * Inline vibe bar for quick selection
 */
export function VibeBar({
  onVibeChange,
}: {
  onVibeChange?: (vibe: VibeType) => void
}) {
  return (
    <VibePicker
      size="small"
      showLabels={false}
      showCurrent={false}
      layout="horizontal"
      onVibeChange={onVibeChange}
    />
  )
}
