# Vibe Conductor - API Reference

This document provides comprehensive documentation for all public APIs, interfaces, and hooks in Vibe Conductor.

---

## Table of Contents

1. [StrudelEngine](#strudelengine)
2. [PatternAgent](#patternagent)
3. [ConversationManager](#conversationmanager)
4. [React Hooks](#react-hooks)
5. [Zustand Store](#zustand-store)
6. [Utility Functions](#utility-functions)
7. [Types Reference](#types-reference)

---

## StrudelEngine

The core audio engine wrapper for Strudel. Handles Web Audio context lifecycle, pattern evaluation, playback control, and graceful degradation via fallback patterns.

**Location:** `@/engine/StrudelEngine.ts`

### Importing

```typescript
import {
  StrudelEngine,
  getStrudelEngine,
  validatePattern
} from '@/engine'
```

### Class: StrudelEngine

#### Constructor

```typescript
const engine = new StrudelEngine()
```

Creates a new StrudelEngine instance. The constructor is minimal - initialization happens on first user interaction.

#### Methods

##### initialize()

```typescript
async initialize(): Promise<void>
```

Initializes the audio engine. Must be called on user interaction to comply with browser autoplay policies.

**Example:**
```typescript
const engine = getStrudelEngine()
await engine.initialize()
console.log('Engine ready:', engine.isReady())
```

##### play()

```typescript
async play(): Promise<void>
```

Starts audio playback. Automatically initializes if not ready.

**Example:**
```typescript
await engine.play()
```

##### stop()

```typescript
stop(): void
```

Stops audio playback immediately.

##### toggle()

```typescript
async toggle(): Promise<void>
```

Toggles between play and stop states.

##### updatePattern(code)

```typescript
async updatePattern(code: string): Promise<boolean>
```

Updates the current pattern with seamless hot-reload. Returns `true` on success, `false` on validation failure.

**Parameters:**
- `code` - Strudel pattern code string

**Example:**
```typescript
const success = await engine.updatePattern(`
  stack(
    s("bd sd bd sd").gain(0.8),
    s("hh*8").gain(0.4)
  )
`)
if (!success) {
  console.log('Pattern validation failed')
}
```

##### setBPM(bpm)

```typescript
setBPM(bpm: number): void
```

Sets the tempo. Clamped to 60-180 BPM range.

**Parameters:**
- `bpm` - Beats per minute (60-180)

##### getBPM()

```typescript
getBPM(): number
```

Returns the current BPM.

##### isPlaying()

```typescript
isPlaying(): boolean
```

Returns `true` if audio is currently playing.

##### isReady()

```typescript
isReady(): boolean
```

Returns `true` if the engine is initialized and ready.

##### getAudioContext()

```typescript
getAudioContext(): AudioContext | null
```

Returns the Web Audio AudioContext for advanced use (visualizers, etc.).

##### getAnalyserNode()

```typescript
getAnalyserNode(): AnalyserNode | null
```

Returns the AnalyserNode connected to audio output for visualization.

##### onStateChange(listener)

```typescript
onStateChange(listener: (state: StrudelEngineState) => void): () => void
```

Subscribes to engine state changes. Returns an unsubscribe function.

**Example:**
```typescript
const unsubscribe = engine.onStateChange((state) => {
  console.log('Playing:', state.isPlaying)
  console.log('BPM:', state.bpm)
})

// Later, to unsubscribe:
unsubscribe()
```

##### getState()

```typescript
getState(): StrudelEngineState
```

Returns a copy of the current engine state.

##### setFallbackPattern(pattern)

```typescript
setFallbackPattern(pattern: string): void
```

Sets the fallback pattern used when pattern evaluation fails.

##### clearError()

```typescript
clearError(): void
```

Clears the current error state.

##### dispose()

```typescript
async dispose(): Promise<void>
```

Releases all resources. Call when cleaning up.

### Singleton Access

```typescript
import { getStrudelEngine, resetStrudelEngine } from '@/engine'

// Get singleton instance
const engine = getStrudelEngine()

// Reset singleton (disposes and creates new instance)
resetStrudelEngine()
```

### validatePattern(code)

```typescript
function validatePattern(code: string): ValidationResult
```

Validates a Strudel pattern code string before execution.

**Parameters:**
- `code` - Pattern code to validate

**Returns:** `ValidationResult`

**Example:**
```typescript
import { validatePattern } from '@/engine'

const result = validatePattern('s("bd sd").fast(2)')
if (result.valid) {
  console.log('Pattern is valid')
} else {
  console.error(result.error?.message)
  console.log('Suggestion:', result.error?.suggestion)
}
```

---

## PatternAgent

AI agent that translates natural language prompts into Strudel code patterns.

**Location:** `@/agents/PatternAgent.ts`

### Importing

```typescript
import {
  PatternAgent,
  getPatternAgent,
  cleanPatternResponse
} from '@/agents'
```

### Class: PatternAgent

#### Constructor

```typescript
const agent = new PatternAgent(config?: PatternAgentConfig)
```

**PatternAgentConfig:**
```typescript
interface PatternAgentConfig {
  model?: string           // Claude model ID (default: 'claude-sonnet-4-20250514')
  maxTokens?: number       // Max response tokens (default: 1024)
  temperature?: number     // Creativity (default: 0.8)
  useConversationContext?: boolean  // Enable context (default: true)
  maxContextMessages?: number       // Max history messages (default: 6)
}
```

#### Methods

##### generatePattern(prompt, options?)

```typescript
async generatePattern(
  prompt: string,
  options?: {
    currentPattern?: string
    bpm?: number
    energyLevel?: number
    currentMood?: string
    ignoreContext?: boolean
  }
): Promise<GenerationResult>
```

Generates a Strudel pattern from a natural language prompt.

**Parameters:**
- `prompt` - Natural language description
- `options.currentPattern` - Current pattern for modifications
- `options.bpm` - Current BPM for context
- `options.energyLevel` - Current energy (0-100)
- `options.currentMood` - Current mood descriptor
- `options.ignoreContext` - Force fresh generation

**Returns:** `GenerationResult`

**Example:**
```typescript
const agent = getPatternAgent()

// Simple generation
const result = await agent.generatePattern('chill and spacey')
console.log(result.pattern)

// With context
const result2 = await agent.generatePattern('make it darker', {
  currentPattern: result.pattern,
  bpm: 110,
  energyLevel: 40
})
```

##### modifyPattern(currentPattern, options)

```typescript
async modifyPattern(
  currentPattern: string,
  options: ModifyPatternOptions
): Promise<GenerationResult>
```

Modifies an existing pattern incrementally.

**ModifyPatternOptions:**
```typescript
interface ModifyPatternOptions {
  direction: string          // Modification direction/command
  bpm?: number               // Current BPM
  preserveRhythm?: boolean   // Keep core rhythm (default: true)
  preserveLayers?: boolean   // Keep existing layers (default: true)
  forceRegeneration?: boolean // Force complete regeneration
}
```

**Example:**
```typescript
const result = await agent.modifyPattern(currentPattern, {
  direction: 'add more bass and make it darker',
  bpm: 128,
  preserveRhythm: true
})
```

##### applyQuickModification(currentPattern, preset, bpm?)

```typescript
async applyQuickModification(
  currentPattern: string,
  preset: 'darker' | 'brighter' | 'more_energy' | 'less_energy' |
          'add_bass' | 'strip_back' | 'weirder',
  bpm?: number
): Promise<GenerationResult>
```

Applies a predefined modification preset.

**Example:**
```typescript
const result = await agent.applyQuickModification(
  currentPattern,
  'darker',
  128
)
```

##### isAvailable()

```typescript
isAvailable(): boolean
```

Returns `true` if the Anthropic API is configured.

##### clearContext()

```typescript
clearContext(): void
```

Clears conversation history and context.

##### getLastPattern()

```typescript
getLastPattern(): string | null
```

Returns the last generated pattern.

##### getConversationSummary()

```typescript
getConversationSummary(): ConversationSummary
```

Returns a summary of the conversation history.

##### getConfig()

```typescript
getConfig(): Required<PatternAgentConfig>
```

Returns the current configuration.

##### updateConfig(updates)

```typescript
updateConfig(updates: Partial<PatternAgentConfig>): void
```

Updates the agent configuration.

### cleanPatternResponse(response)

```typescript
function cleanPatternResponse(response: string): string
```

Cleans AI response text to extract pure Strudel code.

---

## ConversationManager

Manages conversation history for contextual AI responses.

**Location:** `@/agents/ConversationManager.ts`

### Importing

```typescript
import {
  ConversationManager,
  getConversationManager
} from '@/agents'
```

### Class: ConversationManager

#### Constructor

```typescript
const manager = new ConversationManager(config?: Partial<ConversationManagerConfig>)
```

**ConversationManagerConfig:**
```typescript
interface ConversationManagerConfig {
  maxHistoryLength: number   // Max messages (default: 20)
  maxTokenEstimate: number   // Max tokens (default: 4000)
}
```

#### Methods

##### addUserPrompt(content, metadata?)

```typescript
addUserPrompt(content: string, metadata?: ConversationEntry['metadata']): void
```

Adds a user prompt to history.

##### addAssistantResponse(content, resultingPattern, metadata?)

```typescript
addAssistantResponse(
  content: string,
  resultingPattern: string,
  metadata?: ConversationEntry['metadata']
): void
```

Adds an assistant response with the generated pattern.

##### getHistory()

```typescript
getHistory(): ConversationEntry[]
```

Returns the full conversation history.

##### getRecentHistory(count)

```typescript
getRecentHistory(count: number): ConversationEntry[]
```

Returns the last N entries.

##### getContextMessages(maxMessages?)

```typescript
getContextMessages(maxMessages?: number): Array<{ role: 'user' | 'assistant'; content: string }>
```

Returns messages formatted for Claude API.

##### getSummary()

```typescript
getSummary(): ConversationSummary
```

Returns conversation summary with stats.

##### getLastPattern()

```typescript
getLastPattern(): string | null
```

Returns the most recent pattern.

##### isModificationRequest(prompt)

```typescript
isModificationRequest(prompt: string): boolean
```

Detects if a prompt is a modification request.

**Example:**
```typescript
manager.isModificationRequest('make it darker') // true
manager.isModificationRequest('chill vibes')    // false
```

##### clear()

```typescript
clear(): void
```

Clears all history.

##### export() / import(data)

```typescript
export(): string
import(data: string): void
```

Serializes/deserializes history for persistence.

---

## React Hooks

### useStrudel

Hook for interacting with the Strudel audio engine.

**Location:** `@/hooks/useStrudel.ts`

```typescript
import { useStrudel } from '@/hooks'

function MyComponent() {
  const {
    // State
    isPlaying,
    isReady,
    currentBPM,
    error,
    audioContextState,

    // Actions
    play,
    stop,
    toggle,
    updatePattern,
    setBPM,
    initialize,
    clearError,
    getAudioContext,
    getAnalyserNode
  } = useStrudel()

  return (
    <button onClick={toggle}>
      {isPlaying ? 'Stop' : 'Play'}
    </button>
  )
}
```

**Return Type:**
```typescript
interface UseStrudelReturn {
  // State
  isPlaying: boolean
  isReady: boolean
  currentBPM: number
  error: string | null
  audioContextState: string

  // Actions
  play: () => Promise<void>
  stop: () => void
  toggle: () => Promise<void>
  updatePattern: (code: string) => Promise<boolean>
  setBPM: (bpm: number) => void
  initialize: () => Promise<void>
  clearError: () => void
  getAudioContext: () => AudioContext | null
  getAnalyserNode: () => AnalyserNode | null
}
```

### usePatternAgent

Hook for AI pattern generation.

**Location:** `@/hooks/usePatternAgent.ts`

```typescript
import { usePatternAgent } from '@/hooks'

function PromptInput() {
  const {
    isGenerating,
    isAvailable,
    error,
    lastPattern,
    lastResult,
    generatePattern,
    clearContext,
    clearError
  } = usePatternAgent()

  const handleSubmit = async (prompt: string) => {
    const result = await generatePattern(prompt)
    if (result) {
      console.log('Generated:', result.pattern)
    }
  }

  return (
    <div>
      {isGenerating && <span>Generating...</span>}
      {error && <span>{error}</span>}
    </div>
  )
}
```

**Return Type:**
```typescript
interface UsePatternAgentReturn {
  isGenerating: boolean
  isAvailable: boolean
  error: string | null
  lastPattern: string | null
  lastResult: GenerationResult | null
  generatePattern: (prompt: string) => Promise<GenerationResult | null>
  clearContext: () => void
  clearError: () => void
}
```

### useEnergy

Hook for energy level tracking.

**Location:** `@/hooks/useEnergy.ts`

```typescript
import { useEnergy, useEnergyLevel, useEnergyDisplay } from '@/hooks'

// Full energy state
const { energy, trend, category, updateFromPattern } = useEnergy()

// Just the level (0-100)
const level = useEnergyLevel()

// Display values (formatted)
const { level, trend, color, dots } = useEnergyDisplay()
```

### useTiming

Hook for bar-based timing and scheduling.

**Location:** `@/hooks/useTiming.ts`

```typescript
import { useTiming, useTimingState, useScheduledChanges } from '@/hooks'

const {
  bpm,
  currentBar,
  currentBeat,
  isRunning,
  scheduleChange,
  scheduleAtNextBar,
  cancelScheduled
} = useTiming()

// Just the timing state
const { currentBar, currentBeat, barDuration } = useTimingState()

// Just scheduled changes
const changes = useScheduledChanges()
```

### useVibeTheme

Hook for vibe-based dynamic theming.

**Location:** `@/hooks/useVibeTheme.ts`

```typescript
import { useVibeTheme, detectVibe } from '@/hooks'

const {
  currentVibe,
  colors,
  setVibe,
  applyTheme
} = useVibeTheme()

// Manual vibe detection
const vibe = detectVibe('dark and moody techno')
// Returns: 'dark'
```

**VibeType:** `'neutral' | 'dark' | 'bright' | 'dreamy' | 'aggressive' | 'chill'`

---

## Zustand Store

Centralized state management using Zustand.

**Location:** `@/store/index.ts`

### Importing

```typescript
import {
  useStore,
  useCurrentPattern,
  useIsPlaying,
  useBPM,
  usePlaybackStatus,
  useError,
  useAppStatus
} from '@/store'
```

### State Shape

```typescript
interface AppState {
  // Pattern state
  currentPattern: string | null
  isPlaying: boolean
  bpm: number
  playbackStatus: 'stopped' | 'playing' | 'generating'
  error: string | null

  // UI state
  isFirstTime: boolean
  isEngineReady: boolean
  isApiAvailable: boolean
  currentPrompt: string

  // Conversation and History
  conversationHistory: ConversationEntry[]
  patternHistory: PatternHistoryEntry[]
  patternHistoryIndex: number
  savedSnapshots: Snapshot[]
  activePromptIndex: number

  // UI Panel states
  isSnapshotPanelOpen: boolean
  isHistoryVisible: boolean
}
```

### Actions

#### Pattern Actions

```typescript
const setPattern = useStore(state => state.setPattern)
setPattern('s("bd sd")')

const setPlaying = useStore(state => state.setPlaying)
setPlaying(true)

const setBPM = useStore(state => state.setBPM)
setBPM(128)

const setStatus = useStore(state => state.setStatus)
setStatus('generating')
```

#### History Actions

```typescript
const pushPatternHistory = useStore(state => state.pushPatternHistory)
pushPatternHistory({ pattern: 's("bd")', prompt: 'bass', timestamp: Date.now() })

const undoPattern = useStore(state => state.undoPattern)
const previous = undoPattern() // Returns previous pattern entry or null

const redoPattern = useStore(state => state.redoPattern)
const next = redoPattern() // Returns next pattern entry or null

const canUndo = useStore(state => state.canUndo)
const canRedo = useStore(state => state.canRedo)
```

#### Snapshot Actions

```typescript
const addSnapshot = useStore(state => state.addSnapshot)
addSnapshot({ id: 'snap1', name: 'My Vibe', pattern: '...', bpm: 128 })

const removeSnapshot = useStore(state => state.removeSnapshot)
removeSnapshot('snap1')

const updateSnapshot = useStore(state => state.updateSnapshot)
updateSnapshot('snap1', { name: 'New Name' })
```

### Selector Hooks

Pre-built selector hooks for common state slices:

```typescript
// Individual selectors
const pattern = useCurrentPattern()
const isPlaying = useIsPlaying()
const bpm = useBPM()
const status = usePlaybackStatus()
const error = useError()
const isFirstTime = useIsFirstTime()

// Combined selectors
const appStatus = useAppStatus()
// Returns: { isPlaying, playbackStatus, isEngineReady, isApiAvailable, error }

const historyState = useHistoryState()
// Returns: { patternHistory, patternHistoryIndex, canUndo, canRedo }

const promptHistoryState = usePromptHistoryState()
// Returns: { conversationHistory, activePromptIndex, playbackStatus, isHistoryVisible }
```

### Persistence

The store automatically persists to localStorage:
- `savedSnapshots`
- `bpm`
- `isHistoryVisible`

---

## Utility Functions

### validatePattern

Validates Strudel pattern syntax.

```typescript
import { validatePattern } from '@/engine'

const result = validatePattern(code)
// { valid: true } or { valid: false, error: { message, line?, suggestion? } }
```

### Browser Utilities

```typescript
import {
  detectBrowser,
  supportsFeature,
  createCompatibleAudioContext,
  checkCompatibility
} from '@/utils/browser'

const browser = detectBrowser() // 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown'

const hasWorklet = supportsFeature('audioWorklet')

const audioContext = createCompatibleAudioContext()

const { compatible, missingFeatures } = checkCompatibility()
```

### Pattern History

```typescript
import { getPatternHistory } from '@/utils'

const history = getPatternHistory()
history.push({ pattern: '...', timestamp: Date.now() })
const previous = history.undo()
const next = history.redo()
```

### Snapshot Manager

```typescript
import { getSnapshotManager } from '@/utils'

const manager = getSnapshotManager()
manager.saveSnapshot({ name: 'My Vibe', pattern: '...', bpm: 128 })
const snapshots = manager.getAllSnapshots()
manager.loadSnapshot('snapshot-id')
manager.deleteSnapshot('snapshot-id')
```

---

## Types Reference

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean
  error?: {
    message: string
    line?: number
    suggestion?: string
  }
}
```

### StrudelEngineState

```typescript
interface StrudelEngineState {
  isPlaying: boolean
  isReady: boolean
  currentPattern: string | null
  fallbackPattern: string | null
  bpm: number
  audioContextState: 'suspended' | 'running' | 'closed' | 'uninitialized'
  error: string | null
}
```

### GenerationResult

```typescript
interface GenerationResult {
  pattern: string
  rawResponse: string
  cleanedPattern: string
  isModification: boolean
  prompt: string
  modificationIntent?: ModificationIntent
}
```

### ConversationEntry

```typescript
interface ConversationEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  resultingPattern?: string
  metadata?: {
    bpm?: number
    energyLevel?: number
    mood?: string
    isModification?: boolean
  }
}
```

### ConversationSummary

```typescript
interface ConversationSummary {
  messageCount: number
  promptCount: number
  patternCount: number
  recentVibes: string[]
  sessionDurationMinutes: number
}
```

### Snapshot

```typescript
interface Snapshot {
  id: string
  name: string
  pattern: string
  bpm: number
  timestamp: number
  tags?: string[]
}
```

### PatternHistoryEntry

```typescript
interface PatternHistoryEntry {
  pattern: string
  prompt?: string
  timestamp: number
}
```

### PlaybackStatus

```typescript
type PlaybackStatus = 'stopped' | 'playing' | 'generating'
```

### LayerType

```typescript
type LayerType = 'drums' | 'bass' | 'synth' | 'fx'
```

### VibeType

```typescript
type VibeType = 'neutral' | 'dark' | 'bright' | 'dreamy' | 'aggressive' | 'chill'
```

### GenreType

```typescript
type GenreType = 'house' | 'techno' | 'dnb' | 'dubstep' | 'tropical' | 'ambient' | 'downtempo'
```

---

## Error Handling

All async operations may throw errors. Best practices:

```typescript
try {
  const result = await agent.generatePattern('chill vibes')
  await engine.updatePattern(result.pattern)
  await engine.play()
} catch (error) {
  console.error('Operation failed:', error)
  // The engine maintains the current pattern on failure
}
```

The StrudelEngine implements graceful degradation:
- Invalid patterns do not interrupt playback
- Fallback patterns are used when current pattern fails
- Error states are tracked and can be cleared

---

## See Also

- [Developer Setup Guide](./DEVELOPER_SETUP.md)
- [Browser Compatibility](./BROWSER_COMPATIBILITY.md)
