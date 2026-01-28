/**
 * ArrangementAgent - Specialized agent for musical arrangement commands
 *
 * Handles builds, drops, breakdowns, and transitions with musical awareness.
 * Works in coordination with PatternAgent for comprehensive pattern generation.
 *
 * @references AI-010, AI-011, AI-012, AI-013, FR-016, FR-017, FR-018
 */

import { isAnthropicAvailable, createChatCompletion } from './anthropic'
import {
  ARRANGEMENT_AGENT_SYSTEM_PROMPT,
  parseArrangementCommand,
  isArrangementCommand,
  createArrangementContext,
  createTimedArrangementPrompt,
  createInstantArrangementPrompt,
  type ArrangementIntent,
  type ArrangementCommand,
} from './prompts/arrangementAgent'
import { cleanPatternResponse } from './PatternAgent'
import { analyzePattern, generateStateSummary } from './MusicalStateAnalyzer'

export interface ArrangementAgentConfig {
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface ArrangementResult {
  pattern: string
  rawResponse: string
  intent: ArrangementIntent
  /** Pre-change pattern for reference */
  previousPattern: string
  /** Estimated energy level after change */
  estimatedEnergy: number
  /** Whether this is a timed transition */
  isTimed: boolean
  /** Duration in bars if timed */
  durationBars?: number
}

// Default configuration
const DEFAULT_CONFIG: Required<ArrangementAgentConfig> = {
  model: 'gpt-4o',
  maxTokens: 1024,
  temperature: 0.7, // Slightly lower temperature for more consistent arrangements
}

/**
 * Estimate energy level based on arrangement command
 */
function estimateResultingEnergy(
  currentEnergy: number,
  command: ArrangementCommand,
  intensity: 'subtle' | 'normal' | 'intense' = 'normal'
): number {
  const intensityMultiplier = {
    subtle: 0.7,
    normal: 1.0,
    intense: 1.3,
  }[intensity]

  switch (command) {
    case 'build':
      // Build increases energy toward 80-90
      return Math.min(100, currentEnergy + (90 - currentEnergy) * 0.6 * intensityMultiplier)

    case 'drop':
      // Drop goes to maximum energy
      return Math.min(100, 85 + 15 * intensityMultiplier)

    case 'breakdown':
      // Breakdown drops to low energy
      return Math.max(0, 15 + 10 * intensityMultiplier)

    case 'transition':
      // Transition maintains or slightly changes energy
      return currentEnergy

    case 'build_and_drop':
      // Ends at drop energy
      return Math.min(100, 85 + 15 * intensityMultiplier)

    default:
      return currentEnergy
  }
}

/**
 * ArrangementAgent class - handles arrangement-specific pattern transformations
 */
export class ArrangementAgent {
  private config: Required<ArrangementAgentConfig>
  private currentGenre: string | null = null

