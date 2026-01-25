/**
 * VisualizerWithModes Component
 *
 * Main visualizer component with mode switching capability.
 * Supports Waveform, Spectrum, and Particle modes with smooth transitions.
 * Persists mode preference to localStorage.
 *
 * @references UI-002
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Waveform } from './Waveform'
import { Spectrum } from './Spectrum'
import { Particle } from './Particle'
import { CodeDisplay } from './CodeDisplay'
import styles from './VisualizerWithModes.module.css'

export type VisualizerMode = 'waveform' | 'spectrum' | 'particle' | 'code'

export interface VisualizerWithModesProps {
  /** Web Audio AnalyserNode to read audio data from */
  analyserNode: AnalyserNode | null
  /** Whether the visualizer is active (playing) */
  isActive?: boolean
  /** Default mode */
  defaultMode?: VisualizerMode
  /** Storage key for persisting preference */
  storageKey?: string
  /** Whether to show mode selector */
  showModeSelector?: boolean
  /** Callback when mode changes */
  onModeChange?: (mode: VisualizerMode) => void
  /** Click handler (for audio initialization) */
  onClick?: () => void
  /** Show "click to start" overlay */
  showStartOverlay?: boolean
}

const MODE_LABELS: Record<VisualizerMode, string> = {
  waveform: 'Wave',
  spectrum: 'Spectrum',
  particle: 'Particle',
  code: 'Code',
}

const MODE_ICONS: Record<VisualizerMode, string> = {
  waveform: 'M2 10 Q5 2, 8 10 Q11 18, 14 10 Q17 2, 20 10',
  spectrum: 'M2 18 V10 M6 18 V6 M10 18 V8 M14 18 V4 M18 18 V12',
  particle: 'M10 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M5 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M5 15m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M15 15m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  code: 'M7 5 L3 10 L7 15 M13 5 L17 10 L13 15',
}

/**
 * VisualizerWithModes - switchable visualizer modes
 */
export function VisualizerWithModes({
  analyserNode,
  isActive = false,
  defaultMode = 'particle',
  storageKey = 'vibe-conductor-visualizer-mode',
  showModeSelector = true,
  onModeChange,
  onClick,
  showStartOverlay = false,
}: VisualizerWithModesProps) {
  // Load initial mode from localStorage
  const [mode, setMode] = useState<VisualizerMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved && ['waveform', 'spectrum', 'particle', 'code'].includes(saved)) {
        return saved as VisualizerMode
      }
    }
    return defaultMode
  })

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showSelector, setShowSelector] = useState(false)
  const selectorTimeoutRef = useRef<number | null>(null)

  /**
   * Handle mode change with transition
   */
  const handleModeChange = useCallback(
    (newMode: VisualizerMode) => {
      if (newMode === mode) return

      setIsTransitioning(true)

      // Short delay for fade out
      setTimeout(() => {
        setMode(newMode)

        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, newMode)
        }

        // Notify parent
        onModeChange?.(newMode)

        // End transition
        setTimeout(() => {
          setIsTransitioning(false)
        }, 150)
      }, 150)
    },
    [mode, storageKey, onModeChange]
  )

  /**
   * Cycle through modes
   */
  const cycleMode = useCallback(() => {
    const modes: VisualizerMode[] = ['waveform', 'spectrum', 'particle', 'code']
    const currentIndex = modes.indexOf(mode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    handleModeChange(nextMode)
  }, [mode, handleModeChange])

  /**
   * Show selector on mouse movement
   */
  const handleMouseMove = useCallback(() => {
    setShowSelector(true)

    // Clear existing timeout
    if (selectorTimeoutRef.current) {
      clearTimeout(selectorTimeoutRef.current)
    }

    // Hide after 3 seconds of no movement
    selectorTimeoutRef.current = window.setTimeout(() => {
      setShowSelector(false)
    }, 3000)
  }, [])

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (selectorTimeoutRef.current) {
        clearTimeout(selectorTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Render the active visualizer
   */
  const renderVisualizer = () => {
    switch (mode) {
      case 'waveform':
        return (
          <Waveform
            analyserNode={analyserNode}
            isActive={isActive}
            glowIntensity={0.6}
          />
        )
      case 'spectrum':
        return (
          <Spectrum
            analyserNode={analyserNode}
            isActive={isActive}
            mode="bars"
            barCount={64}
            glowIntensity={0.5}
          />
        )
      case 'particle':
        return (
          <Particle
            analyserNode={analyserNode}
            isActive={isActive}
            baseParticleCount={50}
            maxParticles={200}
            enableTrails={true}
            glowIntensity={0.6}
          />
        )
      case 'code':
        return (
          <CodeDisplay
            analyserNode={analyserNode}
            isActive={isActive}
            fontSize={14}
            showLineNumbers={true}
          />
        )
      default:
        return null
    }
  }

  return (
    <div
      className={styles.container}
      onClick={onClick}
      onMouseMove={handleMouseMove}
    >
      {/* Visualizer content with transition */}
      <div
        className={`${styles.visualizerContent} ${isTransitioning ? styles.transitioning : ''}`}
      >
        {renderVisualizer()}
      </div>

      {/* Mode selector (corner placement) */}
      {showModeSelector && (
        <div
          className={`${styles.modeSelector} ${showSelector || !isActive ? styles.visible : ''}`}
        >
          {(['waveform', 'spectrum', 'particle', 'code'] as VisualizerMode[]).map(m => (
            <button
              key={m}
              className={`${styles.modeButton} ${mode === m ? styles.active : ''}`}
              onClick={e => {
                e.stopPropagation()
                handleModeChange(m)
              }}
              title={MODE_LABELS[m]}
              aria-label={`Switch to ${MODE_LABELS[m]} visualizer`}
            >
              <svg viewBox="0 0 20 20" className={styles.modeIcon}>
                <path d={MODE_ICONS[m]} />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Start overlay */}
      {showStartOverlay && (
        <div className={styles.overlay}>
          <span className={styles.hint}>click anywhere to start</span>
        </div>
      )}

      {/* Current mode label (subtle) */}
      <div className={`${styles.modeLabel} ${showSelector ? styles.visible : ''}`}>
        {MODE_LABELS[mode]}
      </div>
    </div>
  )
}
