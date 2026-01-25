/**
 * StrudelEngine - Core audio engine wrapper for Strudel
 *
 * Handles Web Audio context lifecycle, pattern evaluation and playback,
 * pattern validation, and graceful degradation via fallback patterns.
 */

import { webaudioRepl } from '@strudel/webaudio'
import { evalScope, controls } from '@strudel/core'
import * as strudelCore from '@strudel/core'
import { miniAllStrings } from '@strudel/mini'
import * as strudelMini from '@strudel/mini'
import * as strudelWebaudio from '@strudel/webaudio'

// Import from superdough for sample and synth registration
// @ts-expect-error - superdough lacks TypeScript definitions
import { registerSynthSounds, samples } from 'superdough'

// Types
export interface ValidationResult {
  valid: boolean
  error?: {
    message: string
    line?: number
    suggestion?: string
  }
}

export type AudioContextState = 'suspended' | 'running' | 'closed' | 'uninitialized'

export interface StrudelEngineState {
  isPlaying: boolean
  isReady: boolean
  currentPattern: string | null
  fallbackPattern: string | null
  bpm: number
  audioContextState: AudioContextState
  error: string | null
}

// Strudel function whitelist for pattern validation
const STRUDEL_FUNCTIONS = new Set([
  // Sound and samples
  's',
  'sound',
  'n',
  'note',
  'freq',
  'bank',
  'samples',

  // Pattern manipulation
  'stack',
  'sequence',
  'seq',
  'cat',
  'fastcat',
  'slowcat',
  'timeCat',
  'polymeter',
  'polyrhythm',
  'pure',
  'silence',
  'hush',

  // Time manipulation
  'fast',
  'slow',
  'early',
  'late',
  'hurry',
  'rev',
  'palindrome',
  'every',
  'when',
  'rarely',
  'sometimes',
  'often',
  'almostNever',
  'almostAlways',

  // Structure
  'euclid',
  'euclidRot',
  'struct',
  'mask',
  'arp',
  'chunk',
  'loopAt',
  'segment',
  'run',
  'irand',
  'rand',
  'choose',
  'chooseWith',
  'wchoose',
  'degradeBy',
  'degrade',
  'shuffle',
  'scramble',

  // Effects and filters
  'gain',
  'velocity',
  'pan',
  'room',
  'size',
  'delay',
  'delaytime',
  'delayfeedback',
  'orbit',
  'lpf',
  'hpf',
  'bpf',
  'lpq',
  'hpq',
  'bpq',
  'cutoff',
  'resonance',
  'vowel',
  'shape',
  'distort',
  'crush',
  'coarse',
  'phaser',
  'phaserrate',
  'phaserdepth',

  // Envelope and modulation
  'attack',
  'decay',
  'sustain',
  'release',
  'adsr',
  'hold',

  // Pitch and tuning
  'transpose',
  'add',
  'sub',
  'mul',
  'div',
  'mod',
  'range',
  'rangex',
  'scale',
  'scaleTranspose',
  'octave',

  // Time-based
  'cps',
  'setcps',
  'setCps',
  'cpm',
  'setcpm',
  'setCpm',
  'speed',
  'begin',
  'end',
  'cut',
  'clip',
  'loop',
  'unit',

  // Layering
  'layer',
  'superimpose',
  'off',
  'jux',
  'juxBy',
  'stut',
  'echo',

  // Conditionals and variation
  'almostNever',
  'almostAlways',
  'never',
  'always',
  'firstOf',
  'lastOf',

  // Mini notation helpers
  'm',
  'mini',
  'h',

  // Pattern state
  'p',
  'd1',
  'd2',
  'd3',
  'd4',
  'd5',
  'd6',
  'd7',
  'd8',
  'd9',

  // Utility
  'log',
  'print',
  'withState',

  // Additional controls
  'legato',
  'sustain',
  'ccn',
  'ccv',
  'channel',
])

// Default fallback pattern - simple, always valid
const DEFAULT_FALLBACK_PATTERN = `s("bd sd:3 bd sd:1").gain(0.8)`

/**
 * Validates a Strudel pattern code string
 */