  constructor(config: ArrangementAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if the agent is ready
   */
  isAvailable(): boolean {
    return isAnthropicAvailable()
  }

  /**
   * Set the current genre context
   */
  setGenre(genre: string | null): void {
    this.currentGenre = genre
  }

  /**
   * Get the current genre
   */
  getGenre(): string | null {
    return this.currentGenre
  }

  /**
   * Check if a prompt is an arrangement command
   */
  isArrangementCommand(prompt: string): boolean {
    return isArrangementCommand(prompt)
  }

  /**
   * Parse an arrangement command from prompt
   */
  parseCommand(prompt: string): ArrangementIntent | null {
    return parseArrangementCommand(prompt)
  }

  /**
   * Execute an arrangement command on a pattern
   */
  async executeArrangement(
    prompt: string,
    currentPattern: string,
    options?: {
      currentEnergy?: number
      currentBpm?: number
      genre?: string
    }
  ): Promise<ArrangementResult> {
    if (!isAnthropicAvailable()) {
      throw new Error(
        'OpenAI API not available. Set VITE_OPENAI_API_KEY environment variable.'
      )
    }

    const intent = parseArrangementCommand(prompt)
    if (!intent) {
      throw new Error(`Could not parse arrangement command: ${prompt}`)
    }
    const genre = options?.genre || this.currentGenre || undefined

    // Analyze current pattern for context
    const patternState = analyzePattern(currentPattern)
    const currentEnergy = options?.currentEnergy ?? patternState.energyLevel
    const currentBpm = options?.currentBpm ?? 128

    // Build context
    const context = createArrangementContext(currentEnergy, currentBpm, genre)
    const stateSummary = generateStateSummary(patternState)

    // Create appropriate prompt based on whether it's timed
    let userMessage: string
    const isTimed = intent.duration !== undefined

    if (isTimed && intent.duration) {
      userMessage = createTimedArrangementPrompt(
        intent.command,
        intent.duration,
        currentPattern
      )
    } else {
      userMessage = createInstantArrangementPrompt(
        intent.command,
        currentPattern,
        intent.intensity
      )
    }

    // Add context
    userMessage = `${context}\nPattern analysis: ${stateSummary}\n\n${userMessage}`

    // Handle build_and_drop specially
    if (intent.command === 'build_and_drop' && intent.duration) {
      userMessage += `\n\nThis should build over ${intent.duration} bars and then be set up to drop. The pattern should peak at maximum buildable tension by the end.`
    }

    try {
      console.log('[ArrangementAgent] Executing:', intent.command)
      console.log('[ArrangementAgent] Duration:', intent.duration, 'bars')
      console.log('[ArrangementAgent] Intensity:', intent.intensity)

      const rawResponse = await createChatCompletion({
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: ARRANGEMENT_AGENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })

      const pattern = cleanPatternResponse(rawResponse)

      console.log('[ArrangementAgent] Generated pattern:', pattern)

      return {
        pattern,
        rawResponse,
        intent,
        previousPattern: currentPattern,
        estimatedEnergy: estimateResultingEnergy(
          currentEnergy,
          intent.command,
          intent.intensity
        ),
        isTimed,
        durationBars: intent.duration,
      }
    } catch (error) {
      const err = error as Error
      console.error('[ArrangementAgent] Generation failed:', err)
      throw err
    }
  }

  /**
   * Execute a build command
   */
  async build(
    currentPattern: string,
    options?: {
      durationBars?: number
      intensity?: 'subtle' | 'normal' | 'intense'
      currentEnergy?: number
      currentBpm?: number
    }
  ): Promise<ArrangementResult> {
    const durationPart = options?.durationBars
      ? ` for ${options.durationBars} bars`
      : ''
    const intensityPart = options?.intensity === 'intense'
      ? ' big'
      : options?.intensity === 'subtle'
        ? ' slow'
        : ''

    const prompt = `${intensityPart}build${durationPart}`.trim()

    return this.executeArrangement(prompt, currentPattern, {
      currentEnergy: options?.currentEnergy,
      currentBpm: options?.currentBpm,
    })
  }

  /**
   * Execute a drop command
   */
  async drop(
    currentPattern: string,
    options?: {
      intensity?: 'subtle' | 'normal' | 'intense'
      currentEnergy?: number
      currentBpm?: number
    }
  ): Promise<ArrangementResult> {
    const intensityPart = options?.intensity === 'intense'
      ? 'hard '
      : ''

    const prompt = `${intensityPart}drop`

    return this.executeArrangement(prompt, currentPattern, {
      currentEnergy: options?.currentEnergy,
      currentBpm: options?.currentBpm,
    })
  }

  /**
   * Execute a breakdown command
   */
  async breakdown(
    currentPattern: string,
    options?: {
      intensity?: 'subtle' | 'normal' | 'intense'
      currentEnergy?: number
      currentBpm?: number
    }
  ): Promise<ArrangementResult> {
    const intensityPart = options?.intensity === 'intense'
      ? 'full '
      : ''

    const prompt = `${intensityPart}breakdown`

    return this.executeArrangement(prompt, currentPattern, {
      currentEnergy: options?.currentEnergy,
      currentBpm: options?.currentBpm,
    })
  }

  /**
   * Execute a transition command
   */
  async transition(
    currentPattern: string,
    target: string,
    options?: {
      currentEnergy?: number
      currentBpm?: number
    }
  ): Promise<ArrangementResult> {
    const prompt = `transition to ${target}`

    return this.executeArrangement(prompt, currentPattern, {
      currentEnergy: options?.currentEnergy,
      currentBpm: options?.currentBpm,
    })
  }

  /**
   * Execute a build then drop sequence
   */
  async buildAndDrop(
    currentPattern: string,
    options?: {
      buildBars?: number
      currentEnergy?: number
      currentBpm?: number
    }
  ): Promise<ArrangementResult> {
    const barsPart = options?.buildBars
      ? ` for ${options.buildBars} bars`
      : ''

    const prompt = `build${barsPart} then drop`

    return this.executeArrangement(prompt, currentPattern, {
      currentEnergy: options?.currentEnergy,
      currentBpm: options?.currentBpm,
    })
  }

  /**
   * Get configuration
   */
  getConfig(): Required<ArrangementAgentConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ArrangementAgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let agentInstance: ArrangementAgent | null = null

export function getArrangementAgent(): ArrangementAgent {
  if (!agentInstance) {
    agentInstance = new ArrangementAgent()
  }
  return agentInstance
}

export function resetArrangementAgent(): void {
  agentInstance = null
}

// Re-export types
export type { ArrangementIntent, ArrangementCommand }
