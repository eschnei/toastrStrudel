/**
 * BarBoundarySync - Synchronizes layer updates to bar boundaries
 *
 * Ensures all pattern updates are quantized to bar boundaries for seamless
 * multi-layer transitions. Coordinates timing across multiple layer updates.
 *
 * @references Phase 4 Task 4.2.2
 */

/**
 * Layer update pending at a bar boundary
 */
export interface PendingLayerUpdate {
  id: string
  layerName: 'drums' | 'bass' | 'synth' | 'fx' | 'all'
  pattern: string
  scheduledBar: number
  scheduledTime: number
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'applied' | 'cancelled'
  createdAt: number
}

/**
 * Coordinated multi-layer update
 */
export interface CoordinatedUpdate {
  id: string
  layers: Map<string, string>
  targetBar: number
  targetTime: number
  status: 'pending' | 'applied' | 'partial' | 'cancelled'
  appliedLayers: string[]
  failedLayers: string[]
}

/**
 * Bar boundary sync configuration
 */
export interface BarBoundarySyncConfig {
  /** Beats per bar (default: 4) */
  beatsPerBar: number
  /** Lookahead time in ms for scheduling (default: 100) */
  lookaheadMs: number
  /** Enable logging */
  verbose: boolean
}

const DEFAULT_CONFIG: BarBoundarySyncConfig = {
  beatsPerBar: 4,
  lookaheadMs: 100,
  verbose: true,
}

/**
 * Event listener types
 */
export type BarSyncEventType = 'bar' | 'update_scheduled' | 'update_applied' | 'update_cancelled'

export interface BarSyncEvent {
  type: BarSyncEventType
  barNumber: number
  timestamp: number
  data?: unknown
}

type BarSyncListener = (event: BarSyncEvent) => void

/**
 * BarBoundarySync class - manages bar-quantized layer updates
 */
export class BarBoundarySync {
  private config: BarBoundarySyncConfig
  private bpm: number = 128
  private startTime: number | null = null
  private isRunning: boolean = false
  private currentBar: number = 0

  private pendingUpdates: Map<string, PendingLayerUpdate> = new Map()
  private coordinatedUpdates: Map<string, CoordinatedUpdate> = new Map()
  private listeners: Set<BarSyncListener> = new Set()

  private animationFrameId: number | null = null
  private lastProcessedBar: number = -1

