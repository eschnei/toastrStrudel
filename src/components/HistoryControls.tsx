/**
 * HistoryControls Component
 *
 * Undo/Redo buttons for pattern history navigation.
 * Keyboard shortcuts: Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo
 *
 * @references FR-010
 */

import { useCallback, useEffect, useState } from 'react'
import { getPatternHistory, type PatternHistory } from '@/utils'
import styles from './HistoryControls.module.css'

interface HistoryControlsProps {
  /** Callback when undo/redo changes the pattern */
  onPatternChange?: (pattern: string) => void
  /** Whether controls are disabled */
  disabled?: boolean
  /** Show count badges */
  showCounts?: boolean
}

export function HistoryControls({
  onPatternChange,
  disabled = false,
  showCounts = false,
}: HistoryControlsProps) {
  const history = getPatternHistory()
  const [canUndo, setCanUndo] = useState(history.canUndo())
  const [canRedo, setCanRedo] = useState(history.canRedo())
  const [undoCount, setUndoCount] = useState(history.getUndoCount())
  const [redoCount, setRedoCount] = useState(history.getRedoCount())

  // Subscribe to history changes
  useEffect(() => {
    const unsubscribe = history.subscribe((h: PatternHistory) => {
      setCanUndo(h.canUndo())
      setCanRedo(h.canRedo())
      setUndoCount(h.getUndoCount())
      setRedoCount(h.getRedoCount())
    })

    return () => {
      unsubscribe()
    }
  }, [history])

  // Handle undo
  const handleUndo = useCallback(() => {
    if (disabled || !canUndo) return

    const entry = history.undo()
    if (entry && onPatternChange) {
      onPatternChange(entry.pattern)
    }
  }, [disabled, canUndo, history, onPatternChange])

  // Handle redo
  const handleRedo = useCallback(() => {
    if (disabled || !canRedo) return

    const entry = history.redo()
    if (entry && onPatternChange) {
      onPatternChange(entry.pattern)
    }
  }, [disabled, canRedo, history, onPatternChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }

      // Cmd/Ctrl + Shift + Z for redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      }

      // Also support Cmd/Ctrl + Y for redo (Windows convention)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
  const undoShortcut = isMac ? 'Cmd+Z' : 'Ctrl+Z'
  const redoShortcut = isMac ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z'

  return (
    <div className={styles.container}>
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        disabled={disabled || !canUndo}
        className={styles.button}
        title={`Undo (${undoShortcut})`}
        aria-label="Undo"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
        {showCounts && undoCount > 0 && (
          <span className={styles.count}>{undoCount}</span>
        )}
      </button>

      {/* Redo Button */}
      <button
        onClick={handleRedo}
        disabled={disabled || !canRedo}
        className={styles.button}
        title={`Redo (${redoShortcut})`}
        aria-label="Redo"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
        </svg>
        {showCounts && redoCount > 0 && (
          <span className={styles.count}>{redoCount}</span>
        )}
      </button>
    </div>
  )
}
