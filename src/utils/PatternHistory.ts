/**
 * PatternHistory - Manages undo/redo stack for pattern changes
 *
 * Provides a history stack for patterns, enabling users to undo/redo
 * pattern changes during a session.
 *
 * @references FR-010
 */

export interface PatternHistoryEntry {
  /** The pattern code */
  pattern: string
  /** When this pattern was added */
  timestamp: Date
  /** The prompt that generated this pattern */
  prompt?: string
  /** Whether this was a modification of a previous pattern */
  isModification?: boolean
  /** Additional metadata */
  metadata?: {
    bpm?: number
    energyLevel?: number
    mood?: string
  }
}

export interface PatternHistoryConfig {
  /** Maximum number of patterns to keep in history */
  maxDepth: number
}

const DEFAULT_CONFIG: PatternHistoryConfig = {
  maxDepth: 20,
}

/**
 * PatternHistory class - manages undo/redo stack for patterns
 */
export class PatternHistory {
  private history: PatternHistoryEntry[] = []
  private currentIndex: number = -1
  private config: PatternHistoryConfig
  private listeners: Set<(history: PatternHistory) => void> = new Set()

  constructor(config: Partial<PatternHistoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Push a new pattern onto the history stack
   * Clears any redo history (future patterns after current index)
   */
  push(entry: Omit<PatternHistoryEntry, 'timestamp'> & { timestamp?: Date }): void {
    const fullEntry: PatternHistoryEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
    }

    // If we're not at the end of history, remove everything after current position
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // Add the new entry
    this.history.push(fullEntry)
    this.currentIndex = this.history.length - 1

    // Trim history if it exceeds max depth
    if (this.history.length > this.config.maxDepth) {
      const excess = this.history.length - this.config.maxDepth
      this.history = this.history.slice(excess)
      this.currentIndex -= excess
    }

    console.log('[PatternHistory] Pushed pattern, index:', this.currentIndex, 'total:', this.history.length)
    this.notifyListeners()
  }

  /**
   * Undo to the previous pattern
   * Returns the previous pattern or null if at the beginning
   */
  undo(): PatternHistoryEntry | null {
    if (!this.canUndo()) {
      console.log('[PatternHistory] Cannot undo, at beginning')
      return null
    }

    this.currentIndex--
    const entry = this.history[this.currentIndex]
    console.log('[PatternHistory] Undo to index:', this.currentIndex)
    this.notifyListeners()
    return entry
  }

  /**
   * Redo to the next pattern
   * Returns the next pattern or null if at the end
   */
  redo(): PatternHistoryEntry | null {
    if (!this.canRedo()) {
      console.log('[PatternHistory] Cannot redo, at end')
      return null
    }

    this.currentIndex++
    const entry = this.history[this.currentIndex]
    console.log('[PatternHistory] Redo to index:', this.currentIndex)
    this.notifyListeners()
    return entry
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Get the current pattern entry
   */
  getCurrent(): PatternHistoryEntry | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null
    }
    return this.history[this.currentIndex]
  }

  /**
   * Get the current pattern code
   */
  getCurrentPattern(): string | null {
    return this.getCurrent()?.pattern || null
  }

  /**
   * Get the full history
   */
  getHistory(): PatternHistoryEntry[] {
    return [...this.history]
  }

  /**
   * Get the number of entries in history
   */
  getLength(): number {
    return this.history.length
  }

  /**
   * Get the current index
   */
  getCurrentIndex(): number {
    return this.currentIndex
  }

  /**
   * Get undo count (how many undos are available)
   */
  getUndoCount(): number {
    return this.currentIndex
  }

  /**
   * Get redo count (how many redos are available)
   */
  getRedoCount(): number {
    return this.history.length - 1 - this.currentIndex
  }

  /**
   * Go to a specific index in history
   */
  goToIndex(index: number): PatternHistoryEntry | null {
    if (index < 0 || index >= this.history.length) {
      console.log('[PatternHistory] Invalid index:', index)
      return null
    }

    this.currentIndex = index
    console.log('[PatternHistory] Jumped to index:', index)
    this.notifyListeners()
    return this.history[index]
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
    console.log('[PatternHistory] History cleared')
    this.notifyListeners()
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener: (history: PatternHistory) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this))
  }

  /**
   * Get a summary of history state
   */
  getSummary(): {
    total: number
    currentIndex: number
    canUndo: boolean
    canRedo: boolean
    undoCount: number
    redoCount: number
  } {
    return {
      total: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.getUndoCount(),
      redoCount: this.getRedoCount(),
    }
  }

  /**
   * Export history for persistence
   */
  export(): string {
    return JSON.stringify({
      history: this.history,
      currentIndex: this.currentIndex,
    })
  }

  /**
   * Import history from persistence
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (parsed.history && Array.isArray(parsed.history)) {
        this.history = parsed.history.map((entry: PatternHistoryEntry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }))
        this.currentIndex = typeof parsed.currentIndex === 'number'
          ? parsed.currentIndex
          : this.history.length - 1
        console.log('[PatternHistory] Imported', this.history.length, 'entries')
        this.notifyListeners()
      }
    } catch (error) {
      console.error('[PatternHistory] Failed to import history:', error)
    }
  }
}

// Singleton instance
let historyInstance: PatternHistory | null = null

export function getPatternHistory(): PatternHistory {
  if (!historyInstance) {
    historyInstance = new PatternHistory()
  }
  return historyInstance
}

export function resetPatternHistory(): void {
  if (historyInstance) {
    historyInstance.clear()
  }
  historyInstance = null
}
