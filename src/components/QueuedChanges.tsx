/**
 * QueuedChanges Component
 *
 * Displays visual indicators for scheduled pattern changes.
 * Shows what changes are queued and when they'll execute.
 *
 * @references FR-020
 */

import { useScheduledChanges, useTimingState } from '@/hooks/useTiming'
import { getTimingManager } from '@/engine/TimingManager'
import styles from './QueuedChanges.module.css'

interface QueuedChangesProps {
  /** Maximum number of changes to display */
  maxDisplay?: number
  /** Whether to show compact mode */
  compact?: boolean
  /** Callback when a change is cancelled */
  onCancel?: (id: string) => void
}

export function QueuedChanges({
  maxDisplay = 3,
  compact = false,
  onCancel,
}: QueuedChangesProps) {
  const changes = useScheduledChanges()
  const timing = useTimingState()

  if (changes.length === 0) {
    return null
  }

  const displayChanges = changes.slice(0, maxDisplay)
  const remainingCount = changes.length - maxDisplay

  const handleCancel = (id: string) => {
    getTimingManager().cancelChange(id)
    onCancel?.(id)
  }

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'build':
        return 'BUILD'
      case 'drop':
        return 'DROP'
      case 'breakdown':
        return 'BREAKDOWN'
      case 'transition':
        return 'TRANSITION'
      default:
        return 'CHANGE'
    }
  }

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'build':
        return 'var(--color-warning)'
      case 'drop':
        return 'var(--color-success)'
      case 'breakdown':
        return 'var(--color-info)'
      case 'transition':
        return 'var(--color-accent)'
      default:
        return 'var(--color-text)'
    }
  }

  if (compact) {
    return (
      <div className={styles.compactContainer}>
        <span className={styles.compactLabel}>QUEUED:</span>
        {displayChanges.map((change, index) => (
          <span
            key={change.id}
            className={styles.compactChange}
            style={{ '--type-color': getTypeColor(change.type) } as React.CSSProperties}
          >
            {getTypeLabel(change.type)}
            <span className={styles.compactBars}>
              @{change.executeAtBar - timing.currentBar}
            </span>
          </span>
        ))}
        {remainingCount > 0 && (
          <span className={styles.compactMore}>+{remainingCount}</span>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Queued Changes</span>
        <span className={styles.count}>{changes.length}</span>
      </div>

      <div className={styles.list}>
        {displayChanges.map(change => {
          const barsUntil = change.executeAtBar - timing.currentBar

          return (
            <div
              key={change.id}
              className={styles.change}
              style={{ '--type-color': getTypeColor(change.type) } as React.CSSProperties}
            >
              <div className={styles.changeHeader}>
                <span className={styles.changeType}>
                  {getTypeLabel(change.type)}
                </span>
                <span className={styles.changeTiming}>
                  in {barsUntil} {barsUntil === 1 ? 'bar' : 'bars'}
                </span>
              </div>

              {change.description && (
                <div className={styles.changeDescription}>
                  {change.description}
                </div>
              )}

              <button
                className={styles.cancelButton}
                onClick={() => handleCancel(change.id)}
                title="Cancel this change"
              >
                Cancel
              </button>
            </div>
          )
        })}
      </div>

      {remainingCount > 0 && (
        <div className={styles.more}>
          +{remainingCount} more scheduled
        </div>
      )}
    </div>
  )
}

/**
 * Compact inline indicator for queued changes
 */
export function QueuedIndicator() {
  const changes = useScheduledChanges()
  const timing = useTimingState()

  if (changes.length === 0) {
    return null
  }

  const nextChange = changes[0]
  const barsUntil = nextChange.executeAtBar - timing.currentBar

  const getTypeEmoji = (type: string): string => {
    switch (type) {
      case 'build':
        return '^'
      case 'drop':
        return 'v'
      case 'breakdown':
        return '-'
      case 'transition':
        return '>'
      default:
        return '*'
    }
  }

  return (
    <div
      className={styles.indicator}
      title={`${nextChange.type} in ${barsUntil} bars`}
    >
      <span className={styles.indicatorSymbol}>
        {getTypeEmoji(nextChange.type)}
      </span>
      <span className={styles.indicatorCount}>
        {barsUntil}
      </span>
    </div>
  )
}
