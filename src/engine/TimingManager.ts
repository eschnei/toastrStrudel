/**
 * TimingManager - Manages bar-based timing and scheduled pattern changes
 *
 * Handles parsing time-aware commands, calculating bar durations from BPM,
 * scheduling pattern changes at bar boundaries, and managing a queue of
 * pending changes.
 *
 * @references FR-020
 */

export interface ScheduledChange {
  id: string
  /** The pattern to switch to */
  pattern: string
  /** When to execute (timestamp in ms) */
  executeAt: number
  /** Bar number when this was scheduled */
  scheduledAtBar: number
  /** Bar number when this will execute */
  executeAtBar: number
  /** Type of change */
  type: 'build' | 'drop' | 'breakdown' | 'transition' | 'pattern'
  /** Optional description */
  description?: string
  /** Callback when executed */
  onExecute?: (pattern: string) => void
}

export interface TimingState {
  currentBar: number
  currentBeat: number
  beatsPerBar: number
  bpm: number
  /** Milliseconds per bar */
  msPerBar: number
  /** Milliseconds per beat */
  msPerBeat: number
  /** When current bar started (timestamp) */
  barStartTime: number
  /** Is the clock running */
  isRunning: boolean
}

export interface ParsedTimingCommand {
  /** Number of bars */
  bars?: number
  /** Number of beats */
  beats?: number
  /** Follow-up action (e.g., "then drop") */
  followUp?: string
  /** Total duration in bars */
  totalBars: number
}

/**
 * Parse timing from a command string
 * Examples:
 * - "build for 8 bars" -> { bars: 8, totalBars: 8 }
 * - "build for 16 beats" -> { beats: 16, totalBars: 4 }
 * - "build for 4 bars then drop" -> { bars: 4, followUp: "drop", totalBars: 4 }
 * - "drop in 2 bars" -> { bars: 2, totalBars: 2 }
 */
export function parseTimingCommand(command: string): ParsedTimingCommand | null {
  const lowered = command.toLowerCase().trim()

  // Match "for X bars"
  const barsMatch = lowered.match(/(?:for|over|in)\s+(\d+)\s*bars?/)
  // Match "for X beats"
  const beatsMatch = lowered.match(/(?:for|over|in)\s+(\d+)\s*beats?/)
  // Match "then X" follow-up
  const followUpMatch = lowered.match(/then\s+(\w+)/)

  if (!barsMatch && !beatsMatch) {
    return null
  }

  const result: ParsedTimingCommand = {
    totalBars: 0,
  }

  if (barsMatch) {
    result.bars = parseInt(barsMatch[1])
    result.totalBars = result.bars
  }

  if (beatsMatch) {
    result.beats = parseInt(beatsMatch[1])
    // Convert beats to bars (assuming 4/4 time)
    result.totalBars = Math.ceil(result.beats / 4)
  }

  if (followUpMatch) {
    result.followUp = followUpMatch[1]
  }

  return result
}

/**
 * Calculate bar duration in milliseconds
 */
export function calculateBarDuration(bpm: number, beatsPerBar: number = 4): number {
  const msPerBeat = 60000 / bpm
  return msPerBeat * beatsPerBar
}

/**
 * Calculate beat duration in milliseconds
 */
export function calculateBeatDuration(bpm: number): number {
  return 60000 / bpm
}

/**
 * Generate a unique ID for scheduled changes
 */
