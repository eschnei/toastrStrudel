/**
 * ConflictResolver - Detects and resolves conflicts between layer patterns
 *
 * Analyzes patterns from multiple layers to detect frequency and rhythmic
 * conflicts, then applies resolution strategies to ensure cohesive output.
 *
 * @references Phase 4 Task 4.2.3
 */

import type {
  AgentResponse,
  LayerConflict,
  ConflictResolutionStrategy,
  ConflictResolution,
} from './specialists/types'
import {
  LAYER_FREQUENCY_RANGES,
  frequencyOverlapPercentage,
  DEFAULT_LAYER_PRIORITY,
} from './specialists/types'

/**
 * Conflict resolver configuration
 */
export interface ConflictResolverConfig {
  /** Minimum frequency overlap percentage to trigger conflict */
  frequencyOverlapThreshold: number
  /** Maximum rhythmic density before flagging conflict */
  maxCombinedDensity: number
  /** Enable automatic resolution */
  autoResolve: boolean
  /** Default resolution strategy */
  defaultStrategy: ConflictResolutionStrategy
  /** Enable logging */
  verbose: boolean
}

const DEFAULT_CONFIG: ConflictResolverConfig = {
  frequencyOverlapThreshold: 30, // 30% overlap triggers conflict
  maxCombinedDensity: 48, // Max notes per bar across all layers
  autoResolve: true,
  defaultStrategy: 'modification',
  verbose: true,
}

/**
 * Pattern analysis result
 */
interface PatternAnalysis {
  layerName: string
  pattern: string
  frequencyRange: { low: number; high: number }
  rhythmicDensity: number
  hasLowEnd: boolean
  hasMidRange: boolean
  hasHighEnd: boolean
  accents: number[] // Beat positions of accents
}

/**
 * ConflictResolver class
 */
export class ConflictResolver {
  private config: ConflictResolverConfig
  private conflictLog: LayerConflict[] = []
  private resolutionLog: ConflictResolution[] = []

