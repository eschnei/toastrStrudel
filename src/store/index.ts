/**
 * Zustand Store - Centralized State Management
 *
 * Manages application state including:
 * - Current pattern and playback status
 * - BPM and audio state
 * - Error handling
 * - First-time user state
 * - Phase 2: Conversation history, pattern history, snapshots
 *
 * @references Section 6.4 State Management
 */

import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import type { ConversationEntry } from '@/agents/ConversationManager'
import type { Snapshot } from '@/utils/SnapshotManager'

// Playback status types
export type PlaybackStatus = 'stopped' | 'playing' | 'generating'

// Pattern history entry for undo/redo
export interface PatternHistoryEntry {
  pattern: string
  prompt?: string
  timestamp: number
}

// Application state interface
export interface AppState {
  // Pattern state
  currentPattern: string | null
  isPlaying: boolean
  bpm: number
  playbackStatus: PlaybackStatus
  error: string | null

  // UI state
  isFirstTime: boolean
  isEngineReady: boolean
  isApiAvailable: boolean

  // Current prompt
  currentPrompt: string

  // Phase 2: Conversation and History
  conversationHistory: ConversationEntry[]
  patternHistory: PatternHistoryEntry[]
  patternHistoryIndex: number
  savedSnapshots: Snapshot[]
  activePromptIndex: number

  // UI Panel states
  isSnapshotPanelOpen: boolean
  isHistoryVisible: boolean

  // Actions
  setPattern: (pattern: string | null) => void
  setPlaying: (playing: boolean) => void
  setBPM: (bpm: number) => void
  setStatus: (status: PlaybackStatus) => void
  setError: (error: string | null) => void
  setFirstTime: (isFirstTime: boolean) => void
  setEngineReady: (ready: boolean) => void
  setApiAvailable: (available: boolean) => void
  setCurrentPrompt: (prompt: string) => void
  clearError: () => void
  reset: () => void

  // Phase 2: Conversation actions
  addConversationEntry: (entry: ConversationEntry) => void
  clearConversationHistory: () => void
  setConversationHistory: (history: ConversationEntry[]) => void

  // Phase 2: Pattern history actions
  pushPatternHistory: (entry: PatternHistoryEntry) => void
  undoPattern: () => PatternHistoryEntry | null
  redoPattern: () => PatternHistoryEntry | null
  canUndo: () => boolean
  canRedo: () => boolean
  clearPatternHistory: () => void

  // Phase 2: Snapshot actions
  addSnapshot: (snapshot: Snapshot) => void
  removeSnapshot: (id: string) => void
  updateSnapshot: (id: string, updates: Partial<Snapshot>) => void
  setSavedSnapshots: (snapshots: Snapshot[]) => void

  // Phase 2: UI actions
  setActivePromptIndex: (index: number) => void
  setSnapshotPanelOpen: (open: boolean) => void
  setHistoryVisible: (visible: boolean) => void
}

// Default BPM as per requirements
const DEFAULT_BPM = 128

// Maximum pattern history depth
const MAX_PATTERN_HISTORY = 20

// Initial state
const initialState = {
  currentPattern: null as string | null,
  isPlaying: false,
  bpm: DEFAULT_BPM,
  playbackStatus: 'stopped' as PlaybackStatus,
  error: null as string | null,
  isFirstTime: true,
  isEngineReady: false,
  isApiAvailable: false,
  currentPrompt: '',

  // Phase 2: Conversation and History
  conversationHistory: [] as ConversationEntry[],
  patternHistory: [] as PatternHistoryEntry[],
  patternHistoryIndex: -1,
  savedSnapshots: [] as Snapshot[],
  activePromptIndex: -1,

  // UI Panel states
  isSnapshotPanelOpen: false,
  isHistoryVisible: true,
}

/**
 * Main application store
 */
