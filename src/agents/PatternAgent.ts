/**
 * PatternAgent - AI agent that translates natural language to Strudel code
 *
 * Takes user prompts describing desired music vibes and generates
 * valid, playable Strudel patterns. Now integrates with ConversationManager
 * for context-aware generation.
 *
 * @references AI-001, AI-002, AI-003, AI-004, AI-005, AI-006, AI-007, AI-008, ARCH-002
 */

import { getAnthropicClient, isAnthropicAvailable } from './anthropic'
import {
  PATTERN_AGENT_SYSTEM_PROMPT,
  createEvolutionPrompt,
  createModificationPrompt,
  createMusicalContext,
  createConversationContextPrompt,
  analyzeModificationIntent,
  type ModificationIntent,
} from './prompts/patternAgent'
import { getConversationManager } from './ConversationManager'
import { analyzePattern, generateStateSummary } from './MusicalStateAnalyzer'

export interface PatternAgentConfig {
  model?: string
  maxTokens?: number
  temperature?: number
  /** Enable conversation context (default: true) */
  useConversationContext?: boolean
  /** Maximum conversation messages to include */
  maxContextMessages?: number
}

export interface GenerationResult {
  pattern: string
  rawResponse: string
  cleanedPattern: string
  /** Whether this was a modification of an existing pattern */
  isModification: boolean
  /** The prompt that was sent */
  prompt: string
  /** The modification intent if detected */
  modificationIntent?: ModificationIntent
}

export interface ModifyPatternOptions {
  /** The modification direction/command */
  direction: string
  /** Current BPM */
  bpm?: number
  /** Preserve core rhythm when modifying */
  preserveRhythm?: boolean
  /** Preserve existing layers when modifying */
  preserveLayers?: boolean
  /** Force complete regeneration (not incremental) */
  forceRegeneration?: boolean
}

// Default configuration
const DEFAULT_CONFIG: Required<PatternAgentConfig> = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  temperature: 0.8, // Higher temperature for more creative patterns
  useConversationContext: true,
  maxContextMessages: 6, // Last 3 exchanges
}

/**
 * Clean and parse AI response to extract pure Strudel code
 */
export function cleanPatternResponse(response: string): string {
  let cleaned = response.trim()

  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```(?:javascript|js|strudel)?\n?/gm, '')
  cleaned = cleaned.replace(/\n?```$/gm, '')

  // Remove any trailing explanatory text first
  // Look for common patterns that indicate explanation after code
  const explanationPatterns = [
    '\n\nThis ',
    '\n\nThe ',
    '\n\nI ',
    '\n\nNote:',
    '\n\nExplanation:',
    '\n\n---',
  ]

  for (const pattern of explanationPatterns) {
    const idx = cleaned.indexOf(pattern)
    if (idx !== -1) {
      cleaned = cleaned.slice(0, idx)
    }
  }

  // Find the FIRST valid Strudel function call to start the pattern
  // Priority order matters - stack/sequence should come before individual elements
  const strudelFunctions = [
    'stack(',
    'sequence(',
    's(',
    'sound(',
    'note(',
    'n(',
    'freq(',
    'silence',
  ]

  // Find the earliest occurrence of any Strudel function
  let earliestIndex = -1
  for (const func of strudelFunctions) {
    const idx = cleaned.indexOf(func)
    if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
      earliestIndex = idx
    }
  }

  // If we found a Strudel function and there's text before it
  if (earliestIndex > 0) {
    const beforeCode = cleaned.slice(0, earliestIndex)

    // Check if the text before looks like explanatory text (not code)
    // Look for patterns that indicate prose rather than code
    const looksLikeExplanation =
      beforeCode.includes(':') ||
      beforeCode.toLowerCase().includes('here') ||
      beforeCode.toLowerCase().includes('output') ||
      beforeCode.toLowerCase().includes('pattern') ||
      beforeCode.toLowerCase().includes('creates') ||
      /^[\w\s.,!?'"-]+$/.test(beforeCode.trim()) // Only letters, spaces, punctuation

    if (looksLikeExplanation) {
      cleaned = cleaned.slice(earliestIndex)
    }
  }

  return cleaned.trim()
}