  constructor(config: Partial<ConflictResolverConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Analyze patterns and detect conflicts
   */
  detectConflicts(
    responses: Map<string, AgentResponse>
  ): LayerConflict[] {
    const conflicts: LayerConflict[] = []
    const analyses = this.analyzePatterns(responses)

    // Check frequency conflicts
    const frequencyConflicts = this.detectFrequencyConflicts(analyses)
    conflicts.push(...frequencyConflicts)

    // Check rhythmic conflicts
    const rhythmicConflicts = this.detectRhythmicConflicts(analyses)
    conflicts.push(...rhythmicConflicts)

    // Check timing conflicts (accent clashes)
    const timingConflicts = this.detectTimingConflicts(analyses)
    conflicts.push(...timingConflicts)

    // Log conflicts
    this.conflictLog.push(...conflicts)

    if (conflicts.length > 0) {
      this.log(`Detected ${conflicts.length} conflicts`)
    }

    return conflicts
  }

  /**
   * Resolve detected conflicts
   */
  resolveConflicts(
    conflicts: LayerConflict[],
    responses: Map<string, AgentResponse>,
    strategy?: ConflictResolutionStrategy
  ): Map<string, AgentResponse> {
    const resolvedResponses = new Map(responses)
    const strategyToUse = strategy ?? this.config.defaultStrategy

    for (const conflict of conflicts) {
      const resolution = this.resolveConflict(
        conflict,
        resolvedResponses,
        strategyToUse
      )

      if (resolution) {
        this.resolutionLog.push(resolution)

        // Apply the resolution
        const response = resolvedResponses.get(resolution.modifiedLayer)
        if (response) {
          resolvedResponses.set(resolution.modifiedLayer, {
            ...response,
            pattern: resolution.resolvedPattern,
            warnings: [
              ...(response.warnings || []),
              `Pattern modified to resolve ${conflict.type} conflict`,
            ],
          })
        }

        this.log(`Resolved ${conflict.type} conflict using ${strategyToUse} strategy`)
      }
    }

    return resolvedResponses
  }

  /**
   * Detect and resolve conflicts in one step
   */
  detectAndResolve(
    responses: Map<string, AgentResponse>,
    strategy?: ConflictResolutionStrategy
  ): {
    conflicts: LayerConflict[]
    resolved: Map<string, AgentResponse>
    resolutions: ConflictResolution[]
  } {
    const conflicts = this.detectConflicts(responses)

    if (conflicts.length === 0 || !this.config.autoResolve) {
      return {
        conflicts,
        resolved: responses,
        resolutions: [],
      }
    }

    const resolutionsBefore = this.resolutionLog.length
    const resolved = this.resolveConflicts(conflicts, responses, strategy)
    const newResolutions = this.resolutionLog.slice(resolutionsBefore)

    return {
      conflicts,
      resolved,
      resolutions: newResolutions,
    }
  }

  /**
   * Analyze patterns from responses
   */
  private analyzePatterns(
    responses: Map<string, AgentResponse>
  ): PatternAnalysis[] {
    const analyses: PatternAnalysis[] = []

    responses.forEach((response, layerName) => {
      if (!response.success || !response.pattern) return

      const layer = layerName as 'drums' | 'bass' | 'synth' | 'fx'
      const defaultRange = LAYER_FREQUENCY_RANGES[layer] || { low: 100, high: 10000 }

      analyses.push({
        layerName,
        pattern: response.pattern,
        frequencyRange: response.frequencyRange || defaultRange,
        rhythmicDensity: response.rhythmicDensity || this.estimateDensity(response.pattern),
        hasLowEnd: this.hasFrequencyRange(response.pattern, 'low'),
        hasMidRange: this.hasFrequencyRange(response.pattern, 'mid'),
        hasHighEnd: this.hasFrequencyRange(response.pattern, 'high'),
        accents: this.detectAccents(response.pattern),
      })
    })

    return analyses
  }

  /**
   * Detect frequency conflicts between layers
   */
  private detectFrequencyConflicts(analyses: PatternAnalysis[]): LayerConflict[] {
    const conflicts: LayerConflict[] = []

    // Check bass vs synth low end conflict
    const bassAnalysis = analyses.find(a => a.layerName === 'bass')
    const synthAnalysis = analyses.find(a => a.layerName === 'synth')

    if (bassAnalysis && synthAnalysis) {
      // Check if synth is playing in bass frequency range
      if (synthAnalysis.hasLowEnd) {
        const overlap = frequencyOverlapPercentage(
          bassAnalysis.frequencyRange,
          { low: 50, high: 300 } // Low synth range
        )

        if (overlap > this.config.frequencyOverlapThreshold) {
          conflicts.push({
            type: 'frequency',
            layers: ['bass', 'synth'],
            description: 'Synth has significant low-end content overlapping with bass',
            severity: overlap,
            suggestion: 'Apply high-pass filter to synth or adjust bass frequencies',
          })
        }
      }
    }

    // Check drums vs bass kick conflict
    const drumsAnalysis = analyses.find(a => a.layerName === 'drums')

    if (drumsAnalysis && bassAnalysis) {
      // Both have strong low end
      if (drumsAnalysis.hasLowEnd && bassAnalysis.hasLowEnd) {
        conflicts.push({
          type: 'frequency',
          layers: ['drums', 'bass'],
          description: 'Kick drum and bass may be masking each other',
          severity: 40,
          suggestion: 'Sidechain bass to kick or adjust relative volumes',
        })
      }
    }

    return conflicts
  }

  /**
   * Detect rhythmic conflicts (too much happening at once)
   */
  private detectRhythmicConflicts(analyses: PatternAnalysis[]): LayerConflict[] {
    const conflicts: LayerConflict[] = []

    const totalDensity = analyses.reduce((sum, a) => sum + a.rhythmicDensity, 0)

    if (totalDensity > this.config.maxCombinedDensity) {
      // Find the densest non-drums layer
      const nonDrums = analyses
        .filter(a => a.layerName !== 'drums')
        .sort((a, b) => b.rhythmicDensity - a.rhythmicDensity)

      if (nonDrums.length > 0) {
        conflicts.push({
          type: 'rhythm',
          layers: nonDrums.map(a => a.layerName as 'drums' | 'bass' | 'synth' | 'fx'),
          description: `Combined rhythmic density (${totalDensity}) exceeds maximum (${this.config.maxCombinedDensity})`,
          severity: Math.min(100, (totalDensity / this.config.maxCombinedDensity) * 100),
          suggestion: 'Simplify patterns or add more space',
        })
      }
    }

    return conflicts
  }

  /**
   * Detect timing conflicts (accents clashing)
   */
  private detectTimingConflicts(analyses: PatternAnalysis[]): LayerConflict[] {
    const conflicts: LayerConflict[] = []

    // Check if multiple layers have accents on same off-beats
    const bassAnalysis = analyses.find(a => a.layerName === 'bass')
    const synthAnalysis = analyses.find(a => a.layerName === 'synth')

    if (bassAnalysis && synthAnalysis) {
      const overlappingAccents = bassAnalysis.accents.filter(
        a => synthAnalysis.accents.includes(a)
      )

      // If more than half the accents overlap on non-main beats
      const offBeatOverlaps = overlappingAccents.filter(
        a => a !== 0 && a !== 4 && a !== 8 && a !== 12
      )

      if (offBeatOverlaps.length >= 2) {
        conflicts.push({
          type: 'timing',
          layers: ['bass', 'synth'],
          description: 'Bass and synth have overlapping off-beat accents',
          severity: offBeatOverlaps.length * 20,
          suggestion: 'Offset one pattern to create more space',
        })
      }
    }

    return conflicts
  }

  /**
   * Resolve a single conflict
   */
  private resolveConflict(
    conflict: LayerConflict,
    responses: Map<string, AgentResponse>,
    strategy: ConflictResolutionStrategy
  ): ConflictResolution | null {
    // Determine which layer to modify (lower priority)
    const sortedLayers = conflict.layers.sort(
      (a, b) => DEFAULT_LAYER_PRIORITY[a] - DEFAULT_LAYER_PRIORITY[b]
    )

    const layerToModify = sortedLayers[0] // Lowest priority
    const response = responses.get(layerToModify)

    if (!response) return null

    let resolvedPattern = response.pattern

    switch (strategy) {
      case 'priority':
        // Just mark as resolved, higher priority layer wins
        // Lower priority layer stays but flagged
        break

      case 'modification':
        resolvedPattern = this.modifyPattern(
          response.pattern,
          conflict.type,
          layerToModify
        )
        break

      case 'veto':
        // Remove the conflicting element entirely
        resolvedPattern = this.removeConflictingElement(
          response.pattern,
          conflict.type
        )
        break

      case 'merge':
        // Attempt to blend the conflicts
        resolvedPattern = this.blendPattern(
          response.pattern,
          conflict.type
        )
        break
    }

    return {
      conflict,
      strategy,
      modifiedLayer: layerToModify,
      originalPattern: response.pattern,
      resolvedPattern,
      success: resolvedPattern !== response.pattern,
    }
  }

  /**
   * Modify a pattern to resolve conflict
   */
  private modifyPattern(
    pattern: string,
    conflictType: 'frequency' | 'rhythm' | 'timing',
    layerName: string
  ): string {
    switch (conflictType) {
      case 'frequency':
        // Add high-pass filter for synth, reduce gain for bass
        if (layerName === 'synth') {
          if (!pattern.includes('.hpf(')) {
            return pattern.replace(/\)$/, ').hpf(300)')
          }
        }
        if (layerName === 'bass') {
          // Reduce gain slightly
          return pattern.replace(/\.gain\(([0-9.]+)\)/, (_, val) => {
            const newGain = Math.max(0.3, parseFloat(val) * 0.85)
            return `.gain(${newGain.toFixed(2)})`
          })
        }
        break

      case 'rhythm':
        // Reduce density by adding degradeBy
        if (!pattern.includes('.degradeBy(')) {
          return pattern.replace(/\)$/, ').degradeBy(0.2)')
        }
        break

      case 'timing':
        // Add slight offset
        if (!pattern.includes('.late(')) {
          return pattern.replace(/\)$/, ').late(0.02)')
        }
        break
    }

    return pattern
  }

  /**
   * Remove conflicting element from pattern
   */
  private removeConflictingElement(
    pattern: string,
    conflictType: 'frequency' | 'rhythm' | 'timing'
  ): string {
    switch (conflictType) {
      case 'frequency':
        // Add aggressive filtering
        if (!pattern.includes('.hpf(')) {
          return pattern.replace(/\)$/, ').hpf(500).lpf(4000)')
        }
        break

      case 'rhythm':
        // Heavy degradation
        return pattern.replace(/\)$/, ').degradeBy(0.5)')

      case 'timing':
        // Silence some hits
        return pattern.replace(/\)$/, ').sometimes(silence)')
    }

    return pattern
  }

  /**
   * Blend pattern to reduce conflict
   */
  private blendPattern(
    pattern: string,
    conflictType: 'frequency' | 'rhythm' | 'timing'
  ): string {
    // Add effects that help patterns blend
    let modified = pattern

    if (conflictType === 'frequency') {
      // Add subtle EQ and room to help blend
      if (!pattern.includes('.room(')) {
        modified = modified.replace(/\)$/, ').room(0.2)')
      }
    }

    // Reduce gain slightly for blending
    if (!modified.includes('.gain(')) {
      modified = modified.replace(/\)$/, ').gain(0.7)')
    } else {
      modified = modified.replace(/\.gain\(([0-9.]+)\)/, (_, val) => {
        const newGain = Math.max(0.3, parseFloat(val) * 0.9)
        return `.gain(${newGain.toFixed(2)})`
      })
    }

    return modified
  }

  /**
   * Estimate rhythmic density from pattern string
   */
  private estimateDensity(pattern: string): number {
    const sounds = pattern.match(/s\(|note\(/gi)
    const multipliers = pattern.match(/\*(\d+)/g)

    let density = sounds?.length || 1

    if (multipliers) {
      multipliers.forEach(m => {
        const num = parseInt(m.slice(1))
        density *= num
      })
    }

    return Math.min(density, 64)
  }

  /**
   * Check if pattern has content in frequency range
   */
  private hasFrequencyRange(
    pattern: string,
    range: 'low' | 'mid' | 'high'
  ): boolean {
    switch (range) {
      case 'low':
        return (
          pattern.match(/\b[a-g][s#]?[12]\b/i) !== null ||
          pattern.includes('bd') ||
          pattern.includes('808') ||
          pattern.includes('sub')
        )
      case 'mid':
        return pattern.match(/\b[a-g][s#]?[34]\b/i) !== null
      case 'high':
        return (
          pattern.match(/\b[a-g][s#]?[56]\b/i) !== null ||
          pattern.includes('hh') ||
          pattern.includes('oh') ||
          pattern.includes('noise')
        )
    }
  }

  /**
   * Detect accent positions in pattern (simplified)
   */
  private detectAccents(pattern: string): number[] {
    const accents: number[] = []

    // Simple heuristic: look for emphasized elements
    // This is a simplified version - real analysis would parse the pattern
    if (pattern.match(/^\s*[a-z]/i)) accents.push(0) // Start of pattern

    // Find positions with higher gain or velocity
    const gainMatches = pattern.match(/\.gain\(0\.[89]|1\.0\)/g)
    if (gainMatches) {
      accents.push(0, 8) // Assume strong beats
    }

    return [...new Set(accents)]
  }

  /**
   * Get conflict history
   */
  getConflictLog(): LayerConflict[] {
    return [...this.conflictLog]
  }

  /**
   * Get resolution history
   */
  getResolutionLog(): ConflictResolution[] {
    return [...this.resolutionLog]
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.conflictLog = []
    this.resolutionLog = []
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[ConflictResolver] ${message}`)
    }
  }

  /**
   * Get config
   */
  getConfig(): ConflictResolverConfig {
    return { ...this.config }
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<ConflictResolverConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let resolverInstance: ConflictResolver | null = null

export function getConflictResolver(): ConflictResolver {
  if (!resolverInstance) {
    resolverInstance = new ConflictResolver()
  }
  return resolverInstance
}

export function resetConflictResolver(): void {
  resolverInstance = null
}
