/**
 * useVoiceSnippets Hook
 *
 * React hook for managing voice snippets and providing AI context.
 * Connects to the store and VoiceProcessor.
 */

import { useCallback, useMemo } from 'react'
import { useStore } from '@/store'
import { getVoiceProcessor } from '@/voice/VoiceProcessor'
import type { VoiceSnippet, VoiceEffectType, VoiceSampleContext } from '@/voice/types'

/**
 * Hook return type
 */
export interface UseVoiceSnippetsReturn {
  /** All voice snippets */
  snippets: VoiceSnippet[]
  /** Whether there are any snippets */
  hasSnippets: boolean
  /** Number of snippets */
  snippetCount: number
  /** Get voice sample context for AI */
  getVoiceContext: () => VoiceSampleContext
  /** Add a snippet to the store */
  addSnippet: (snippet: VoiceSnippet) => void
  /** Remove a snippet */
  removeSnippet: (snippetId: string) => void
  /** Update a snippet's effect */
  updateSnippetEffect: (snippetId: string, effect: VoiceEffectType) => void
  /** Clear all snippets */
  clearAllSnippets: () => void
  /** Get a snippet by ID */
  getSnippet: (snippetId: string) => VoiceSnippet | undefined
}

/**
 * useVoiceSnippets - hook for snippet management
 */
export function useVoiceSnippets(): UseVoiceSnippetsReturn {
  // Get snippets from store
  const snippets = useStore((state) => state.voiceSnippets)
  const addVoiceSnippet = useStore((state) => state.addVoiceSnippet)
  const removeVoiceSnippet = useStore((state) => state.removeVoiceSnippet)
  const updateVoiceSnippet = useStore((state) => state.updateVoiceSnippet)
  const clearVoiceSnippets = useStore((state) => state.clearVoiceSnippets)

  /**
   * Get voice sample context for AI integration
   */
  const getVoiceContext = useCallback((): VoiceSampleContext => {
    return getVoiceProcessor().getVoiceSampleContext()
  }, [])

  /**
   * Add snippet
   */
  const addSnippet = useCallback(
    (snippet: VoiceSnippet) => {
      addVoiceSnippet(snippet)
    },
    [addVoiceSnippet]
  )

  /**
   * Remove snippet
   */
  const removeSnippet = useCallback(
    (snippetId: string) => {
      removeVoiceSnippet(snippetId)
      getVoiceProcessor().removeSnippet(snippetId)
    },
    [removeVoiceSnippet]
  )

  /**
   * Update snippet effect
   */
  const updateSnippetEffect = useCallback(
    async (snippetId: string, effect: VoiceEffectType) => {
      const processor = getVoiceProcessor()
      const updatedSnippet = await processor.reprocessSnippet(snippetId, effect)

      if (updatedSnippet) {
        updateVoiceSnippet(snippetId, { effect })
      }
    },
    [updateVoiceSnippet]
  )

  /**
   * Clear all snippets
   */
  const clearAllSnippets = useCallback(() => {
    clearVoiceSnippets()
    getVoiceProcessor().clearAll()
  }, [clearVoiceSnippets])

  /**
   * Get snippet by ID
   */
  const getSnippet = useCallback(
    (snippetId: string): VoiceSnippet | undefined => {
      return snippets.find((s) => s.id === snippetId)
    },
    [snippets]
  )

  // Memoized values
  const hasSnippets = useMemo(() => snippets.length > 0, [snippets])
  const snippetCount = useMemo(() => snippets.length, [snippets])

  return {
    snippets,
    hasSnippets,
    snippetCount,
    getVoiceContext,
    addSnippet,
    removeSnippet,
    updateSnippetEffect,
    clearAllSnippets,
    getSnippet,
  }
}

/**
 * Get formatted voice context string for AI prompts
 */
export function createVoiceSampleContextString(snippets: VoiceSnippet[]): string {
  if (snippets.length === 0) {
    return ''
  }

  const lines = [
    '## VOICE SAMPLES AVAILABLE',
    'The user has recorded voice samples that you can use in patterns:',
    '',
  ]

  for (const snippet of snippets) {
    const sampleRef = `s("${snippet.sampleName}:${snippet.sampleIndex}")`
    lines.push(`- ${sampleRef} (${snippet.duration.toFixed(1)}s, ${snippet.effect} effect)`)

    if (snippet.instruction) {
      lines.push(`  User instruction: "${snippet.instruction}"`)
    }
  }

  lines.push('')
  lines.push('### How to use voice samples:')
  lines.push('- s("voice:0") - play voice sample')
  lines.push('- s("voice:0").chop(8) - slice into 8 parts')
  lines.push('- s("~ voice:0 ~ voice:0") - offbeat placement')
  lines.push('- s("voice:0").speed(2) - double speed (higher pitch)')
  lines.push('- s("voice:0").speed(0.5) - half speed (lower pitch)')
  lines.push('')
  lines.push('Follow the user\'s instruction for how to use each sample.')

  return lines.join('\n')
}

export default useVoiceSnippets