export function validatePattern(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      error: {
        message: 'Pattern code is empty or invalid',
        suggestion: 'Provide a valid Strudel pattern string',
      },
    }
  }

  const trimmed = code.trim()
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: {
        message: 'Pattern code is empty',
        suggestion: 'Provide a non-empty pattern',
      },
    }
  }

  // Check for basic JavaScript syntax errors
  try {
    // Wrap in a function to check syntax without executing
    new Function(`return (async () => { return ${trimmed} })`)
  } catch (syntaxError) {
    const error = syntaxError as Error
    const lineMatch = error.message.match(/line (\d+)/i)
    return {
      valid: false,
      error: {
        message: `Syntax error: ${error.message}`,
        line: lineMatch ? parseInt(lineMatch[1]) : undefined,
        suggestion: 'Check for missing parentheses, brackets, or quotes',
      },
    }
  }

  // Extract function calls and check against whitelist
  const functionCallRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
  let match
  const unknownFunctions: string[] = []

  while ((match = functionCallRegex.exec(trimmed)) !== null) {
    const funcName = match[1]
    // Skip if it's a known Strudel function or a common JS construct
    if (
      !STRUDEL_FUNCTIONS.has(funcName) &&
      !['async', 'await', 'function', 'return', 'if', 'else', 'for', 'while'].includes(funcName)
    ) {
      unknownFunctions.push(funcName)
    }
  }

  if (unknownFunctions.length > 0) {
    return {
      valid: false,
      error: {
        message: `Unknown function(s): ${unknownFunctions.join(', ')}`,
        suggestion: `Use valid Strudel functions like s(), sound(), fast(), slow()`,
      },
    }
  }

  return { valid: true }
}

/**
 * StrudelEngine class - manages audio playback and pattern evaluation
 */
export class StrudelEngine {
  private repl: ReturnType<typeof webaudioRepl> | null = null
  private audioContext: AudioContext | null = null
  private analyserNode: AnalyserNode | null = null
  private state: StrudelEngineState = {
    isPlaying: false,
    isReady: false,
    currentPattern: null,
    fallbackPattern: DEFAULT_FALLBACK_PATTERN,
    bpm: 128,
    audioContextState: 'uninitialized',
    error: null,
  }
  private stateListeners: Set<(state: StrudelEngineState) => void> = new Set()
  private initPromise: Promise<void> | null = null