/**
 * Validate that the cleaned response looks like valid Strudel code
 */
function looksLikeStrudelCode(code: string): boolean {
  if (!code || code.length < 5) return false

  // Must contain at least one Strudel function
  const hasStrudelFunction =
    /\b(s|sound|note|stack|sequence|n|freq|silence)\s*\(/.test(code) ||
    code.includes('silence')

  // Should not be mostly natural language
  const wordCount = code.split(/\s+/).length
  const parenCount = (code.match(/[()[\]{}]/g) || []).length

  // Code typically has more parens relative to words than natural language
  const seemsLikeCode = parenCount / Math.max(wordCount, 1) > 0.3

  return hasStrudelFunction || seemsLikeCode
}

/**
 * PatternAgent class - translates natural language to Strudel code
 */
export class PatternAgent {
  private config: Required<PatternAgentConfig>
  private lastPattern: string | null = null
  private conversationManager = getConversationManager()

  constructor(config: PatternAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if the agent is ready to generate patterns
   */
  isAvailable(): boolean {
    return isAnthropicAvailable()
  }

  /**
   * Get the conversation manager instance
   */
  getConversationManager() {
    return this.conversationManager
  }

  /**
   * Generate a Strudel pattern from a natural language prompt
   * Now uses conversation context for more coherent modifications (AI-007, AI-008)
   */
  async generatePattern(
    prompt: string,
    options?: {
      currentPattern?: string
      bpm?: number
      energyLevel?: number
      currentMood?: string
      /** Force fresh generation without conversation context */
      ignoreContext?: boolean
    }
  ): Promise<GenerationResult> {
    if (!isAnthropicAvailable()) {
      throw new Error(
        'Anthropic API not available. Set VITE_ANTHROPIC_API_KEY environment variable.'
      )
    }

    const client = getAnthropicClient()

    // EVOLUTION MODE ARCHITECTURE:
    // - First prompt (no currentPattern) = fresh generation, sets the vibe
    // - ALL subsequent prompts (with currentPattern) = evolution of existing pattern
    // This ensures we never lose the user's vibe - we always build on it
    const isEvolution = options?.currentPattern !== undefined && options.currentPattern !== null

    // Build the messages array for multi-turn conversation
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Include conversation context if enabled and not ignored (AI-007)
    if (this.config.useConversationContext && !options?.ignoreContext) {
      const contextMessages = this.conversationManager.getContextMessages(
        this.config.maxContextMessages
      )
      messages.push(...contextMessages)
    }

    // Build the current user message
    let userMessage = prompt

    // EVOLUTION MODE: If we have a current pattern, ALWAYS evolve it
    // The AI receives the current pattern + user's direction and returns an evolved version
    if (isEvolution && options?.currentPattern) {
      userMessage = createEvolutionPrompt(options.currentPattern, prompt)

      // Add musical context if available (helps AI understand current state)
      if (options?.bpm || options?.energyLevel || options?.currentMood) {
        const context = createMusicalContext(
          options.bpm || 128,
          options.energyLevel || 50,
          options.currentMood || 'neutral'
        )
        userMessage = `${context}\n\n${userMessage}`
      }
    } else {
      // FRESH GENERATION: First prompt, no existing pattern
      // Add musical context/state summary if available (AI-008)
      if (options?.bpm || options?.energyLevel || options?.currentMood) {
        const context = createMusicalContext(
          options.bpm || 128,
          options.energyLevel || 50,
          options.currentMood || 'neutral'
        )
        userMessage = `${context}\n\n${prompt}`
      }
    }

    // Add conversation context summary if we have history (for fresh generation)
    // Skip for evolution mode as the pattern itself provides context
    if (!isEvolution && this.config.useConversationContext && !options?.ignoreContext) {
      const conversationContext = createConversationContextPrompt(
        this.conversationManager.getContextString()
      )
      if (conversationContext) {
        userMessage = `${conversationContext}\n\n${userMessage}`
      }
    }

    // Add the current message
    messages.push({
      role: 'user',
      content: userMessage,
    })

    try {
      console.log('[PatternAgent] Generating pattern for:', prompt)
      console.log('[PatternAgent] Mode:', isEvolution ? 'EVOLUTION' : 'FRESH')
      console.log('[PatternAgent] Context messages:', messages.length - 1)

      const response = await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: PATTERN_AGENT_SYSTEM_PROMPT,
        messages,
      })

      // Extract text from response
      const rawResponse =
        response.content[0].type === 'text' ? response.content[0].text : ''

      console.log('[PatternAgent] Raw response:', rawResponse)

      // Clean the response
      const cleanedPattern = cleanPatternResponse(rawResponse)

      console.log('[PatternAgent] Cleaned pattern:', cleanedPattern)

      // Validate it looks like code
      if (!looksLikeStrudelCode(cleanedPattern)) {
        console.warn(
          '[PatternAgent] Response does not look like Strudel code:',
          cleanedPattern
        )
        // Return it anyway - the StrudelEngine will validate further
      }

      // Store as last pattern
      this.lastPattern = cleanedPattern

      // Add to conversation history
      this.conversationManager.addUserPrompt(prompt, {
        bpm: options?.bpm,
        energyLevel: options?.energyLevel,
        mood: options?.currentMood,
        isModification: isEvolution,
      })

      this.conversationManager.addAssistantResponse(
        isEvolution ? 'Evolved pattern based on direction.' : 'Generated fresh pattern.',
        cleanedPattern,
        {
          bpm: options?.bpm,
          energyLevel: options?.energyLevel,
          mood: options?.currentMood,
          isModification: isEvolution,
        }
      )

      return {
        pattern: cleanedPattern,
        rawResponse,
        cleanedPattern,
        isModification: isEvolution,
        prompt,
      }
    } catch (error) {
      const err = error as Error
      console.error('[PatternAgent] Generation failed:', err)

      // Provide a fallback pattern on error
      // In evolution mode, try to return the current pattern to preserve the vibe
      const fallbackPattern = isEvolution && options?.currentPattern
        ? options.currentPattern
        : this.getFallbackPattern(prompt)

      return {
        pattern: fallbackPattern,
        rawResponse: `Error: ${err.message}`,
        cleanedPattern: fallbackPattern,
        isModification: isEvolution,
        prompt,
      }
    }
  }

  /**
   * Modify an existing pattern incrementally (FR-009)
   *
   * This method is designed for making targeted modifications to an existing
   * pattern rather than regenerating from scratch. It preserves the core
   * structure while applying the requested changes.
   */
  async modifyPattern(
    currentPattern: string,
    options: ModifyPatternOptions
  ): Promise<GenerationResult> {
    const { direction, bpm, preserveRhythm = true, preserveLayers = true, forceRegeneration = false } = options

    // Analyze the modification intent
    const intent = analyzeModificationIntent(direction)
    console.log('[PatternAgent] Modification intent:', intent)

    // Analyze current pattern state
    const currentState = analyzePattern(currentPattern)
    const stateSummary = generateStateSummary(currentState)
    console.log('[PatternAgent] Current state:', stateSummary)

    // If force regeneration is requested, use generatePattern instead
    if (forceRegeneration) {
      console.log('[PatternAgent] Force regeneration requested')
      return this.generatePattern(direction, {
        currentPattern: undefined, // Don't pass pattern to trigger fresh generation
        bpm,
        energyLevel: currentState.energyLevel,
        currentMood: currentState.mood,
        ignoreContext: true, // Fresh start
      })
    }

    // Build the modification message with state context
    const modificationPrompt = createModificationPrompt(currentPattern, {
      preserveRhythm,
      preserveLayers,
    })

    // Add state summary for better context
    const stateContext = `Current pattern analysis: ${stateSummary}`

    // Build the full message
    const userMessage = `${stateContext}\n\n${modificationPrompt}\n\nDirection: ${direction}`

    // Use generatePattern but with explicit modification mode
    const result = await this.generatePattern(direction, {
      currentPattern,
      bpm,
      energyLevel: currentState.energyLevel,
      currentMood: currentState.mood,
    })

    // Add the modification intent to the result
    return {
      ...result,
      isModification: true,
      modificationIntent: intent,
    }
  }

  /**
   * Apply a quick modification preset (FR-008)
   * These are common modifications with predefined behaviors
   */
  async applyQuickModification(
    currentPattern: string,
    preset: 'darker' | 'brighter' | 'more_energy' | 'less_energy' | 'add_bass' | 'strip_back' | 'weirder',
    bpm?: number
  ): Promise<GenerationResult> {
    const presetDirections: Record<string, string> = {
      darker: 'make it darker and moodier - lower the filters, add more bass, use more reverb',
      brighter: 'make it brighter and more uplifting - open the filters, add crisp highs',
      more_energy: 'increase the energy - add more layers, faster subdivisions, stronger dynamics',
      less_energy: 'reduce the energy - strip back layers, softer dynamics, more space',
      add_bass: 'add more bass presence - deep sub frequencies, stronger low end',
      strip_back: 'strip it back to minimal - remove most elements, leave only essential rhythm',
      weirder: 'make it weirder and more experimental - add randomness, unusual rhythms, glitchy effects',
    }

    const direction = presetDirections[preset] || preset

    return this.modifyPattern(currentPattern, {
      direction,
      bpm,
      preserveRhythm: preset !== 'weirder',
      preserveLayers: preset !== 'strip_back',
    })
  }

  /**
   * Get a simple fallback pattern based on prompt keywords
   */
  private getFallbackPattern(prompt: string): string {
    const lowered = prompt.toLowerCase()

    // Match some basic vibes to fallback patterns
    if (lowered.includes('chill') || lowered.includes('relax')) {
      return `stack(
  s("bd ~ ~ bd ~ ~ bd ~").gain(0.7),
  s("~ ~ sd:3 ~").room(0.7).gain(0.5),
  s("hh*4").gain(0.3).lpf(2000)
).slow(1.2)`
    }

    if (lowered.includes('dark') || lowered.includes('heavy')) {
      return `stack(
  s("bd:3*2").gain(0.9),
  s("~ sd:5 ~ sd:5").room(0.3).gain(0.8),
  s("hh*8").gain(0.4).lpf(3000)
)`
    }

    if (lowered.includes('energy') || lowered.includes('hype')) {
      return `stack(
  s("bd*4").gain(0.9),
  s("~ sd ~ [sd sd]").gain(0.8),
  s("hh*16").gain(0.5).lpf(6000),
  s("~ ~ ~ cp").room(0.3)
)`
    }

    if (lowered.includes('dream') || lowered.includes('space')) {
      return `stack(
  s("bd ~ bd ~").gain(0.6).room(0.9),
  s("~ ~ sd ~").room(0.9).delay(0.5).gain(0.4),
  s("hh*4").lpf(1500).room(0.8).gain(0.3)
).slow(1.5)`
    }

    // Default fallback
    return `stack(
  s("bd sd:3 bd sd").gain(0.8),
  s("hh*8").gain(0.4).lpf(4000)
)`
  }

  /**
   * Get the last generated pattern
   */
  getLastPattern(): string | null {
    return this.lastPattern
  }

  /**
   * Clear conversation context and history
   */
  clearContext(): void {
    this.conversationManager.clear()
    this.lastPattern = null
  }

  /**
   * Get conversation summary
   */
  getConversationSummary() {
    return this.conversationManager.getSummary()
  }

  /**
   * Check if a prompt is a modification request
   */
  isModificationRequest(prompt: string): boolean {
    return this.conversationManager.isModificationRequest(prompt)
  }

  /**
   * Get current model configuration
   */
  getConfig(): Required<PatternAgentConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PatternAgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let agentInstance: PatternAgent | null = null

export function getPatternAgent(): PatternAgent {
  if (!agentInstance) {
    agentInstance = new PatternAgent()
  }
  return agentInstance
}

export function resetPatternAgent(): void {
  if (agentInstance) {
    agentInstance.clearContext()
  }
  agentInstance = null
}
