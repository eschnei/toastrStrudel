/**
 * LayerControl - UI component for controlling individual audio layers
 *
 * Displays mute/solo buttons, volume slider, and visual feedback
 * for each layer (drums, bass, synth, fx).
 *
 * @references Phase 4 Task 4.3.2
 */

import { useState, useEffect, useCallback, type ReactElement } from 'react'
import styles from './LayerControl.module.css'
import type { LayerType, LayerState, LayerConfig } from '@/engine/LayerManager'
import { getLayerManager } from '@/engine/LayerManager'

export interface LayerControlProps {
  /** The layer type to control */
  layerType: LayerType
  /** Optional custom label */
  label?: string
  /** Show volume slider */
  showVolume?: boolean
  /** Show pattern preview */
  showPreview?: boolean
  /** Callback when layer state changes */
  onStateChange?: (state: LayerState) => void
  /** Compact mode for smaller displays */
  compact?: boolean
}

/**
 * LayerControl component - controls for a single layer
 */
export function LayerControl({
  layerType,
  label,
  showVolume = true,
  showPreview = false,
  onStateChange,
  compact = false,
}: LayerControlProps): ReactElement {
  const layerManager = getLayerManager()

  const [state, setState] = useState<LayerState | undefined>(
    layerManager.getLayer(layerType)
  )
  const [config] = useState<LayerConfig>(
    layerManager.getLayerConfig(layerType)
  )

  // Subscribe to layer changes
  useEffect(() => {
    const unsubscribe = layerManager.addEventListener((event) => {
      if (event.layer === layerType) {
        const newState = layerManager.getLayer(layerType)
        setState(newState)
        if (newState && onStateChange) {
          onStateChange(newState)
        }
      }
    })

    return unsubscribe
  }, [layerType, onStateChange])

  const handleMuteToggle = useCallback(() => {
    layerManager.toggleMute(layerType)
  }, [layerType])

  const handleSoloToggle = useCallback(() => {
    layerManager.toggleSolo(layerType)
  }, [layerType])

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const volume = parseFloat(e.target.value)
      layerManager.setVolume(layerType, volume)
    },
    [layerType]
  )

  if (!state) {
    return <div className={styles.layerControl}>Loading...</div>
  }

  const displayLabel = label || state.label
  const hasPattern = state.pattern !== null && state.pattern.length > 0
  const isPlaying = hasPattern && !state.muted && state.active

  return (
    <div
      className={`${styles.layerControl} ${compact ? styles.compact : ''} ${
        isPlaying ? styles.playing : ''
      } ${state.muted ? styles.muted : ''} ${state.solo ? styles.soloed : ''}`}
      style={{ '--layer-color': config.color } as React.CSSProperties}
    >
      {/* Layer indicator and label */}
      <div className={styles.header}>
        <div
          className={`${styles.indicator} ${hasPattern ? styles.hasPattern : ''}`}
          style={{ backgroundColor: hasPattern ? config.color : undefined }}
        />
        <span className={styles.label}>{displayLabel}</span>
        {hasPattern && isPlaying && (
          <span className={styles.playingBadge}>LIVE</span>
        )}
      </div>

      {/* Control buttons */}
      <div className={styles.controls}>
        <button
          className={`${styles.button} ${styles.muteButton} ${
            state.muted ? styles.active : ''
          }`}
          onClick={handleMuteToggle}
          title={state.muted ? 'Unmute' : 'Mute'}
          aria-pressed={state.muted}
        >
          <MuteIcon muted={state.muted} />
          {!compact && <span>M</span>}
        </button>

        <button
          className={`${styles.button} ${styles.soloButton} ${
            state.solo ? styles.active : ''
          }`}
          onClick={handleSoloToggle}
          title={state.solo ? 'Unsolo' : 'Solo'}
          aria-pressed={state.solo}
        >
          <SoloIcon active={state.solo} />
          {!compact && <span>S</span>}
        </button>
      </div>

      {/* Volume slider */}
      {showVolume && (
        <div className={styles.volumeContainer}>
          <input
            type="range"
            className={styles.volumeSlider}
            min="0"
            max="1"
            step="0.01"
            value={state.volume}
            onChange={handleVolumeChange}
            title={`Volume: ${Math.round(state.volume * 100)}%`}
            style={
              {
                '--volume-percent': `${state.volume * 100}%`,
                '--layer-color': config.color,
              } as React.CSSProperties
            }
          />
          <span className={styles.volumeValue}>
            {Math.round(state.volume * 100)}%
          </span>
        </div>
      )}

      {/* Pattern preview */}
      {showPreview && state.pattern && (
        <div className={styles.preview}>
          <code className={styles.patternCode}>
            {state.pattern.length > 50
              ? state.pattern.slice(0, 50) + '...'
              : state.pattern}
          </code>
        </div>
      )}
    </div>
  )
}

/**
 * Mute icon SVG component
 */
function MuteIcon({ muted }: { muted: boolean }): ReactElement {
  if (muted) {
    return (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    )
  }

  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

/**
 * Solo icon SVG component
 */
function SoloIcon({ active }: { active: boolean }): ReactElement {
  return (
    <svg
      className={`${styles.icon} ${active ? styles.activeIcon : ''}`}
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

/**
 * LayerControlPanel - shows all layer controls together
 */
export interface LayerControlPanelProps {
  /** Show volume sliders */
  showVolume?: boolean
  /** Compact mode */
  compact?: boolean
  /** Callback when any layer changes */
  onLayerChange?: (layerType: LayerType, state: LayerState) => void
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
}

export function LayerControlPanel({
  showVolume = true,
  compact = false,
  onLayerChange,
  orientation = 'horizontal',
}: LayerControlPanelProps): ReactElement {
  const layerManager = getLayerManager()
  const layers = layerManager.getAllLayers()
  const hasSoloedLayers = layerManager.hasSoloedLayers()

  const handleClearSolos = useCallback(() => {
    layerManager.clearAllSolos()
  }, [])

  return (
    <div
      className={`${styles.layerPanel} ${
        orientation === 'vertical' ? styles.vertical : styles.horizontal
      }`}
    >
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Layers</span>
        {hasSoloedLayers && (
          <button
            className={styles.clearSolosButton}
            onClick={handleClearSolos}
            title="Clear all solos"
          >
            Clear Solos
          </button>
        )}
      </div>

      <div className={styles.layerList}>
        {layers.map((layer) => (
          <LayerControl
            key={layer.type}
            layerType={layer.type}
            showVolume={showVolume}
            compact={compact}
            onStateChange={(state) => {
              onLayerChange?.(layer.type, state)
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default LayerControl
