/**
 * PromptHistory Component
 *
 * Displays a scrollable list of previous prompts with status indicators.
 * Vertical list with newest at bottom, scrollable with fade at top.
 *
 * Optimized with React.memo and useCallback for performance.
 *
 * @references UI-003, PERF-002
 */

import { useEffect, useRef, useState, memo, useCallback, useMemo } from 'react'
import { getConversationManager, type ConversationEntry } from '@/agents/ConversationManager'
import styles from './PromptHistory.module.css'

export type PromptStatus = 'played' | 'playing' | 'generating' | 'queued' | 'failed'

export interface PromptHistoryItem {
  id: string
  prompt: string
  timestamp: Date
  status: PromptStatus
  pattern?: string
}

interface PromptHistoryProps {
  /** Currently active prompt index (for "NOW" indicator) */
  activeIndex?: number
  /** Current playback status */
  playbackStatus: 'stopped' | 'playing' | 'generating'
  /** Callback when a historical prompt is clicked */
  onPromptClick?: (prompt: string, index: number) => void
  /** Whether the component is visible */
  visible?: boolean
}

/**
 * Convert conversation entries to prompt history items
 */
function entriesToHistoryItems(entries: ConversationEntry[]): PromptHistoryItem[] {
  return entries
    .filter(e => e.role === 'user')
    .map((entry, index) => ({
      id: `prompt-${index}-${entry.timestamp.getTime()}`,
      prompt: entry.content,
      timestamp: entry.timestamp,
      status: 'played' as PromptStatus,
      pattern: entry.resultingPattern,
    }))
}

/**
 * Memoized history item component
 */
const HistoryItem = memo(function HistoryItem({
  item,
  status,
  onPromptClick,
  index,
}: {
  item: PromptHistoryItem
  status: PromptStatus
  onPromptClick?: (prompt: string, index: number) => void
  index: number
}) {
  const isActive = status === 'playing' || status === 'generating'

  // Memoize formatted time (updates less frequently than component)
  const formattedTime = useMemo(() => {
    const now = new Date()
    const diffMs = now.getTime() - item.timestamp.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    return item.timestamp.toLocaleDateString()
  }, [item.timestamp])

  const handleClick = useCallback(() => {
    onPromptClick?.(item.prompt, index)
  }, [onPromptClick, item.prompt, index])

  return (
    <button
      className={`${styles.item} ${styles[status]} ${isActive ? styles.active : ''}`}
      onClick={handleClick}
      title={`Click to reuse: "${item.prompt}"`}
    >
      {/* Status indicator */}
      <span className={styles.indicator}>
        {status === 'generating' ? (
          <span className={styles.spinner} />
        ) : status === 'playing' ? (
          <span className={styles.nowLabel}>NOW</span>
        ) : (
          <span className={styles.dot} />
        )}
      </span>

      {/* Prompt text */}
      <span className={styles.prompt}>{item.prompt}</span>

      {/* Time */}
      <span className={styles.time}>{formattedTime}</span>
    </button>
  )
})

function PromptHistoryBase({
  activeIndex,
  playbackStatus,
  onPromptClick,
  visible = true,
}: PromptHistoryProps) {
  const [items, setItems] = useState<PromptHistoryItem[]>([])
  const [showFade, setShowFade] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const conversationManager = useMemo(() => getConversationManager(), [])

  // Subscribe to conversation changes
  useEffect(() => {
    // Initial load
    const updateItems = () => {
      const history = conversationManager.getHistory()
      setItems(entriesToHistoryItems(history))
    }

    updateItems()

    // Set up interval to check for updates
    // (ConversationManager doesn't have built-in subscription, so we poll)
    const interval = setInterval(updateItems, 1000)

    return () => clearInterval(interval)
  }, [conversationManager])

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [items.length])

  // Memoize scroll handler
  const handleScroll = useCallback(() => {
    if (listRef.current) {
      setShowFade(listRef.current.scrollTop > 20)
    }
  }, [])

  // Memoize status getter
  const getItemStatus = useCallback((index: number): PromptStatus => {
    if (playbackStatus === 'generating' && index === items.length - 1) {
      return 'generating'
    }
    if (activeIndex === index) {
      return 'playing'
    }
    return 'played'
  }, [playbackStatus, activeIndex, items.length])

  if (!visible || items.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      {/* Top fade overlay */}
      <div className={`${styles.fade} ${showFade ? styles.visible : ''}`} />

      {/* Scrollable list */}
      <div
        ref={listRef}
        className={styles.list}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <HistoryItem
            key={item.id}
            item={item}
            status={getItemStatus(index)}
            onPromptClick={onPromptClick}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

export const PromptHistory = memo(PromptHistoryBase)
