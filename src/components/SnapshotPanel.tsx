/**
 * SnapshotPanel Component
 *
 * UI for saving, loading, and managing pattern snapshots.
 * Includes save dialog, snapshot list, and delete functionality.
 *
 * @references FR-011
 */

import { useState, useEffect, useCallback } from 'react'
import { getSnapshotManager, type Snapshot } from '@/utils/SnapshotManager'
import styles from './SnapshotPanel.module.css'

interface SnapshotPanelProps {
  /** Current pattern to save */
  currentPattern: string | null
  /** Current BPM */
  currentBPM: number
  /** Callback when a snapshot is loaded */
  onLoad: (pattern: string, bpm: number) => void
  /** Whether the panel is open */
  isOpen: boolean
  /** Callback to close the panel */
  onClose: () => void
}

export function SnapshotPanel({
  currentPattern,
  currentBPM,
  onLoad,
  isOpen,
  onClose,
}: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const snapshotManager = getSnapshotManager()

  // Subscribe to snapshot changes
  useEffect(() => {
    const unsubscribe = snapshotManager.subscribe(setSnapshots)
    return () => {
      unsubscribe()
    }
  }, [snapshotManager])

  // Handle save
  const handleSave = useCallback(() => {
    if (!currentPattern) {
      setSaveError('No pattern to save')
      return
    }

    if (!saveName.trim()) {
      setSaveError('Please enter a name')
      return
    }

    try {
      snapshotManager.save({
        name: saveName.trim(),
        pattern: currentPattern,
        bpm: currentBPM,
      })
      setSaveName('')
      setSaveError(null)
      setShowSaveDialog(false)
    } catch (error) {
      setSaveError((error as Error).message)
    }
  }, [currentPattern, currentBPM, saveName, snapshotManager])

  // Handle load
  const handleLoad = useCallback(
    (snapshot: Snapshot) => {
      onLoad(snapshot.pattern, snapshot.bpm)
      setSelectedId(snapshot.id)
    },
    [onLoad]
  )

  // Handle delete
  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (window.confirm('Delete this snapshot?')) {
        snapshotManager.delete(id)
        if (selectedId === id) {
          setSelectedId(null)
        }
      }
    },
    [snapshotManager, selectedId]
  )

  // Format date for display
  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Snapshots</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Save button and dialog */}
        <div className={styles.saveSection}>
          {showSaveDialog ? (
            <div className={styles.saveDialog}>
              <input
                type="text"
                value={saveName}
                onChange={e => {
                  setSaveName(e.target.value)
                  setSaveError(null)
                }}
                placeholder="Snapshot name..."
                className={styles.saveInput}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') {
                    setShowSaveDialog(false)
                    setSaveName('')
                    setSaveError(null)
                  }
                }}
              />
              <button className={styles.saveConfirmButton} onClick={handleSave}>
                Save
              </button>
              <button
                className={styles.saveCancelButton}
                onClick={() => {
                  setShowSaveDialog(false)
                  setSaveName('')
                  setSaveError(null)
                }}
              >
                Cancel
              </button>
              {saveError && <span className={styles.saveError}>{saveError}</span>}
            </div>
          ) : (
            <button
              className={styles.saveButton}
              onClick={() => setShowSaveDialog(true)}
              disabled={!currentPattern}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Current Pattern
            </button>
          )}
        </div>

        {/* Snapshot list */}
        <div className={styles.list}>
          {snapshots.length === 0 ? (
            <div className={styles.empty}>
              <p>No saved snapshots</p>
              <p className={styles.emptyHint}>
                Save your favorite patterns to recall them later
              </p>
            </div>
          ) : (
            snapshots.map(snapshot => (
              <div
                key={snapshot.id}
                className={`${styles.item} ${selectedId === snapshot.id ? styles.selected : ''}`}
                onClick={() => handleLoad(snapshot)}
              >
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{snapshot.name}</span>
                  <span className={styles.itemPreview}>{snapshot.preview}</span>
                </div>
                <div className={styles.itemMeta}>
                  <span className={styles.itemBpm}>{snapshot.bpm} BPM</span>
                  <span className={styles.itemDate}>{formatDate(snapshot.createdAt)}</span>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={e => handleDelete(snapshot.id, e)}
                  aria-label="Delete snapshot"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer with count */}
        {snapshots.length > 0 && (
          <div className={styles.footer}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} saved
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Snapshot button for triggering the panel
 */
interface SnapshotButtonProps {
  onClick: () => void
  hasSnapshots?: boolean
}

export function SnapshotButton({ onClick, hasSnapshots = false }: SnapshotButtonProps) {
  return (
    <button
      className={styles.triggerButton}
      onClick={onClick}
      title="Snapshots"
      aria-label="Open snapshots"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.triggerIcon}
      >
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
      {hasSnapshots && <span className={styles.triggerDot} />}
    </button>
  )
}
