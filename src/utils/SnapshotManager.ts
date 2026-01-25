/**
 * SnapshotManager - Manages named pattern snapshots with localStorage persistence
 *
 * Allows users to save, load, and manage named snapshots of their patterns.
 * Snapshots are persisted to localStorage for cross-session availability.
 *
 * @references FR-011
 */

export interface Snapshot {
  /** Unique identifier */
  id: string
  /** User-provided name */
  name: string
  /** The pattern code */
  pattern: string
  /** BPM at time of save */
  bpm: number
  /** When the snapshot was created */
  createdAt: Date
  /** Optional description */
  description?: string
  /** Optional tags for organization */
  tags?: string[]
  /** Preview summary of the pattern */
  preview?: string
}

export interface SnapshotManagerConfig {
  /** localStorage key prefix */
  storageKey: string
  /** Maximum number of snapshots to store */
  maxSnapshots: number
}

const DEFAULT_CONFIG: SnapshotManagerConfig = {
  storageKey: 'vibe-conductor-snapshots',
  maxSnapshots: 50,
}

/**
 * Generate a short preview of a pattern
 */
function generatePreview(pattern: string, maxLength: number = 60): string {
  // Get first non-empty line that isn't just a comment
  const lines = pattern.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'))
  const firstLine = lines[0] || pattern

  if (firstLine.length <= maxLength) {
    return firstLine
  }

  return firstLine.slice(0, maxLength - 3) + '...'
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * SnapshotManager class - manages named pattern snapshots
 */
export class SnapshotManager {
  private snapshots: Map<string, Snapshot> = new Map()
  private config: SnapshotManagerConfig
  private listeners: Set<(snapshots: Snapshot[]) => void> = new Set()

  constructor(config: Partial<SnapshotManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadFromStorage()
  }

  /**
   * Save a new snapshot
   */
  save(options: {
    name: string
    pattern: string
    bpm: number
    description?: string
    tags?: string[]
  }): Snapshot {
    const { name, pattern, bpm, description, tags } = options

    // Check for duplicate names
    const existingWithName = this.getByName(name)
    if (existingWithName) {
      // Update existing snapshot
      return this.update(existingWithName.id, { pattern, bpm, description, tags })
    }

    // Check max snapshots limit
    if (this.snapshots.size >= this.config.maxSnapshots) {
      // Remove oldest snapshot
      const oldest = this.getOldest()
      if (oldest) {
        this.delete(oldest.id)
      }
    }

    const snapshot: Snapshot = {
      id: generateId(),
      name,
      pattern,
      bpm,
      createdAt: new Date(),
      description,
      tags,
      preview: generatePreview(pattern),
    }

    this.snapshots.set(snapshot.id, snapshot)
    this.saveToStorage()
    this.notifyListeners()

    console.log('[SnapshotManager] Saved snapshot:', snapshot.name)
    return snapshot
  }

  /**
   * Update an existing snapshot
   */
  update(id: string, updates: Partial<Omit<Snapshot, 'id' | 'createdAt'>>): Snapshot {
    const existing = this.snapshots.get(id)
    if (!existing) {
      throw new Error(`Snapshot not found: ${id}`)
    }

    const updated: Snapshot = {
      ...existing,
      ...updates,
      preview: updates.pattern ? generatePreview(updates.pattern) : existing.preview,
    }

    this.snapshots.set(id, updated)
    this.saveToStorage()
    this.notifyListeners()

    console.log('[SnapshotManager] Updated snapshot:', updated.name)
    return updated
  }

  /**
   * Delete a snapshot
   */
  delete(id: string): boolean {
    const existed = this.snapshots.delete(id)
    if (existed) {
      this.saveToStorage()
      this.notifyListeners()
      console.log('[SnapshotManager] Deleted snapshot:', id)
    }
    return existed
  }

  /**
   * Get a snapshot by ID
   */
  get(id: string): Snapshot | undefined {
    return this.snapshots.get(id)
  }

  /**
   * Get a snapshot by name
   */
  getByName(name: string): Snapshot | undefined {
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.name.toLowerCase() === name.toLowerCase()) {
        return snapshot
      }
    }
    return undefined
  }

  /**
   * Get all snapshots, sorted by creation date (newest first)
   */
  getAll(): Snapshot[] {
    return Array.from(this.snapshots.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  /**
   * Get snapshots by tag
   */
  getByTag(tag: string): Snapshot[] {
    return this.getAll().filter(
      s => s.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
    )
  }

  /**
   * Search snapshots by name or description
   */
  search(query: string): Snapshot[] {
    const lowered = query.toLowerCase()
    return this.getAll().filter(
      s =>
        s.name.toLowerCase().includes(lowered) ||
        s.description?.toLowerCase().includes(lowered) ||
        s.tags?.some(t => t.toLowerCase().includes(lowered))
    )
  }

  /**
   * Get the oldest snapshot
   */
  private getOldest(): Snapshot | undefined {
    const all = this.getAll()
    return all[all.length - 1]
  }

  /**
   * Get the total count of snapshots
   */
  getCount(): number {
    return this.snapshots.size
  }

  /**
   * Check if a name is already used
   */
  nameExists(name: string): boolean {
    return this.getByName(name) !== undefined
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear()
    this.saveToStorage()
    this.notifyListeners()
    console.log('[SnapshotManager] All snapshots cleared')
  }

  /**
   * Subscribe to snapshot changes
   */
  subscribe(listener: (snapshots: Snapshot[]) => void): () => void {
    this.listeners.add(listener)
    // Immediately notify with current state
    listener(this.getAll())
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(): void {
    const snapshots = this.getAll()
    this.listeners.forEach(listener => listener(snapshots))
  }

  /**
   * Load snapshots from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Snapshot[]
        this.snapshots = new Map(
          parsed.map(s => [
            s.id,
            {
              ...s,
              createdAt: new Date(s.createdAt),
            },
          ])
        )
        console.log('[SnapshotManager] Loaded', this.snapshots.size, 'snapshots from storage')
      }
    } catch (error) {
      console.error('[SnapshotManager] Failed to load from storage:', error)
      this.snapshots = new Map()
    }
  }

  /**
   * Save snapshots to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.snapshots.values())
      localStorage.setItem(this.config.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('[SnapshotManager] Failed to save to storage:', error)
    }
  }

  /**
   * Export all snapshots as JSON
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2)
  }

  /**
   * Import snapshots from JSON
   */
  import(data: string, merge: boolean = true): number {
    try {
      const imported = JSON.parse(data) as Snapshot[]
      let count = 0

      for (const snapshot of imported) {
        // Generate new ID if merging to avoid conflicts
        const newSnapshot: Snapshot = {
          ...snapshot,
          id: merge ? generateId() : snapshot.id,
          createdAt: new Date(snapshot.createdAt),
        }

        // Check for name conflicts when merging
        if (merge && this.nameExists(snapshot.name)) {
          newSnapshot.name = `${snapshot.name} (imported)`
        }

        this.snapshots.set(newSnapshot.id, newSnapshot)
        count++
      }

      this.saveToStorage()
      this.notifyListeners()
      console.log('[SnapshotManager] Imported', count, 'snapshots')
      return count
    } catch (error) {
      console.error('[SnapshotManager] Failed to import:', error)
      return 0
    }
  }
}

// Singleton instance
let managerInstance: SnapshotManager | null = null

export function getSnapshotManager(): SnapshotManager {
  if (!managerInstance) {
    managerInstance = new SnapshotManager()
  }
  return managerInstance
}

export function resetSnapshotManager(): void {
  managerInstance = null
}