function generateId(): string {
  return `change-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * TimingManager class - manages bar-based timing and scheduled changes
 */
export class TimingManager {
  private state: TimingState
  private scheduledChanges: ScheduledChange[] = []
  private timerId: number | null = null
  private listeners: Set<(state: TimingState) => void> = new Set()
  private changeListeners: Set<(changes: ScheduledChange[]) => void> = new Set()

  constructor(bpm: number = 128, beatsPerBar: number = 4) {
    const msPerBeat = calculateBeatDuration(bpm)
    this.state = {
      currentBar: 0,
      currentBeat: 0,
      beatsPerBar,
      bpm,
      msPerBar: msPerBeat * beatsPerBar,
      msPerBeat,
      barStartTime: 0,
      isRunning: false,
    }
  }

  /**
   * Get current timing state
   */
  getState(): TimingState {
    return { ...this.state }
  }

  /**
   * Get all scheduled changes
   */
  getScheduledChanges(): ScheduledChange[] {
    return [...this.scheduledChanges]
  }

  /**
   * Set BPM and recalculate timing
   */
  setBPM(bpm: number): void {
    const clampedBpm = Math.max(60, Math.min(200, bpm))
    const msPerBeat = calculateBeatDuration(clampedBpm)

    this.state = {
      ...this.state,
      bpm: clampedBpm,
      msPerBeat,
      msPerBar: msPerBeat * this.state.beatsPerBar,
    }

    // Recalculate scheduled change times
    this.recalculateScheduledTimes()
    this.notifyListeners()
  }

  /**
   * Set beats per bar
   */
  setBeatsPerBar(beatsPerBar: number): void {
    this.state = {
      ...this.state,
      beatsPerBar,
      msPerBar: this.state.msPerBeat * beatsPerBar,
    }
    this.recalculateScheduledTimes()
    this.notifyListeners()
  }

  /**
   * Start the timing clock
   */
  start(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.state.barStartTime = Date.now()
    this.tick()
    this.notifyListeners()
  }

  /**
   * Stop the timing clock
   */
  stop(): void {
    if (!this.state.isRunning) return

    this.state.isRunning = false
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId)
      this.timerId = null
    }
    this.notifyListeners()
  }

  /**
   * Reset to bar 0, beat 0
   */
  reset(): void {
    this.stop()
    this.state = {
      ...this.state,
      currentBar: 0,
      currentBeat: 0,
      barStartTime: 0,
    }
    this.scheduledChanges = []
    this.notifyListeners()
    this.notifyChangeListeners()
  }

  /**
   * Schedule a pattern change at a future bar
   */
  scheduleChange(
    pattern: string,
    barsFromNow: number,
    options?: {
      type?: ScheduledChange['type']
      description?: string
      onExecute?: (pattern: string) => void
    }
  ): string {
    const id = generateId()
    const executeAtBar = this.state.currentBar + barsFromNow
    const barsUntilExecute = executeAtBar - this.state.currentBar
    const msUntilExecute = barsUntilExecute * this.state.msPerBar

    // Account for current position in the bar
    const elapsedInCurrentBar = Date.now() - this.state.barStartTime
    const remainingInCurrentBar = this.state.msPerBar - elapsedInCurrentBar

    const executeAt = Date.now() + remainingInCurrentBar + (barsUntilExecute - 1) * this.state.msPerBar

    const change: ScheduledChange = {
      id,
      pattern,
      executeAt,
      scheduledAtBar: this.state.currentBar,
      executeAtBar,
      type: options?.type || 'pattern',
      description: options?.description,
      onExecute: options?.onExecute,
    }

    this.scheduledChanges.push(change)
    this.scheduledChanges.sort((a, b) => a.executeAt - b.executeAt)

    console.log('[TimingManager] Scheduled change:', {
      id,
      executeAtBar,
      barsFromNow,
      type: change.type,
    })

    this.notifyChangeListeners()
    return id
  }

  /**
   * Schedule a change at the next bar boundary
   */
  scheduleAtNextBar(
    pattern: string,
    options?: {
      type?: ScheduledChange['type']
      description?: string
      onExecute?: (pattern: string) => void
    }
  ): string {
    return this.scheduleChange(pattern, 1, options)
  }

  /**
   * Cancel a scheduled change
   */
  cancelChange(id: string): boolean {
    const index = this.scheduledChanges.findIndex(c => c.id === id)
    if (index >= 0) {
      this.scheduledChanges.splice(index, 1)
      this.notifyChangeListeners()
      return true
    }
    return false
  }

  /**
   * Cancel all scheduled changes
   */
  cancelAllChanges(): void {
    this.scheduledChanges = []
    this.notifyChangeListeners()
  }

  /**
   * Check and execute any due changes
   */
  private checkScheduledChanges(): void {
    const now = Date.now()
    const dueChanges = this.scheduledChanges.filter(c => c.executeAt <= now)

    for (const change of dueChanges) {
      console.log('[TimingManager] Executing scheduled change:', change.id)

      // Execute callback
      if (change.onExecute) {
        try {
          change.onExecute(change.pattern)
        } catch (err) {
          console.error('[TimingManager] Error executing change callback:', err)
        }
      }

      // Remove from queue
      const index = this.scheduledChanges.indexOf(change)
      if (index >= 0) {
        this.scheduledChanges.splice(index, 1)
      }
    }

    if (dueChanges.length > 0) {
      this.notifyChangeListeners()
    }
  }

  /**
   * Main timing loop
   */
  private tick = (): void => {
    if (!this.state.isRunning) return

    const now = Date.now()
    const elapsed = now - this.state.barStartTime

    // Check for bar/beat changes
    if (elapsed >= this.state.msPerBar) {
      // New bar
      this.state.currentBar++
      this.state.currentBeat = 0
      this.state.barStartTime = now - (elapsed % this.state.msPerBar)
      this.notifyListeners()
    } else {
      // Check for beat change
      const newBeat = Math.floor(elapsed / this.state.msPerBeat)
      if (newBeat !== this.state.currentBeat) {
        this.state.currentBeat = newBeat
        this.notifyListeners()
      }
    }

    // Check scheduled changes
    this.checkScheduledChanges()

    // Continue loop
    this.timerId = requestAnimationFrame(this.tick)
  }

  /**
   * Recalculate scheduled change times after BPM change
   */
  private recalculateScheduledTimes(): void {
    const now = Date.now()

    for (const change of this.scheduledChanges) {
      const barsUntilExecute = change.executeAtBar - this.state.currentBar
      if (barsUntilExecute > 0) {
        change.executeAt = now + barsUntilExecute * this.state.msPerBar
      }
    }
  }

  /**
   * Subscribe to timing state changes
   */
  subscribe(listener: (state: TimingState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Subscribe to scheduled change updates
   */
  subscribeToChanges(listener: (changes: ScheduledChange[]) => void): () => void {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  /**
   * Notify all state listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getState())
      } catch (err) {
        console.error('[TimingManager] Error in listener:', err)
      }
    }
  }

  /**
   * Notify all change listeners
   */
  private notifyChangeListeners(): void {
    const changes = this.getScheduledChanges()
    for (const listener of this.changeListeners) {
      try {
        listener(changes)
      } catch (err) {
        console.error('[TimingManager] Error in change listener:', err)
      }
    }
  }

  /**
   * Get time until next bar in milliseconds
   */
  getTimeToNextBar(): number {
    if (!this.state.isRunning) return this.state.msPerBar

    const elapsed = Date.now() - this.state.barStartTime
    return this.state.msPerBar - elapsed
  }

  /**
   * Get time until next beat in milliseconds
   */
  getTimeToNextBeat(): number {
    if (!this.state.isRunning) return this.state.msPerBeat

    const elapsed = Date.now() - this.state.barStartTime
    const beatPosition = elapsed % this.state.msPerBeat
    return this.state.msPerBeat - beatPosition
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.scheduledChanges.length > 0
  }

  /**
   * Get the next pending change
   */
  getNextChange(): ScheduledChange | null {
    return this.scheduledChanges[0] || null
  }
}

// Singleton instance
let timingManagerInstance: TimingManager | null = null

export function getTimingManager(): TimingManager {
  if (!timingManagerInstance) {
    timingManagerInstance = new TimingManager()
  }
  return timingManagerInstance
}

export function resetTimingManager(): void {
  if (timingManagerInstance) {
    timingManagerInstance.stop()
    timingManagerInstance.reset()
  }
  timingManagerInstance = null
}
