/**
 * LayerManager - Manages individual audio layers (drums, bass, synth, fx)
 *
 * Tracks each layer's state including pattern, volume, mute/solo status,
 * and combines layers into the final Strudel stack for playback.
 *
 * @references Phase 4 Task 4.3.1
 */

/**
 * Layer type identifier
 */
export type LayerType = 'drums' | 'bass' | 'synth' | 'fx'

/**
 * Individual layer state
 */
export interface LayerState {
  /** Layer identifier */
  type: LayerType
  /** Current Strudel pattern */
  pattern: string | null
  /** Volume/gain (0.0 - 1.0) */
  volume: number
  /** Is layer muted */
  muted: boolean
  /** Is layer soloed */
  solo: boolean
  /** Is layer currently playing */
  active: boolean
  /** Last update timestamp */
  lastUpdated: number
  /** Optional label/name */
  label: string
}

/**
 * Layer configuration
 */
export interface LayerConfig {
  /** Default volume (0.0 - 1.0) */
  defaultVolume: number
  /** Allow solo (some layers might not support) */
  allowSolo: boolean
  /** Display order */
  order: number
  /** Color for UI */
  color: string
}

/**
 * Layer manager configuration
 */
export interface LayerManagerConfig {
  /** Layer-specific configurations */
  layerConfigs: Record<LayerType, LayerConfig>
  /** Enable logging */
  verbose: boolean
}

const DEFAULT_LAYER_CONFIGS: Record<LayerType, LayerConfig> = {
  drums: {
    defaultVolume: 0.85,
    allowSolo: true,
    order: 0,
    color: '#FF6B6B', // Red
  },
  bass: {
    defaultVolume: 0.8,
    allowSolo: true,
    order: 1,
    color: '#4ECDC4', // Teal
  },
  synth: {
    defaultVolume: 0.7,
    allowSolo: true,
    order: 2,
    color: '#9B59B6', // Purple
  },
  fx: {
    defaultVolume: 0.6,
    allowSolo: true,
    order: 3,
    color: '#F39C12', // Orange
  },
}

const DEFAULT_CONFIG: LayerManagerConfig = {
  layerConfigs: DEFAULT_LAYER_CONFIGS,
  verbose: true,
}

/**
 * Layer state change event
 */
export interface LayerChangeEvent {
  type: 'pattern' | 'volume' | 'mute' | 'solo' | 'active'
  layer: LayerType
  value: unknown
  timestamp: number
}

type LayerChangeListener = (event: LayerChangeEvent) => void

/**
 * LayerManager class - manages multi-layer audio state
 */
export class LayerManager {
  private config: LayerManagerConfig
  private layers: Map<LayerType, LayerState> = new Map()
  private listeners: Set<LayerChangeListener> = new Set()
  private lastCombinedPattern: string | null = null

  constructor(config: Partial<LayerManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      layerConfigs: {
        ...DEFAULT_LAYER_CONFIGS,
        ...config.layerConfigs,
      },
    }

