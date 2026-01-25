/**
 * EnergyManager - Tracks and manages energy state (0-100 scale)
 *
 * Maintains current energy level based on pattern analysis,
 * arrangement commands, and provides reactive updates to UI.
 *
 * @references FR-019
 */

import { analyzePattern, type MusicalState } from '@/agents/MusicalStateAnalyzer'

export interface EnergyState {
  /** Current energy level (0-100) */
  level: number
  /** Energy category for UI display */
  category: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  /** Trend direction */
  trend: 'rising' | 'falling' | 'stable'
  /** Last update timestamp */
  lastUpdate: number
  /** Previous energy level */
  previousLevel: number
  /** Target energy (for animations) */
  targetLevel: number
}

export interface EnergyHistoryEntry {
  level: number
  timestamp: number
  source: 'pattern' | 'arrangement' | 'manual'
  patternHash?: string
}

/**
 * Get energy category from level
 */
export function getEnergyCategory(level: number): EnergyState['category'] {
  if (level >= 80) return 'very_high'
  if (level >= 60) return 'high'
  if (level >= 40) return 'medium'
  if (level >= 20) return 'low'
  return 'very_low'
}

/**
 * Get display dots count (1-5) from energy level
 */
export function getEnergyDots(level: number): number {
  if (level >= 80) return 5
  if (level >= 60) return 4
  if (level >= 40) return 3
  if (level >= 20) return 2
  return 1
}

/**
 * Get energy color for visualization
 */
export function getEnergyColor(level: number): string {
  if (level >= 80) return 'var(--color-error)' // Red - high energy
  if (level >= 60) return 'var(--color-warning)' // Orange
  if (level >= 40) return 'var(--color-success)' // Green
  if (level >= 20) return 'var(--color-info)' // Blue
  return 'var(--color-text-muted)' // Gray - low energy
}

/**
 * Simple hash for pattern comparison
 */
function hashPattern(pattern: string): string {
  let hash = 0
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

/**
 * EnergyManager class - tracks energy state over time
 */
export class EnergyManager {
  private state: EnergyState
  private history: EnergyHistoryEntry[] = []
  private maxHistory: number = 50
  private listeners: Set<(state: EnergyState) => void> = new Set()
  private smoothingFactor: number = 0.3 // For smoother transitions

  constructor() {
    this.state = {
      level: 0,
      category: 'very_low',
      trend: 'stable',
      lastUpdate: Date.now(),
      previousLevel: 0,
      targetLevel: 0,
    }
  }

  /**
   * Get current energy state
   */
  getState(): EnergyState {
    return { ...this.state }
  }

  /**
   * Get current energy level
   */
  getLevel(): number {
    return this.state.level
  }

  /**
   * Get energy category
   */
  getCategory(): EnergyState['category'] {
    return this.state.category
  }

  /**
   * Get energy trend
   */
  getTrend(): EnergyState['trend'] {
    return this.state.trend
  }

  /**
   * Get history entries
   */
  getHistory(): EnergyHistoryEntry[] {
    return [...this.history]
  }

  /**
   * Update energy from pattern analysis
   */
  updateFromPattern(pattern: string | null): void {
    if (!pattern) {
      this.setEnergy(0, 'pattern')
      return
    }

    const analysis = analyzePattern(pattern)
    this.setEnergy(analysis.energyLevel, 'pattern', hashPattern(pattern))
  }

  /**
   * Update energy from arrangement command
   */
  updateFromArrangement(command: string, estimatedEnergy?: number): void {
    const lowered = command.toLowerCase()

    let newEnergy: number

    if (estimatedEnergy !== undefined) {
      newEnergy = estimatedEnergy
    } else {
      // Estimate based on command type
      if (/drop/.test(lowered)) {
        newEnergy = 95
      } else if (/build/.test(lowered)) {
        // Building increases energy toward 75-85
        newEnergy = Math.min(100, this.state.level + 25)
      } else if (/breakdown|strip/.test(lowered)) {
        newEnergy = 20
      } else {
        // Default: slight increase
        newEnergy = Math.min(100, this.state.level + 10)
      }
    }

    this.setEnergy(newEnergy, 'arrangement')
  }

  /**
   * Set energy directly
   */
  setEnergy(level: number, source: EnergyHistoryEntry['source'], patternHash?: string): void {
    const clampedLevel = Math.max(0, Math.min(100, Math.round(level)))
    const previousLevel = this.state.level

    // Apply smoothing for pattern-based updates
    let smoothedLevel = clampedLevel
    if (source === 'pattern' && this.history.length > 0) {
      smoothedLevel = Math.round(
        previousLevel * (1 - this.smoothingFactor) + clampedLevel * this.smoothingFactor
      )
    }

    // Determine trend
    let trend: EnergyState['trend'] = 'stable'
    const diff = smoothedLevel - previousLevel
    if (diff > 3) trend = 'rising'
    else if (diff < -3) trend = 'falling'

    // Update state
    this.state = {
      level: smoothedLevel,
      category: getEnergyCategory(smoothedLevel),
      trend,
      lastUpdate: Date.now(),
      previousLevel,
      targetLevel: clampedLevel,
    }

    // Add to history
    this.history.push({
      level: smoothedLevel,
      timestamp: Date.now(),
      source,
      patternHash,
    })

    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory)
    }

    // Notify listeners
    this.notifyListeners()
  }

  /**
   * Smoothly animate to target energy
   */
  animateTo(targetLevel: number, durationMs: number = 500): void {
    const startLevel = this.state.level
    const startTime = Date.now()
    const diff = targetLevel - startLevel

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / durationMs)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      const currentLevel = Math.round(startLevel + diff * eased)
      this.state = {
        ...this.state,
        level: currentLevel,
        category: getEnergyCategory(currentLevel),
        targetLevel,
      }

      this.notifyListeners()

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Reset energy state
   */
  reset(): void {
    this.state = {
      level: 0,
      category: 'very_low',
      trend: 'stable',
      lastUpdate: Date.now(),
      previousLevel: 0,
      targetLevel: 0,
    }
    this.history = []
    this.notifyListeners()
  }

  /**
   * Subscribe to energy state changes
   */
  subscribe(listener: (state: EnergyState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getState())
      } catch (err) {
        console.error('[EnergyManager] Error in listener:', err)
      }
    }
  }

  /**
   * Get average energy over recent history
   */
  getAverageEnergy(entryCount: number = 5): number {
    if (this.history.length === 0) return 0

    const recent = this.history.slice(-entryCount)
    const sum = recent.reduce((acc, entry) => acc + entry.level, 0)
    return Math.round(sum / recent.length)
  }

  /**
   * Check if energy is building (consistent upward trend)
   */
  isBuilding(): boolean {
    if (this.history.length < 3) return false

    const recent = this.history.slice(-3)
    return recent.every((entry, i) => {
      if (i === 0) return true
      return entry.level >= recent[i - 1].level
    })
  }

  /**
   * Check if energy is dropping
   */
  isDropping(): boolean {
    if (this.history.length < 3) return false

    const recent = this.history.slice(-3)
    return recent.every((entry, i) => {
      if (i === 0) return true
      return entry.level <= recent[i - 1].level
    })
  }
}

// Singleton instance
let energyManagerInstance: EnergyManager | null = null

export function getEnergyManager(): EnergyManager {
  if (!energyManagerInstance) {
    energyManagerInstance = new EnergyManager()
  }
  return energyManagerInstance
}

export function resetEnergyManager(): void {
  if (energyManagerInstance) {
    energyManagerInstance.reset()
  }
  energyManagerInstance = null
}