  constructor() {
    // Constructor is minimal - initialization happens on user interaction
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: StrudelEngineState) => void): () => void {
    this.stateListeners.add(listener)
    // Immediately call with current state
    listener(this.getState())
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  private notifyListeners() {
    const currentState = this.getState()
    this.stateListeners.forEach(listener => listener(currentState))
  }

  private updateState(updates: Partial<StrudelEngineState>) {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  /**
   * Get current engine state
   */
  getState(): StrudelEngineState {
    return { ...this.state }
  }

  /**
   * Initialize the audio engine - must be called on user interaction
   */
  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise
    }

    // Already initialized
    if (this.state.isReady && this.audioContext?.state === 'running') {
      return Promise.resolve()
    }

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      // Initialize mini notation string parsing
      miniAllStrings()

      // Register synthesizer sounds (sine, sawtooth, triangle, square, etc.)
      registerSynthSounds()

      // Load default drum samples from Strudel's GitHub samples
      // This loads the Dirt-Samples which include bd, sd, hh, cp, etc.
      const samplePromise = samples('github:tidalcycles/Dirt-Samples/master')

      // Don't await - let samples load in background
      samplePromise.catch((err: Error) => {
        console.warn('[StrudelEngine] Sample loading error (non-fatal):', err.message)
      })

      // Load all Strudel functions into global scope for pattern evaluation
      // This includes: stack, s, note, sound, gain, etc.
      await evalScope(
        strudelCore,
        strudelMini,
        strudelWebaudio,
        controls
      )

      // Create audio context
      this.audioContext = new AudioContext()

      // Create analyser node for visualizers
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 2048
      this.analyserNode.smoothingTimeConstant = 0.8

      // Connect analyser to destination for monitoring
      this.analyserNode.connect(this.audioContext.destination)

      // Handle audio context state changes
      this.audioContext.onstatechange = () => {
        this.updateState({
          audioContextState: (this.audioContext?.state || 'closed') as AudioContextState,
        })
      }

      // Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Create the Strudel REPL
      // Note: webaudioRepl doesn't support destinationNode option,
      // analyser is connected in parallel to destination for visualization
      this.repl = webaudioRepl({
        audioContext: this.audioContext,
        onToggle: (started: boolean) => {
          this.updateState({ isPlaying: started })
        },
        onEvalError: (error: Error) => {
          console.error('[StrudelEngine] Eval error:', error)
          this.handlePatternError(error)
        },
      } as Parameters<typeof webaudioRepl>[0])

      // Set initial BPM (CPS = BPM / 60 / 4 for 4/4 time)
      this.setBPM(this.state.bpm)

      this.updateState({
        isReady: true,
        audioContextState: this.audioContext.state as AudioContextState,
        error: null,
      })

      console.log('[StrudelEngine] Initialized successfully')
    } catch (error) {
      const err = error as Error
      console.error('[StrudelEngine] Initialization failed:', err)
      this.updateState({
        isReady: false,
        error: `Initialization failed: ${err.message}`,
      })
      this.initPromise = null
      throw error
    }
  }

  /**
   * Handle pattern evaluation errors with graceful degradation
   */
  private handlePatternError(error: Error) {
    console.warn('[StrudelEngine] Pattern error, maintaining current pattern:', error.message)
    this.updateState({
      error: `Pattern error: ${error.message}`,
    })
    // Current pattern continues playing - no action needed
  }

  /**
   * Start playback
   */
  async play(): Promise<void> {
    if (!this.state.isReady) {
      await this.initialize()
    }

    if (!this.repl) {
      throw new Error('Engine not initialized')
    }

    // Resume audio context if suspended
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }

    // If we have a pattern, play it
    if (this.state.currentPattern) {
      try {
        await this.repl.evaluate(this.state.currentPattern, true)
      } catch {
        // If current pattern fails, try fallback
        if (this.state.fallbackPattern) {
          console.warn('[StrudelEngine] Current pattern failed, using fallback')
          await this.repl.evaluate(this.state.fallbackPattern, true)
        }
      }
    } else if (this.state.fallbackPattern) {
      // No current pattern, use fallback
      await this.repl.evaluate(this.state.fallbackPattern, true)
      this.updateState({ currentPattern: this.state.fallbackPattern })
    }

    this.repl.start()
    this.updateState({ isPlaying: true })
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (!this.repl) return

    this.repl.stop()
    this.updateState({ isPlaying: false })
  }

  /**
   * Toggle play/stop
   */
  async toggle(): Promise<void> {
    if (this.state.isPlaying) {
      this.stop()
    } else {
      await this.play()
    }
  }

  /**
   * Update the current pattern with seamless hot-reload
   */
  async updatePattern(code: string): Promise<boolean> {
    // Validate pattern first
    const validation = validatePattern(code)
    if (!validation.valid) {
      console.warn('[StrudelEngine] Invalid pattern:', validation.error?.message)
      this.updateState({
        error: validation.error?.message || 'Invalid pattern',
      })
      return false
    }

    // Initialize if needed
    if (!this.state.isReady) {
      await this.initialize()
    }

    if (!this.repl) {
      throw new Error('Engine not initialized')
    }

    try {
      // Store the current pattern as fallback before attempting update
      if (this.state.currentPattern) {
        this.updateState({ fallbackPattern: this.state.currentPattern })
      }

      // Evaluate the new pattern
      // shouldHush=false for seamless transition on next beat boundary
      await this.repl.evaluate(code, this.state.isPlaying)

      // Update state with new pattern
      this.updateState({
        currentPattern: code,
        error: null,
      })

      console.log('[StrudelEngine] Pattern updated successfully')
      return true
    } catch (error) {
      const err = error as Error
      console.error('[StrudelEngine] Pattern update failed:', err)

      // Graceful degradation - keep current pattern playing
      this.updateState({
        error: `Pattern error: ${err.message}`,
      })

      // If we were playing, try to recover with fallback
      if (this.state.isPlaying && this.state.fallbackPattern) {
        try {
          await this.repl.evaluate(this.state.fallbackPattern, true)
        } catch {
          // Even fallback failed - very unusual
          console.error('[StrudelEngine] Even fallback pattern failed')
        }
      }

      return false
    }
  }

  /**
   * Set BPM (60-180 range, default 128)
   */
  setBPM(bpm: number): void {
    // Clamp to valid range
    const clampedBpm = Math.max(60, Math.min(180, bpm))

    // Convert BPM to CPS (cycles per second)
    // In 4/4 time, one cycle = 4 beats, so CPS = BPM / 60 / 4
    const cps = clampedBpm / 60 / 4

    if (this.repl) {
      this.repl.setCps(cps)
    }

    this.updateState({ bpm: clampedBpm })
  }

  /**
   * Get current BPM
   */
  getBPM(): number {
    return this.state.bpm
  }

  /**
   * Check if engine is playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.state.isReady
  }

  /**
   * Get the AudioContext (for visualizers, etc.)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  /**
   * Get the AnalyserNode (for visualizers)
   */
  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode
  }

  /**
   * Set fallback pattern
   */
  setFallbackPattern(pattern: string): void {
    const validation = validatePattern(pattern)
    if (validation.valid) {
      this.updateState({ fallbackPattern: pattern })
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.updateState({ error: null })
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    this.stop()

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close()
    }

    this.repl = null
    this.audioContext = null
    this.initPromise = null
    this.stateListeners.clear()

    this.updateState({
      isReady: false,
      isPlaying: false,
      audioContextState: 'closed',
    })
  }
}

// Singleton instance for convenience
let engineInstance: StrudelEngine | null = null

export function getStrudelEngine(): StrudelEngine {
  if (!engineInstance) {
    engineInstance = new StrudelEngine()
  }
  return engineInstance
}

export function resetStrudelEngine(): void {
  if (engineInstance) {
    engineInstance.dispose()
    engineInstance = null
  }
}
