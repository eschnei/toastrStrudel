/**
 * QuickActions Component
 *
 * Context-aware quick action buttons that change based on playback state and energy level.
 * Before playing: vibe starters (chill, dark, energetic, dreamy, heavy)
 * While playing: modifiers with energy-aware suggestions and highlighting
 *
 * Optimized with React.memo and useMemo for performance.
 *
 * @references FR-019, FR-021, FR-022, FR-023, PERF-002
 */

import { memo, useMemo, useCallback } from 'react'
import { useStore } from '@/store'
import { useEnergyLevel } from '@/hooks/useEnergy'
import styles from './QuickActions.module.css'

interface QuickActionsProps {
  onAction: (prompt: string) => void
  disabled?: boolean
}

interface ActionItem {
  label: string
  prompt: string
  /** Energy level below which this is suggested */
  suggestBelowEnergy?: number
  /** Energy level above which this is suggested */
  suggestAboveEnergy?: number
  /** Whether this is an arrangement command */
  isArrangement?: boolean
}

// Actions before playback starts
const STARTER_ACTIONS: ActionItem[] = [
  { label: 'chill', prompt: 'chill and relaxed, laid back groove' },
  { label: 'dark', prompt: 'dark and moody, deep bass' },
  { label: 'energetic', prompt: 'energetic and driving, lots of energy' },
  { label: 'dreamy', prompt: 'dreamy and spacey, floating in clouds' },
  { label: 'heavy', prompt: 'heavy and aggressive, powerful beats' },
]

// Actions while playing - with energy awareness
const MODIFIER_ACTIONS: ActionItem[] = [
  { label: 'darker', prompt: 'make it darker and moodier' },
  { label: 'brighter', prompt: 'make it brighter and more uplifting' },
  {
    label: 'build',
    prompt: 'start building up energy, add layers',
    suggestBelowEnergy: 60,
    isArrangement: true,
  },
  {
    label: 'drop',
    prompt: 'drop it, full energy release',
    suggestAboveEnergy: 70,
    isArrangement: true,
  },
  { label: 'weirder', prompt: 'make it weirder and more experimental' },
  {
    label: 'strip back',
    prompt: 'strip it back, minimal and sparse',
    suggestAboveEnergy: 60,
    isArrangement: true,
  },
]

// Additional energy-specific suggestions
const ENERGY_SUGGESTIONS: ActionItem[] = [
  {
    label: 'add energy',
    prompt: 'increase the energy, more intensity',
    suggestBelowEnergy: 40,
  },
  {
    label: 'breakdown',
    prompt: 'breakdown, strip to minimal elements',
    suggestAboveEnergy: 70,
    isArrangement: true,
  },
  {
    label: 'calm down',
    prompt: 'calm it down, reduce intensity',
    suggestAboveEnergy: 80,
  },
]

/**
 * Get suggested actions based on energy level
 */
function getSuggestedActions(energyLevel: number): ActionItem[] {
  return [...MODIFIER_ACTIONS, ...ENERGY_SUGGESTIONS].filter(action => {
    if (action.suggestBelowEnergy !== undefined && energyLevel < action.suggestBelowEnergy) {
      return true
    }
    if (action.suggestAboveEnergy !== undefined && energyLevel > action.suggestAboveEnergy) {
      return true
    }
    return false
  })
}

/**
 * Determine if an action should be highlighted based on energy
 */
function shouldHighlight(action: ActionItem, energyLevel: number): boolean {
  if (action.suggestBelowEnergy !== undefined && energyLevel < action.suggestBelowEnergy) {
    return true
  }
  if (action.suggestAboveEnergy !== undefined && energyLevel > action.suggestAboveEnergy) {
    return true
  }
  return false
}

/**
 * Memoized action button component
 */
const ActionButton = memo(function ActionButton({
  action,
  onClick,
  disabled,
  highlighted,
  isSuggested,
}: {
  action: ActionItem
  onClick: () => void
  disabled: boolean
  highlighted: boolean
  isSuggested?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${styles.actionButton} ${highlighted ? styles.highlighted : ''} ${action.isArrangement ? styles.arrangement : ''} ${isSuggested ? styles.suggested : ''}`}
    >
      {action.label}
    </button>
  )
})

function QuickActionsBase({ onAction, disabled = false }: QuickActionsProps) {
  // Use shallow selectors to minimize re-renders
  const isPlaying = useStore(state => state.isPlaying)
  const playbackStatus = useStore(state => state.playbackStatus)
  const energyLevel = useEnergyLevel()

  const isGenerating = playbackStatus === 'generating'

  // Memoize computed values
  const baseActions = useMemo(() => {
    return isPlaying ? MODIFIER_ACTIONS : STARTER_ACTIONS
  }, [isPlaying])

  const suggestions = useMemo(() => {
    return isPlaying ? getSuggestedActions(energyLevel) : []
  }, [isPlaying, energyLevel])

  // Memoize click handler factory
  const createClickHandler = useCallback(
    (prompt: string) => () => onAction(prompt),
    [onAction]
  )

  return (
    <div className={styles.container}>
      {/* Energy-based suggestions (only when playing) */}
      {isPlaying && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          <span className={styles.suggestLabel}>suggested:</span>
          {suggestions.slice(0, 2).map(action => (
            <ActionButton
              key={action.label}
              action={action}
              onClick={createClickHandler(action.prompt)}
              disabled={disabled || isGenerating}
              highlighted={false}
              isSuggested
            />
          ))}
        </div>
      )}

      {/* Main actions */}
      <div className={styles.actions}>
        {baseActions.map(action => {
          const highlighted = isPlaying && shouldHighlight(action, energyLevel)

          return (
            <ActionButton
              key={action.label}
              action={action}
              onClick={createClickHandler(action.prompt)}
              disabled={disabled || isGenerating}
              highlighted={highlighted}
            />
          )
        })}
      </div>
    </div>
  )
}

export const QuickActions = memo(QuickActionsBase)
