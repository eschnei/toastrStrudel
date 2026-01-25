/**
 * ArrangementActions Component
 *
 * Large buttons for instant arrangement commands.
 * Provides one-tap access to DROP, BREAKDOWN, and BUILD actions.
 *
 * @references Phase 6 Deliverables
 */

import { useState, useCallback } from 'react'
import { useStore } from '@/store'
import styles from './ArrangementActions.module.css'

export interface ArrangementActionsProps {
  /** Handler for arrangement action */
  onAction: (action: ArrangementAction, prompt: string) => void
  /** Whether actions are disabled */
  disabled?: boolean
  /** Layout orientation */
  layout?: 'horizontal' | 'vertical' | 'grid'
  /** Size variant */
  size?: 'medium' | 'large'
  /** Show labels */
  showLabels?: boolean
}

export type ArrangementAction = 'drop' | 'breakdown' | 'build' | 'intro' | 'outro'

/** Action configuration */
interface ActionConfig {
  label: string
  shortLabel: string
  prompt: string
  color: string
  icon: string
  description: string
}

const ACTION_CONFIG: Record<ArrangementAction, ActionConfig> = {
  drop: {
    label: 'DROP',
    shortLabel: 'DROP',
    prompt: 'drop it now, full energy release, maximum impact',
    color: '#ef4444',
    icon: 'M12 2v20M5 15l7 7 7-7',
    description: 'Maximum energy release',
  },
  breakdown: {
    label: 'BREAKDOWN',
    shortLabel: 'BREAK',
    prompt: 'breakdown, strip to minimal elements, atmospheric',
    color: '#22c55e',
    icon: 'M4 6h16M4 12h10M4 18h6',
    description: 'Strip to minimal',
  },
  build: {
    label: 'BUILD',
    shortLabel: 'BUILD',
    prompt: 'start building up energy, add layers, increase intensity',
    color: '#f59e0b',
    icon: 'M4 12l4-4 4 4 4-4 4 4',
    description: 'Increase energy',
  },
  intro: {
    label: 'INTRO',
    shortLabel: 'INTRO',
    prompt: 'gentle intro, minimal elements, set the mood',
    color: '#6366f1',
    icon: 'M3 12h2l3-9 3 18 3-9h2',
    description: 'Start gentle',
  },
  outro: {
    label: 'OUTRO',
    shortLabel: 'OUTRO',
    prompt: 'wind down, outro, fade elements out gradually',
    color: '#64748b',
    icon: 'M12 4v16M8 8l-4 4 4 4M16 8l4 4-4 4',
    description: 'Wind down',
  },
}

/**
 * Single arrangement action button
 */
function ActionButton({
  action,
  onAction,
  disabled,
  size,
  showLabel = true,
  isActive = false,
}: {
  action: ArrangementAction
  onAction: (action: ArrangementAction, prompt: string) => void
  disabled?: boolean
  size: 'medium' | 'large'
  showLabel?: boolean
  isActive?: boolean
}) {
  const [isPressing, setIsPressing] = useState(false)
  const config = ACTION_CONFIG[action]

  const handleClick = useCallback(() => {
    if (!disabled) {
      onAction(action, config.prompt)
    }
  }, [action, config.prompt, disabled, onAction])

  const handlePointerDown = useCallback(() => {
    if (!disabled) {
      setIsPressing(true)
    }
  }, [disabled])

  const handlePointerUp = useCallback(() => {
    setIsPressing(false)
  }, [])

  return (
    <button
      className={`
        ${styles.actionButton}
        ${styles[size]}
        ${styles[action]}
        ${isPressing ? styles.pressing : ''}
        ${isActive ? styles.active : ''}
      `}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      disabled={disabled}
      title={config.description}
      style={{
        '--action-color': config.color,
      } as React.CSSProperties}
    >
      <svg viewBox="0 0 24 24" className={styles.icon}>
        <path d={config.icon} />
      </svg>
      {showLabel && (
        <span className={styles.label}>
          {size === 'large' ? config.label : config.shortLabel}
        </span>
      )}
    </button>
  )
}

/**
 * ArrangementActions - one-tap arrangement buttons
 */
export function ArrangementActions({
  onAction,
  disabled = false,
  layout = 'horizontal',
  size = 'large',
  showLabels = true,
}: ArrangementActionsProps) {
  const isPlaying = useStore(state => state.isPlaying)
  const playbackStatus = useStore(state => state.playbackStatus)

  const isGenerating = playbackStatus === 'generating'
  const isDisabled = disabled || isGenerating

  // Primary actions for live performance
  const primaryActions: ArrangementAction[] = ['build', 'drop', 'breakdown']

  return (
    <div className={`${styles.container} ${styles[layout]}`}>
      {primaryActions.map(action => (
        <ActionButton
          key={action}
          action={action}
          onAction={onAction}
          disabled={isDisabled || !isPlaying}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  )
}

/**
 * Extended arrangement actions with all options
 */
export function ExtendedArrangementActions({
  onAction,
  disabled = false,
  size = 'medium',
}: {
  onAction: (action: ArrangementAction, prompt: string) => void
  disabled?: boolean
  size?: 'medium' | 'large'
}) {
  const isPlaying = useStore(state => state.isPlaying)
  const playbackStatus = useStore(state => state.playbackStatus)

  const isGenerating = playbackStatus === 'generating'
  const isDisabled = disabled || isGenerating

  const allActions: ArrangementAction[] = ['intro', 'build', 'drop', 'breakdown', 'outro']

  return (
    <div className={`${styles.container} ${styles.grid}`}>
      {allActions.map(action => (
        <ActionButton
          key={action}
          action={action}
          onAction={onAction}
          disabled={isDisabled || (!isPlaying && action !== 'intro')}
          size={size}
          showLabel={true}
        />
      ))}
    </div>
  )
}

/**
 * Compact drop button for quick access
 */
export function DropButton({
  onAction,
  disabled = false,
}: {
  onAction: (action: ArrangementAction, prompt: string) => void
  disabled?: boolean
}) {
  const isPlaying = useStore(state => state.isPlaying)

  return (
    <ActionButton
      action="drop"
      onAction={onAction}
      disabled={disabled || !isPlaying}
      size="large"
      showLabel={true}
    />
  )
}
