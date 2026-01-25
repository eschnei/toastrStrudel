/**
 * usePatternAgent Hook - React interface for PatternAgent
 *
 * Manages AI pattern generation and provides a clean React
 * interface for generating Strudel patterns from natural language.
 */

import { useCallback, useState, useRef, useEffect } from 'react'
import { getPatternAgent, type GenerationResult } from '@/agents'
import { useStore } from '@/store'

export interface UsePatternAgentReturn {
  // State
  isGenerating: boolean
  isAvailable: boolean
  error: string | null
  lastPattern: string | null
  lastResult: GenerationResult | null

  // Actions
  generatePattern: (prompt: string) => Promise<GenerationResult | null>
  clearContext: () => void
  clearError: () => void
}

/**
 * Hook for interacting with the PatternAgent AI
 */
export function usePatternAgent(): UsePatternAgentReturn {
  const agentRef = useRef(getPatternAgent())
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPattern, setLastPattern] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)

  // Store actions
  const setStoreStatus = useStore(state => state.setStatus)
  const setStoreError = useStore(state => state.setError)
  const setStoreApiAvailable = useStore(state => state.setApiAvailable)
  const storeBPM = useStore(state => state.bpm)
  const storeCurrentPattern = useStore(state => state.currentPattern)

  // Check availability on mount
  useEffect(() => {
    const available = agentRef.current.isAvailable()
    setIsAvailable(available)
    setStoreApiAvailable(available)
  }, [setStoreApiAvailable])

  // Generate pattern from prompt
  const generatePattern = useCallback(
    async (prompt: string): Promise<GenerationResult | null> => {
      if (!agentRef.current.isAvailable()) {
        const errMsg =
          'AI not available. Please set VITE_ANTHROPIC_API_KEY in .env file.'
        setError(errMsg)
        setStoreError(errMsg)
        return null
      }

      setIsGenerating(true)
      setError(null)
      setStoreStatus('generating')

      try {
        const result = await agentRef.current.generatePattern(prompt, {
          bpm: storeBPM,
          currentPattern: storeCurrentPattern || undefined,
        })

        setLastPattern(result.pattern)
        setLastResult(result)
        setIsGenerating(false)

        return result
      } catch (err) {
        const error = err as Error
        const errMsg = `Generation failed: ${error.message}`
        setError(errMsg)
        setStoreError(errMsg)
        setIsGenerating(false)
        setStoreStatus('stopped')
        return null
      }
    },
    [storeBPM, storeCurrentPattern, setStoreStatus, setStoreError]
  )

  // Clear conversation context
  const clearContext = useCallback(() => {
    agentRef.current.clearContext()
    setLastPattern(null)
    setLastResult(null)
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
    setStoreError(null)
  }, [setStoreError])

  return {
    // State
    isGenerating,
    isAvailable,
    error,
    lastPattern,
    lastResult,

    // Actions
    generatePattern,
    clearContext,
    clearError,
  }
}
