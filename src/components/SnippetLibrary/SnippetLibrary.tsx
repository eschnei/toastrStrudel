/**
 * SnippetLibrary Component
 *
 * Displays a list of recorded voice snippets with playback and management.
 */

import { useCallback } from 'react'
import { SnippetCard } from './SnippetCard'
import type { VoiceSnippet, VoiceEffectType } from '@/voice/types'
import styles from './SnippetLibrary.module.css'

export interface SnippetLibraryProps {
  /** List of voice snippets */
  snippets: VoiceSnippet[]
  /** Currently selected snippet ID */
  selectedSnippetId?: string
  /** Whether to show compact view */
  compact?: boolean
  /** Whether to show empty state */
  showEmptyState?: boolean
  /** Called when a snippet effect is changed */
  onEffectChange?: (snippetId: string, effect: VoiceEffectType) => void
  /** Called when a snippet is deleted */
  onDeleteSnippet?: (snippetId: string) => void
  /** Called when a snippet is selected */
  onSelectSnippet?: (snippet: VoiceSnippet) => void
  /** Called when all snippets are cleared */
  onClearAll?: () => void
}

/**
 * SnippetLibrary - list of voice snippets
 */
export function SnippetLibrary({
  snippets,
  selectedSnippetId,
  compact = false,
  showEmptyState = true,
  onEffectChange,
  onDeleteSnippet,
  onSelectSnippet,
  onClearAll,
}: SnippetLibraryProps) {
  /**
   * Handle clear all
   */
  const handleClearAll = useCallback(() => {
    if (onClearAll && window.confirm('Clear all voice snippets?')) {
      onClearAll()
    }
  }, [onClearAll])

  // Empty state
  if (snippets.length === 0 && showEmptyState) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎤</div>
          <div className={styles.emptyText}>
            No voice snippets yet
          </div>
          <div className={styles.emptyHint}>
            Record a snippet to add it here
          </div>
        </div>
      </div>
    )
  }

  if (snippets.length === 0) {
    return null
  }

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Voice Snippets</h3>
        <span className={styles.count}>{snippets.length}</span>
        {onClearAll && snippets.length > 0 && (
          <button className={styles.clearButton} onClick={handleClearAll}>
            Clear All
          </button>
        )}
      </div>

      {/* Snippet list */}
      <div className={styles.list}>
        {snippets.map((snippet) => (
          <SnippetCard
            key={snippet.id}
            snippet={snippet}
            isSelected={selectedSnippetId === snippet.id}
            compact={compact}
            onEffectChange={onEffectChange}
            onDelete={onDeleteSnippet}
            onClick={onSelectSnippet}
          />
        ))}
      </div>

      {/* Usage hint */}
      {!compact && snippets.length > 0 && (
        <div className={styles.usageHint}>
          Tip: Tell the AI how to use your snippets, e.g. "sprinkle voice:0 on offbeats"
        </div>
      )}
    </div>
  )
}

/**
 * Compact snippet list for sidebar
 */
export function CompactSnippetList({
  snippets,
  onSelectSnippet,
}: {
  snippets: VoiceSnippet[]
  onSelectSnippet?: (snippet: VoiceSnippet) => void
}) {
  if (snippets.length === 0) {
    return null
  }

  return (
    <div className={styles.compactList}>
      <div className={styles.compactHeader}>
        <span className={styles.compactTitle}>Voice</span>
        <span className={styles.compactCount}>{snippets.length}</span>
      </div>
      {snippets.map((snippet) => (
        <SnippetCard
          key={snippet.id}
          snippet={snippet}
          compact
          onClick={onSelectSnippet}
        />
      ))}
    </div>
  )
}

export default SnippetLibrary
