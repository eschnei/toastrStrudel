/**
 * useEnergy Hook - React integration for EnergyManager
 *
 * Provides access to energy tracking state and updates.
 *
 * @references FR-019
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getEnergyManager,
  EnergyManager,
  type EnergyState,
  getEnergyDots,
  getEnergyColor,
  getEnergyCategory,
} from '@/engine/EnergyManager'
import { useStore } from '@/store'

export interface UseEnergyResult {
  /** Current energy state */
  state: EnergyState
  /** Current energy level (0-100) */
  level: number
  /** Energy category */
  category: EnergyState['category']
  /** Trend direction */
  trend: EnergyState['trend']
  /** Number of dots to display (1-5) */
  dots: number
  /** Color for energy display */
  color: string
  /** Update energy from pattern */
  updateFromPattern: (pattern: string | null) => void
  /** Update energy from arrangement command */
  updateFromArrangement: (command: string, estimatedEnergy?: number) => void
  /** Set energy directly */
  setEnergy: (level: number) => void
  /** Animate to target energy */
  animateTo: (targetLevel: number, durationMs?: number) => void
  /** Reset energy state */
  reset: () => void
  /** The energy manager instance */
  energyManager: EnergyManager
}

export function useEnergy(): UseEnergyResult {
  const managerRef = useRef<EnergyManager>(getEnergyManager())
  const currentPattern = useStore(state => state.currentPattern)

  const [state, setState] = useState<EnergyState>(() => managerRef.current.getState())

  // Update energy when pattern changes
  useEffect(() => {
    managerRef.current.updateFromPattern(currentPattern)
  }, [currentPattern])

  // Subscribe to energy state updates
  useEffect(() => {
    const unsubscribe = managerRef.current.subscribe(newState => {
      setState(newState)
    })
    return unsubscribe
  }, [])

  const updateFromPattern = useCallback((pattern: string | null) => {
    managerRef.current.updateFromPattern(pattern)
  }, [])

  const updateFromArrangement = useCallback((command: string, estimatedEnergy?: number) => {
    managerRef.current.updateFromArrangement(command, estimatedEnergy)
  }, [])

  const setEnergy = useCallback((level: number) => {
    managerRef.current.setEnergy(level, 'manual')
  }, [])

  const animateTo = useCallback((targetLevel: number, durationMs?: number) => {
    managerRef.current.animateTo(targetLevel, durationMs)
  }, [])

  const reset = useCallback(() => {
    managerRef.current.reset()
  }, [])

  return {
    state,
    level: state.level,
    category: state.category,
    trend: state.trend,
    dots: getEnergyDots(state.level),
    color: getEnergyColor(state.level),
    updateFromPattern,
    updateFromArrangement,
    setEnergy,
    animateTo,
    reset,
    energyManager: managerRef.current,
  }
}

/**
 * Lightweight hook for just reading energy level
 */
export function useEnergyLevel(): number {
  const [level, setLevel] = useState<number>(() => getEnergyManager().getLevel())

  useEffect(() => {
    const unsubscribe = getEnergyManager().subscribe(state => {
      setLevel(state.level)
    })
    return unsubscribe
  }, [])

  return level
}

/**
 * Hook for energy display props
 */
export function useEnergyDisplay(): {
  dots: number
  color: string
  category: EnergyState['category']
  trend: EnergyState['trend']
} {
  const [display, setDisplay] = useState(() => {
    const state = getEnergyManager().getState()
    return {
      dots: getEnergyDots(state.level),
      color: getEnergyColor(state.level),
      category: state.category,
      trend: state.trend,
    }
  })

  useEffect(() => {
    const unsubscribe = getEnergyManager().subscribe(state => {
      setDisplay({
        dots: getEnergyDots(state.level),
        color: getEnergyColor(state.level),
        category: state.category,
        trend: state.trend,
      })
    })
    return unsubscribe
  }, [])

  return display
}