  constructor(config: Partial<BarBoundarySyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Start tracking bar positions
   */
  start(bpm: number = 128): void {
    this.bpm = bpm
    this.startTime = performance.now()
    this.isRunning = true
    this.currentBar = 0
    this.lastProcessedBar = -1

    this.log('Started bar sync tracking')
    this.tick()
  }

  /**
   * Stop tracking
   */
  stop(): void {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Cancel all pending updates
    this.pendingUpdates.forEach(update => {
      update.status = 'cancelled'
    })
    this.pendingUpdates.clear()

    this.log('Stopped bar sync tracking')
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.stop()
    this.startTime = null
    this.currentBar = 0
    this.pendingUpdates.clear()
    this.coordinatedUpdates.clear()
  }

  /**
   * Update BPM (recalculates timing)
   */
  setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(180, bpm))
    this.log(`BPM set to ${this.bpm}`)
  }

  /**
   * Get current bar number
   */
  getCurrentBar(): number {
    return this.currentBar
  }

  /**
   * Get time of next bar boundary
   */
  getNextBarTime(): number {
    if (!this.startTime) return Date.now()

    const barDurationMs = this.getBarDurationMs()
    const elapsed = performance.now() - this.startTime
    const currentBarProgress = elapsed % barDurationMs
    const timeToNextBar = barDurationMs - currentBarProgress

    return performance.now() + timeToNextBar
  }

  /**
   * Get bar duration in milliseconds
   */
  getBarDurationMs(): number {
    // BPM = beats per minute
    // Bar = beatsPerBar beats
    // Bar duration = (beatsPerBar / BPM) * 60 * 1000 ms
    return (this.config.beatsPerBar / this.bpm) * 60 * 1000
  }

  /**
   * Get beat duration in milliseconds
   */
  getBeatDurationMs(): number {
    return (60 / this.bpm) * 1000
  }

  /**
   * Schedule a layer update at the next bar boundary
   */
  scheduleUpdate(
    layerName: 'drums' | 'bass' | 'synth' | 'fx' | 'all',
    pattern: string,
    options?: {
      barsFromNow?: number
      priority?: 'high' | 'normal' | 'low'
    }
  ): string {
    const barsFromNow = options?.barsFromNow ?? 1
    const targetBar = this.currentBar + barsFromNow
    const targetTime = this.getBarTimeMs(targetBar)

    const id = this.generateId()
    const update: PendingLayerUpdate = {
      id,
      layerName,
      pattern,
      scheduledBar: targetBar,
      scheduledTime: targetTime,
      priority: options?.priority ?? 'normal',
      status: 'pending',
      createdAt: Date.now(),
    }

    this.pendingUpdates.set(id, update)

    this.emitEvent('update_scheduled', targetBar, { update })
    this.log(`Scheduled ${layerName} update for bar ${targetBar}`)

    return id
  }

  /**
   * Schedule multiple layer updates to apply together
   */
  scheduleCoordinatedUpdate(
    layers: Record<string, string>,
    options?: {
      barsFromNow?: number
    }
  ): string {
    const barsFromNow = options?.barsFromNow ?? 1
    const targetBar = this.currentBar + barsFromNow
    const targetTime = this.getBarTimeMs(targetBar)

    const id = this.generateId()
    const layerMap = new Map<string, string>()

    Object.entries(layers).forEach(([name, pattern]) => {
      layerMap.set(name, pattern)
    })

    const coordinated: CoordinatedUpdate = {
      id,
      layers: layerMap,
      targetBar,
      targetTime,
      status: 'pending',
      appliedLayers: [],
      failedLayers: [],
    }

    this.coordinatedUpdates.set(id, coordinated)

    this.emitEvent('update_scheduled', targetBar, {
      coordinated,
      layerCount: layerMap.size,
    })

    this.log(`Scheduled coordinated update (${layerMap.size} layers) for bar ${targetBar}`)

    return id
  }

  /**
   * Cancel a pending update
   */
  cancelUpdate(id: string): boolean {
    const update = this.pendingUpdates.get(id)
    if (update && update.status === 'pending') {
      update.status = 'cancelled'
      this.pendingUpdates.delete(id)
      this.emitEvent('update_cancelled', update.scheduledBar, { id })
      return true
    }

    const coordinated = this.coordinatedUpdates.get(id)
    if (coordinated && coordinated.status === 'pending') {
      coordinated.status = 'cancelled'
      this.coordinatedUpdates.delete(id)
      this.emitEvent('update_cancelled', coordinated.targetBar, { id })
      return true
    }

    return false
  }

  /**
   * Get pending updates for a specific layer
   */
  getPendingUpdates(layerName?: string): PendingLayerUpdate[] {
    const updates = Array.from(this.pendingUpdates.values()).filter(
      u => u.status === 'pending'
    )

    if (layerName) {
      return updates.filter(u => u.layerName === layerName || u.layerName === 'all')
    }

    return updates
  }

  /**
   * Get all pending coordinated updates
   */
  getPendingCoordinatedUpdates(): CoordinatedUpdate[] {
    return Array.from(this.coordinatedUpdates.values()).filter(
      u => u.status === 'pending'
    )
  }

  /**
   * Add event listener
   */
  addEventListener(listener: BarSyncListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Register a callback for when updates should be applied
   */
  onUpdateReady(
    callback: (updates: PendingLayerUpdate[], coordinated: CoordinatedUpdate[]) => void
  ): () => void {
    const listener: BarSyncListener = (event) => {
      if (event.type === 'bar') {
        const readyUpdates = this.getUpdatesForBar(event.barNumber)
        const readyCoordinated = this.getCoordinatedForBar(event.barNumber)

        if (readyUpdates.length > 0 || readyCoordinated.length > 0) {
          callback(readyUpdates, readyCoordinated)
        }
      }
    }

    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Mark an update as applied
   */
  markApplied(id: string): void {
    const update = this.pendingUpdates.get(id)
    if (update) {
      update.status = 'applied'
      this.emitEvent('update_applied', update.scheduledBar, { id, layerName: update.layerName })
    }
  }

  /**
   * Mark a coordinated update as applied (or partially applied)
   */
  markCoordinatedApplied(id: string, appliedLayers: string[], failedLayers: string[] = []): void {
    const update = this.coordinatedUpdates.get(id)
    if (update) {
      update.appliedLayers = appliedLayers
      update.failedLayers = failedLayers
      update.status = failedLayers.length > 0 ? 'partial' : 'applied'

      this.emitEvent('update_applied', update.targetBar, {
        id,
        appliedLayers,
        failedLayers,
      })
    }
  }

  /**
   * Get updates ready for a specific bar
   */
  private getUpdatesForBar(barNumber: number): PendingLayerUpdate[] {
    return Array.from(this.pendingUpdates.values()).filter(
      u => u.status === 'pending' && u.scheduledBar === barNumber
    )
  }

  /**
   * Get coordinated updates ready for a specific bar
   */
  private getCoordinatedForBar(barNumber: number): CoordinatedUpdate[] {
    return Array.from(this.coordinatedUpdates.values()).filter(
      u => u.status === 'pending' && u.targetBar === barNumber
    )
  }

  /**
   * Get the time in ms for a specific bar number
   */
  private getBarTimeMs(barNumber: number): number {
    if (!this.startTime) return 0
    return this.startTime + barNumber * this.getBarDurationMs()
  }

  /**
   * Main tick loop
   */
  private tick(): void {
    if (!this.isRunning || !this.startTime) return

    const now = performance.now()
    const elapsed = now - this.startTime
    const barDuration = this.getBarDurationMs()

    // Calculate current bar
    const newBar = Math.floor(elapsed / barDuration)

    // Check if we've crossed a bar boundary
    if (newBar !== this.lastProcessedBar) {
      this.currentBar = newBar
      this.lastProcessedBar = newBar

      this.emitEvent('bar', this.currentBar, {
        elapsedMs: elapsed,
        barDuration,
      })
    }

    // Continue loop
    this.animationFrameId = requestAnimationFrame(() => this.tick())
  }

  /**
   * Emit an event
   */
  private emitEvent(type: BarSyncEventType, barNumber: number, data?: unknown): void {
    const event: BarSyncEvent = {
      type,
      barNumber,
      timestamp: Date.now(),
      data,
    }

    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[BarBoundarySync] Listener error:', error)
      }
    })
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[BarBoundarySync] ${message}`)
    }
  }

  /**
   * Get config
   */
  getConfig(): BarBoundarySyncConfig {
    return { ...this.config }
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<BarBoundarySyncConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let syncInstance: BarBoundarySync | null = null

export function getBarBoundarySync(): BarBoundarySync {
  if (!syncInstance) {
    syncInstance = new BarBoundarySync()
  }
  return syncInstance
}

export function resetBarBoundarySync(): void {
  if (syncInstance) {
    syncInstance.stop()
  }
  syncInstance = null
}