export const useStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        ...initialState,

        // Actions
        setPattern: (pattern: string | null) =>
          set({
            currentPattern: pattern,
            isFirstTime: false, // User has submitted at least one prompt
          }),

        setPlaying: (playing: boolean) =>
          set({
            isPlaying: playing,
            playbackStatus: playing ? 'playing' : 'stopped',
          }),

        setBPM: (bpm: number) =>
          set({
            // Clamp BPM to valid range (60-180)
            bpm: Math.max(60, Math.min(180, bpm)),
          }),

        setStatus: (status: PlaybackStatus) =>
          set({
            playbackStatus: status,
            // Also update isPlaying based on status
            isPlaying: status === 'playing',
          }),

        setError: (error: string | null) => set({ error }),

        setFirstTime: (isFirstTime: boolean) => set({ isFirstTime }),

        setEngineReady: (ready: boolean) => set({ isEngineReady: ready }),

        setApiAvailable: (available: boolean) => set({ isApiAvailable: available }),

        setCurrentPrompt: (prompt: string) => set({ currentPrompt: prompt }),

        clearError: () => set({ error: null }),

        reset: () =>
          set({
            ...initialState,
            // Preserve engine/API ready state
            isEngineReady: get().isEngineReady,
            isApiAvailable: get().isApiAvailable,
            // Preserve saved snapshots
            savedSnapshots: get().savedSnapshots,
          }),

        // Phase 2: Conversation actions
        addConversationEntry: (entry: ConversationEntry) =>
          set(state => ({
            conversationHistory: [...state.conversationHistory, entry].slice(-50), // Keep last 50
          })),

        clearConversationHistory: () =>
          set({ conversationHistory: [], activePromptIndex: -1 }),

        setConversationHistory: (history: ConversationEntry[]) =>
          set({ conversationHistory: history }),

        // Phase 2: Pattern history actions
        pushPatternHistory: (entry: PatternHistoryEntry) =>
          set(state => {
            // Clear any redo history when pushing new pattern
            const history = state.patternHistory.slice(0, state.patternHistoryIndex + 1)
            const newHistory = [...history, entry].slice(-MAX_PATTERN_HISTORY)
            return {
              patternHistory: newHistory,
              patternHistoryIndex: newHistory.length - 1,
            }
          }),

        undoPattern: () => {
          const state = get()
          if (state.patternHistoryIndex <= 0) return null

          const newIndex = state.patternHistoryIndex - 1
          set({ patternHistoryIndex: newIndex })
          return state.patternHistory[newIndex]
        },

        redoPattern: () => {
          const state = get()
          if (state.patternHistoryIndex >= state.patternHistory.length - 1) return null

          const newIndex = state.patternHistoryIndex + 1
          set({ patternHistoryIndex: newIndex })
          return state.patternHistory[newIndex]
        },

        canUndo: () => get().patternHistoryIndex > 0,

        canRedo: () => {
          const state = get()
          return state.patternHistoryIndex < state.patternHistory.length - 1
        },

        clearPatternHistory: () =>
          set({ patternHistory: [], patternHistoryIndex: -1 }),

        // Phase 2: Snapshot actions
        addSnapshot: (snapshot: Snapshot) =>
          set(state => ({
            savedSnapshots: [...state.savedSnapshots, snapshot],
          })),

        removeSnapshot: (id: string) =>
          set(state => ({
            savedSnapshots: state.savedSnapshots.filter(s => s.id !== id),
          })),

        updateSnapshot: (id: string, updates: Partial<Snapshot>) =>
          set(state => ({
            savedSnapshots: state.savedSnapshots.map(s =>
              s.id === id ? { ...s, ...updates } : s
            ),
          })),

        setSavedSnapshots: (snapshots: Snapshot[]) =>
          set({ savedSnapshots: snapshots }),

        // Phase 2: UI actions
        setActivePromptIndex: (index: number) =>
          set({ activePromptIndex: index }),

        setSnapshotPanelOpen: (open: boolean) =>
          set({ isSnapshotPanelOpen: open }),

        setHistoryVisible: (visible: boolean) =>
          set({ isHistoryVisible: visible }),
      }),
      {
        name: 'vibe-conductor-store',
        // Only persist certain fields
        partialize: (state) => ({
          savedSnapshots: state.savedSnapshots,
          bpm: state.bpm,
          isHistoryVisible: state.isHistoryVisible,
        }),
      }
    )
  )
)

