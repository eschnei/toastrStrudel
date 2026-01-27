/**
 * Toastr Strudel - Main Application
 *
 * A web application where users describe music with natural language prompts,
 * and an AI agent generates playable Strudel code for live electronic music.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  StatusBar,
  Visualizer,
  PromptInput,
  QuickActions,
  EmptyState,
  PlayButton,
  ErrorDisplay,
  VoiceRecorder,
  SnippetLibrary,
} from '@/components'
import { useStrudel, usePatternAgent, useVoiceSnippets } from '@/hooks'
import { useStore } from '@/store'
import type { VoiceSnippet, VoiceEffectType } from '@/voice/types'
import styles from './App.module.css'

function App() {
  // Hooks
  const {
    isReady,
    isPlaying,
    initialize,
    updatePattern,
    play,
    clearError: clearEngineError,
  } = useStrudel()

  const {
    generatePattern,
    isGenerating,
    isAvailable: isApiAvailable,
    error: agentError,
    clearError: clearAgentError,
  } = usePatternAgent()

  // Store state
  const isFirstTime = useStore(state => state.isFirstTime)
  const storeError = useStore(state => state.error)
  const setStatus = useStore(state => state.setStatus)
  const setApiAvailable = useStore(state => state.setApiAvailable)
  const clearStoreError = useStore(state => state.clearError)

  // Voice snippet management
  const {
    snippets: voiceSnippets,
    hasSnippets: hasVoiceSnippets,
    addSnippet,
    removeSnippet,
    updateSnippetEffect,
    clearAllSnippets,
  } = useVoiceSnippets()

  // UI state for voice panel
  const [isVoicePanelExpanded, setIsVoicePanelExpanded] = useState(false)

  // Check API availability on mount
  useEffect(() => {
    setApiAvailable(isApiAvailable)
  }, [isApiAvailable, setApiAvailable])

  // Handle prompt submission
  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      // Initialize audio context if needed
      if (!isReady) {
        await initialize()
      }

      // Set generating status
      setStatus('generating')

      // Generate pattern from prompt
      const result = await generatePattern(prompt)

      if (result) {
        // Update the pattern in the engine
        const success = await updatePattern(result.pattern)

        if (success) {
          // Start playing if not already
          if (!isPlaying) {
            await play()
          }
          setStatus('playing')
        } else {
          setStatus(isPlaying ? 'playing' : 'stopped')
        }
      } else {
        setStatus(isPlaying ? 'playing' : 'stopped')
      }
    },
    [isReady, initialize, generatePattern, updatePattern, isPlaying, play, setStatus]
  )

  // Handle visualizer click (initialize audio)
  const handleVisualizerClick = useCallback(async () => {
    if (!isReady) {
      await initialize()
    }
  }, [isReady, initialize])

  // Handle quick action
  const handleQuickAction = useCallback(
    (prompt: string) => {
      handlePromptSubmit(prompt)
    },
    [handlePromptSubmit]
  )

  // Handle example click from empty state
  const handleExampleClick = useCallback(
    (prompt: string) => {
      handlePromptSubmit(prompt)
    },
    [handlePromptSubmit]
  )

  // Clear all errors
  const handleDismissError = useCallback(() => {
    clearEngineError()
    clearAgentError()
    clearStoreError()
  }, [clearEngineError, clearAgentError, clearStoreError])

  // Combined error message
  const errorMessage = storeError || agentError

  // Handle snippet added
  const handleSnippetAdd = useCallback(
    (snippet: VoiceSnippet) => {
      addSnippet(snippet)
      setIsVoicePanelExpanded(true)
    },
    [addSnippet]
  )

  // Handle snippet effect change
  const handleEffectChange = useCallback(
    (snippetId: string, effect: VoiceEffectType) => {
      updateSnippetEffect(snippetId, effect)
    },
    [updateSnippetEffect]
  )

  return (
    <div className={styles.app}>
      {/* Status bar at top */}
      <StatusBar />

      {/* Main content area */}
      <main className={styles.main}>
        {/* Visualizer takes ~50% of viewport */}
        <Visualizer onClick={handleVisualizerClick} />

        {/* Content section */}
        <section className={styles.content}>
          {/* Empty state for first-time users */}
          {isFirstTime && !isPlaying && !isGenerating && (
            <EmptyState onExampleClick={handleExampleClick} />
          )}

          {/* Quick actions */}
          <div className={styles.quickActions}>
            <QuickActions onAction={handleQuickAction} disabled={isGenerating} />
          </div>
        </section>
      </main>

      {/* Voice snippet panel */}
      {hasVoiceSnippets && (
        <aside className={`${styles.voicePanel} ${isVoicePanelExpanded ? styles.expanded : ''}`}>
          <button
            className={styles.voicePanelToggle}
            onClick={() => setIsVoicePanelExpanded(!isVoicePanelExpanded)}
          >
            Voice Samples ({voiceSnippets.length})
            <span className={styles.toggleIcon}>{isVoicePanelExpanded ? '▼' : '▲'}</span>
          </button>
          {isVoicePanelExpanded && (
            <SnippetLibrary
              snippets={voiceSnippets}
              compact
              showEmptyState={false}
              onEffectChange={handleEffectChange}
              onDeleteSnippet={removeSnippet}
              onClearAll={clearAllSnippets}
            />
          )}
        </aside>
      )}

      {/* Bottom control bar */}
      <footer className={styles.footer}>
        <div className={styles.controls}>
          {/* Voice recorder */}
          <div className={styles.voiceSection}>
            <VoiceRecorder
              onSnippetAdd={handleSnippetAdd}
              disabled={isGenerating}
              compact
            />
          </div>

          <div className={styles.inputSection}>
            <PromptInput onSubmit={handlePromptSubmit} disabled={isGenerating} />
          </div>
          <div className={styles.playSection}>
            <PlayButton size="medium" />
          </div>
        </div>

        {/* API warning */}
        {!isApiAvailable && (
          <div className={styles.apiWarning}>
            Set VITE_ANTHROPIC_API_KEY in .env to enable AI generation
          </div>
        )}
      </footer>

      {/* Error display */}
      <ErrorDisplay message={errorMessage} onDismiss={handleDismissError} />
    </div>
  )
}

export default App
