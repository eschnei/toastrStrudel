/**
 * Visualizer Component
 *
 * Main visualizer component that integrates with the audio engine.
 * Supports multiple visualization modes with smooth transitions.
 *
 * The visualizer runs independently of React renders using refs and
 * requestAnimationFrame - React state changes do not interrupt the
 * animation loop.
 *
 * @references UI-002, Section 7.6 Visualizer Options, PERF-002
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { useStore } from '@/store'
import { useStrudel } from '@/hooks'
import { VisualizerWithModes, type VisualizerMode } from './visualizers'
import styles from './Visualizer.module.css'

interface VisualizerProps {
  onClick?: () => void
}

/**
 * Visualizer uses refs to prevent React re-renders from
 * affecting the animation loop performance.
 */
function VisualizerBase({ onClick }: VisualizerProps) {
  // Use shallow equality for minimal re-renders
  const isPlaying = useStore(state => state.isPlaying)
  const isEngineReady = useStore(state => state.isEngineReady)
  const { getAnalyserNode } = useStrudel()

  // Use ref for analyser to avoid re-renders during animation
  const analyserNodeRef = useRef<AnalyserNode | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  // Get analyser node when engine is ready
  // Only update state when ref actually changes
  useEffect(() => {
    if (isEngineReady) {
      const node = getAnalyserNode()
      if (node !== analyserNodeRef.current) {
        analyserNodeRef.current = node
        setAnalyserNode(node)
      }
    } else if (analyserNodeRef.current !== null) {
      analyserNodeRef.current = null
      setAnalyserNode(null)
    }
  }, [isEngineReady, getAnalyserNode])

  // Handle mode change (optional logging/analytics)
  const handleModeChange = useCallback((mode: VisualizerMode) => {
    console.log('[Visualizer] Mode changed to:', mode)
  }, [])

  return (
    <div className={styles.container} onClick={onClick}>
      <VisualizerWithModes
        analyserNode={analyserNode}
        isActive={isPlaying}
        defaultMode="particle"
        showModeSelector={true}
        onModeChange={handleModeChange}
        showStartOverlay={!isEngineReady}
      />
    </div>
  )
}

/**
 * Memoized Visualizer - prevents parent re-renders from
 * causing the visualizer to restart its animation loop.
 */
export const Visualizer = memo(VisualizerBase)