// Selector hooks for common state slices
export const useCurrentPattern = () => useStore(state => state.currentPattern)
export const useIsPlaying = () => useStore(state => state.isPlaying)
export const useBPM = () => useStore(state => state.bpm)
export const usePlaybackStatus = () => useStore(state => state.playbackStatus)
export const useError = () => useStore(state => state.error)
export const useIsFirstTime = () => useStore(state => state.isFirstTime)
export const useIsEngineReady = () => useStore(state => state.isEngineReady)
export const useIsApiAvailable = () => useStore(state => state.isApiAvailable)
export const useCurrentPrompt = () => useStore(state => state.currentPrompt)

// Phase 2: Selector hooks for conversation and history
export const useConversationHistory = () => useStore(state => state.conversationHistory)
export const usePatternHistory = () => useStore(state => state.patternHistory)
export const usePatternHistoryIndex = () => useStore(state => state.patternHistoryIndex)
export const useSavedSnapshots = () => useStore(state => state.savedSnapshots)
export const useActivePromptIndex = () => useStore(state => state.activePromptIndex)
export const useIsSnapshotPanelOpen = () => useStore(state => state.isSnapshotPanelOpen)
export const useIsHistoryVisible = () => useStore(state => state.isHistoryVisible)

// Phase 2: Combined history state
export const useHistoryState = () =>
  useStore(state => ({
    patternHistory: state.patternHistory,
    patternHistoryIndex: state.patternHistoryIndex,
    canUndo: state.patternHistoryIndex > 0,
    canRedo: state.patternHistoryIndex < state.patternHistory.length - 1,
  }))

// Combined status for UI
export const useAppStatus = () =>
  useStore(state => ({
    isPlaying: state.isPlaying,
    playbackStatus: state.playbackStatus,
    isEngineReady: state.isEngineReady,
    isApiAvailable: state.isApiAvailable,
    error: state.error,
  }))

// Phase 2: Combined state for prompt history display
export const usePromptHistoryState = () =>
  useStore(state => ({
    conversationHistory: state.conversationHistory,
    activePromptIndex: state.activePromptIndex,
    playbackStatus: state.playbackStatus,
    isHistoryVisible: state.isHistoryVisible,
  }))

/**
 * PERF-002: Optimized selectors using shallow equality
 *
 * These selectors use Zustand's subscribeWithSelector for fine-grained
 * updates. Components only re-render when their specific slice changes.
 */

// Shallow comparison helper for arrays
const shallowArrayEqual = <T>(a: T[], b: T[]): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

// Optimized playback selector - only re-renders for playback changes
export const usePlaybackState = () =>
  useStore(
    state => ({
      isPlaying: state.isPlaying,
      playbackStatus: state.playbackStatus,
    }),
    (a, b) => a.isPlaying === b.isPlaying && a.playbackStatus === b.playbackStatus
  )

// Optimized engine state - only for engine-related updates
export const useEngineState = () =>
  useStore(
    state => ({
      isEngineReady: state.isEngineReady,
      isApiAvailable: state.isApiAvailable,
    }),
    (a, b) => a.isEngineReady === b.isEngineReady && a.isApiAvailable === b.isApiAvailable
  )

// Optimized snapshot selector with shallow array comparison
export const useSnapshotsOptimized = () =>
  useStore(
    state => state.savedSnapshots,
    shallowArrayEqual
  )

// Get store actions without causing re-renders (actions are stable)
export const useStoreActions = () =>
  useStore(state => ({
    setPattern: state.setPattern,
    setPlaying: state.setPlaying,
    setBPM: state.setBPM,
    setStatus: state.setStatus,
    setError: state.setError,
    clearError: state.clearError,
    pushPatternHistory: state.pushPatternHistory,
    undoPattern: state.undoPattern,
    redoPattern: state.redoPattern,
  }))