    // Initialize all layers
    this.initializeLayers()
  }

  /**
   * Initialize layer states
   */
  private initializeLayers(): void {
    const layerTypes: LayerType[] = ['drums', 'bass', 'synth', 'fx']

    layerTypes.forEach(type => {
      const config = this.config.layerConfigs[type]
      this.layers.set(type, {
        type,
        pattern: null,
        volume: config.defaultVolume,
        muted: false,
        solo: false,
        active: false,
        lastUpdated: 0,
        label: this.getLayerLabel(type),
      })
    })
  }

  /**
   * Get human-readable label for layer
   */
  private getLayerLabel(type: LayerType): string {
    const labels: Record<LayerType, string> = {
      drums: 'Drums',
      bass: 'Bass',
      synth: 'Synth',
      fx: 'FX',
    }
    return labels[type]
  }

  /**
   * Get a layer's state
   */
  getLayer(type: LayerType): LayerState | undefined {
    return this.layers.get(type)
  }

  /**
   * Get all layers
   */
  getAllLayers(): LayerState[] {
    return Array.from(this.layers.values()).sort(
      (a, b) =>
        this.config.layerConfigs[a.type].order -
        this.config.layerConfigs[b.type].order
    )
  }

  /**
   * Get active layers (have pattern and not muted)
   */
  getActiveLayers(): LayerState[] {
    return this.getAllLayers().filter(
      layer => layer.pattern && !layer.muted && layer.active
    )
  }

  /**
   * Update a layer's pattern
   */
  setPattern(type: LayerType, pattern: string | null): void {
    const layer = this.layers.get(type)
    if (!layer) return

    layer.pattern = pattern
    layer.active = pattern !== null && pattern.length > 0
    layer.lastUpdated = Date.now()

    this.emitChange('pattern', type, pattern)
    this.log(`${type} pattern updated`)
  }

  /**
   * Update multiple layer patterns at once
   */
  setPatterns(patterns: Partial<Record<LayerType, string>>): void {
    Object.entries(patterns).forEach(([type, pattern]) => {
      this.setPattern(type as LayerType, pattern ?? null)
    })
  }

  /**
   * Set layer volume
   */
  setVolume(type: LayerType, volume: number): void {
    const layer = this.layers.get(type)
    if (!layer) return

    layer.volume = Math.max(0, Math.min(1, volume))
    this.emitChange('volume', type, layer.volume)
    this.log(`${type} volume set to ${(layer.volume * 100).toFixed(0)}%`)
  }

  /**
   * Toggle layer mute
   */
  toggleMute(type: LayerType): boolean {
    const layer = this.layers.get(type)
    if (!layer) return false

    layer.muted = !layer.muted
    this.emitChange('mute', type, layer.muted)
    this.log(`${type} ${layer.muted ? 'muted' : 'unmuted'}`)
    return layer.muted
  }

  /**
   * Set layer mute state explicitly
   */
  setMuted(type: LayerType, muted: boolean): void {
    const layer = this.layers.get(type)
    if (!layer) return

    layer.muted = muted
    this.emitChange('mute', type, muted)
  }

  /**
   * Toggle layer solo
   */
  toggleSolo(type: LayerType): boolean {
    const layer = this.layers.get(type)
    if (!layer) return false

    const config = this.config.layerConfigs[type]
    if (!config.allowSolo) return false

    layer.solo = !layer.solo
    this.emitChange('solo', type, layer.solo)
    this.log(`${type} solo ${layer.solo ? 'on' : 'off'}`)
    return layer.solo
  }

  /**
   * Set layer solo state explicitly
   */
  setSolo(type: LayerType, solo: boolean): void {
    const layer = this.layers.get(type)
    if (!layer) return

    const config = this.config.layerConfigs[type]
    if (!config.allowSolo) return

    layer.solo = solo
    this.emitChange('solo', type, solo)
  }

  /**
   * Clear all solos
   */
  clearAllSolos(): void {
    this.layers.forEach(layer => {
      if (layer.solo) {
        layer.solo = false
        this.emitChange('solo', layer.type, false)
      }
    })
  }

  /**
   * Mute all layers
   */
  muteAll(): void {
    this.layers.forEach(layer => {
      layer.muted = true
      this.emitChange('mute', layer.type, true)
    })
  }

  /**
   * Unmute all layers
   */
  unmuteAll(): void {
    this.layers.forEach(layer => {
      layer.muted = false
      this.emitChange('mute', layer.type, false)
    })
  }

  /**
   * Check if any layer is soloed
   */
  hasSoloedLayers(): boolean {
    return Array.from(this.layers.values()).some(layer => layer.solo)
  }

  /**
   * Get soloed layers
   */
  getSoloedLayers(): LayerState[] {
    return Array.from(this.layers.values()).filter(layer => layer.solo)
  }

  /**
   * Generate combined Strudel pattern from all active layers
   */
  getCombinedPattern(): string | null {
    const hasSolo = this.hasSoloedLayers()

    // Get layers that should play
    const playingLayers = this.getAllLayers().filter(layer => {
      // Must have a pattern
      if (!layer.pattern) return false

      // If any layer is soloed, only play soloed layers
      if (hasSolo) {
        return layer.solo
      }

      // Otherwise play if not muted
      return !layer.muted
    })

    if (playingLayers.length === 0) {
      this.lastCombinedPattern = null
      return null
    }

    // Build patterns with volume applied
    const layerPatterns = playingLayers.map(layer => {
      let pattern = layer.pattern!

      // Apply volume if not already at max
      if (layer.volume < 1.0) {
        // Check if pattern already has .gain()
        if (pattern.includes('.gain(')) {
          // Modify existing gain
          pattern = pattern.replace(/\.gain\(([0-9.]+)\)/g, (_, val) => {
            const newGain = parseFloat(val) * layer.volume
            return `.gain(${newGain.toFixed(2)})`
          })
        } else {
          // Add gain at the end
          pattern = pattern.replace(/\)$/, `).gain(${layer.volume.toFixed(2)})`)
        }
      }

      return pattern
    })

    // Combine patterns
    let combined: string
    if (layerPatterns.length === 1) {
      combined = layerPatterns[0]
    } else {
      // Stack all patterns
      const formattedPatterns = layerPatterns.map(p => `  ${p}`).join(',\n')
      combined = `stack(\n${formattedPatterns}\n)`
    }

    this.lastCombinedPattern = combined
    return combined
  }

  /**
   * Get the last generated combined pattern
   */
  getLastCombinedPattern(): string | null {
    return this.lastCombinedPattern
  }

  /**
   * Add event listener
   */
  addEventListener(listener: LayerChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Clear a specific layer
   */
  clearLayer(type: LayerType): void {
    this.setPattern(type, null)
    const layer = this.layers.get(type)
    if (layer) {
      layer.active = false
      layer.muted = false
      layer.solo = false
    }
  }

  /**
   * Clear all layers
   */
  clearAllLayers(): void {
    this.layers.forEach((_, type) => {
      this.clearLayer(type)
    })
    this.lastCombinedPattern = null
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.clearAllLayers()
    this.initializeLayers()
  }

  /**
   * Get layer config
   */
  getLayerConfig(type: LayerType): LayerConfig {
    return { ...this.config.layerConfigs[type] }
  }

  /**
   * Get all layer configs
   */
  getAllLayerConfigs(): Record<LayerType, LayerConfig> {
    return { ...this.config.layerConfigs }
  }

  /**
   * Get summary of current state
   */
  getSummary(): {
    activeLayers: number
    mutedLayers: number
    soloedLayers: number
    hasPattern: boolean
  } {
    const layers = this.getAllLayers()

    return {
      activeLayers: layers.filter(l => l.active).length,
      mutedLayers: layers.filter(l => l.muted).length,
      soloedLayers: layers.filter(l => l.solo).length,
      hasPattern: this.lastCombinedPattern !== null,
    }
  }

  /**
   * Export current state
   */
  exportState(): Record<LayerType, LayerState> {
    const state: Record<string, LayerState> = {}
    this.layers.forEach((layer, type) => {
      state[type] = { ...layer }
    })
    return state as Record<LayerType, LayerState>
  }

  /**
   * Import state
   */
  importState(state: Partial<Record<LayerType, Partial<LayerState>>>): void {
    Object.entries(state).forEach(([type, layerState]) => {
      const layer = this.layers.get(type as LayerType)
      if (layer && layerState) {
        if (layerState.pattern !== undefined) {
          this.setPattern(type as LayerType, layerState.pattern)
        }
        if (layerState.volume !== undefined) {
          this.setVolume(type as LayerType, layerState.volume)
        }
        if (layerState.muted !== undefined) {
          this.setMuted(type as LayerType, layerState.muted)
        }
        if (layerState.solo !== undefined) {
          this.setSolo(type as LayerType, layerState.solo)
        }
      }
    })
  }

  /**
   * Emit a change event
   */
  private emitChange(
    type: LayerChangeEvent['type'],
    layer: LayerType,
    value: unknown
  ): void {
    const event: LayerChangeEvent = {
      type,
      layer,
      value,
      timestamp: Date.now(),
    }

    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[LayerManager] Listener error:', error)
      }
    })
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[LayerManager] ${message}`)
    }
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<LayerManagerConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let managerInstance: LayerManager | null = null

export function getLayerManager(): LayerManager {
  if (!managerInstance) {
    managerInstance = new LayerManager()
  }
  return managerInstance
}

export function resetLayerManager(): void {
  if (managerInstance) {
    managerInstance.clearAllLayers()
  }
  managerInstance = null
}
