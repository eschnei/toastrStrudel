/**
 * ConductorAgent - High-level orchestrator for multi-agent pattern generation
 *
 * The Conductor interprets user prompts at a high level and delegates to
 * specialist agents (Drums, Bass, Synth, FX) to create layered, cohesive
 * musical patterns. It coordinates responses and merges outputs.
 *
 * @references Section 8.5 Multi-Agent Architecture, Phase 4 Tasks
 */

import { isAnthropicAvailable, createChatCompletion } from './anthropic'
import { cleanPatternResponse } from './PatternAgent'
import { analyzePattern, generateStateSummary } from './MusicalStateAnalyzer'
import type { MusicalState } from './MusicalStateAnalyzer'
import type { AgentMessage, AgentContext, AgentResponse } from './specialists/types'

export interface ConductorAgentConfig {
  model?: string
  maxTokens?: number
  temperature?: number
  /** Enable parallel agent execution (default: true) */
  parallelExecution?: boolean
  /** Timeout for specialist agents in ms (default: 30000) */
  specialistTimeout?: number
}

export interface LayerAssignment {
  drums: boolean
  bass: boolean
  synth: boolean
  fx: boolean
}

export interface ConductorPlan {
  /** Interpreted intention from the prompt */
  intention: string
  /** Which layers should be generated/modified */
  layers: LayerAssignment
  /** Shared musical context for all agents */
  context: AgentContext
  /** Specific instructions for each layer */
  layerInstructions: {
    drums?: string
    bass?: string
    synth?: string
    fx?: string
  }
  /** Overall energy target (0-100) */
  targetEnergy: number
  /** Key/scale if specified */
  key?: string
  scale?: string
}

export interface ConductorResult {
  /** The merged final pattern (all layers stacked) */
  pattern: string
  /** Individual layer patterns */
  layers: {
    drums?: string
    bass?: string
    synth?: string
    fx?: string
  }
  /** The plan that was executed */
  plan: ConductorPlan
  /** Results from each specialist */
  specialistResults: {
    drums?: AgentResponse
    bass?: AgentResponse
    synth?: AgentResponse
    fx?: AgentResponse
  }
  /** Any errors that occurred */
  errors: string[]
  /** Whether all requested layers succeeded */
  success: boolean
}

// Default configuration
const DEFAULT_CONFIG: Required<ConductorAgentConfig> = {
  model: 'gpt-4o',
  maxTokens: 1024,
  temperature: 0.7,
  parallelExecution: true,
  specialistTimeout: 30000,
}

// System prompt for the Conductor's planning phase
const CONDUCTOR_SYSTEM_PROMPT = `You are the Conductor, a high-level music orchestrator for an AI-powered music generation system.

Your role is to interpret user prompts and create a plan for specialist agents (Drums, Bass, Synth, FX) to execute.

When given a user prompt, you must output a JSON object with:
1. "intention" - A brief summary of what the user wants
2. "layers" - Which layers to generate: { drums: boolean, bass: boolean, synth: boolean, fx: boolean }
3. "targetEnergy" - Target energy level 0-100 based on the vibe
4. "key" - Musical key if specified or inferred (e.g., "C", "Am", "F#m")
5. "scale" - Scale type (e.g., "minor", "major", "phrygian", "dorian")
6. "layerInstructions" - Specific instructions for each active layer

INTERPRETATION GUIDELINES:

Energy/Vibe Mapping:
- "chill", "relaxed", "ambient" -> targetEnergy: 20-35, favor synth/fx, sparse drums
- "groovy", "bouncy", "fun" -> targetEnergy: 50-65, all layers active
- "energetic", "hype", "powerful" -> targetEnergy: 75-90, full drums, strong bass
- "dark", "moody", "atmospheric" -> targetEnergy: 30-50, heavy bass/fx, subtle drums
- "heavy", "aggressive", "intense" -> targetEnergy: 85-100, all layers maxed

Layer Selection:
- Minimal/sparse vibes: drums + one melodic element
- Full vibes: all layers
- Atmospheric: synth + fx, optional light drums
- Driving/rhythmic: drums + bass primary
- Melodic: synth primary, supportive drums/bass

Key/Scale Inference:
- Dark/moody -> minor keys (Am, Dm, Em)
- Bright/happy -> major keys (C, G, D)
- Mysterious/ethereal -> modal scales (Dorian, Phrygian)
- Aggressive/tense -> minor with chromatic elements

Output ONLY valid JSON. No explanations or markdown.

Example output:
{
  "intention": "Create a dark, driving techno pattern",
  "layers": { "drums": true, "bass": true, "synth": true, "fx": true },
  "targetEnergy": 75,
  "key": "Am",
  "scale": "minor",
  "layerInstructions": {
    "drums": "Four-on-the-floor kick with industrial hi-hats, snare on 2 and 4",
    "bass": "Deep pulsing bass following root notes, occasional octave jumps",
    "synth": "Dark stabby chords, filtered and evolving",
    "fx": "Subtle risers and sweeps for tension"
  }
}`

/**
 * Parse the Conductor's plan from JSON response
 */
function parseConductorPlan(response: string, currentBpm: number): ConductorPlan | null {
  try {
    // Clean response in case of markdown
    let cleaned = response.trim()
    cleaned = cleaned.replace(/^```(?:json)?\n?/gm, '')
    cleaned = cleaned.replace(/\n?```$/gm, '')

    const parsed = JSON.parse(cleaned)

    return {
      intention: parsed.intention || 'Generate pattern',
      layers: {
        drums: parsed.layers?.drums ?? true,
        bass: parsed.layers?.bass ?? true,
        synth: parsed.layers?.synth ?? false,
        fx: parsed.layers?.fx ?? false,
      },
      context: {
        bpm: currentBpm,
        key: parsed.key || 'Am',
        scale: parsed.scale || 'minor',
        energyLevel: parsed.targetEnergy || 50,
        genre: parsed.genre,
      },
      layerInstructions: {
        drums: parsed.layerInstructions?.drums,
        bass: parsed.layerInstructions?.bass,
        synth: parsed.layerInstructions?.synth,
        fx: parsed.layerInstructions?.fx,
      },
      targetEnergy: parsed.targetEnergy || 50,
      key: parsed.key,
      scale: parsed.scale,
    }
  } catch (error) {
    console.error('[ConductorAgent] Failed to parse plan:', error)
    return null
  }
}

/**
 * Merge individual layer patterns into a cohesive stack
 */
function mergeLayerPatterns(layers: {
  drums?: string
  bass?: string
  synth?: string
  fx?: string
}): string {
  const validLayers = Object.entries(layers)
    .filter(([, pattern]) => pattern && pattern.trim().length > 0)
    .map(([, pattern]) => pattern!.trim())

  if (validLayers.length === 0) {
    return 's("bd sd:3 bd sd:1").gain(0.8)' // Fallback
  }

  if (validLayers.length === 1) {
    return validLayers[0]
  }

  // Stack all layers together
  // Clean each pattern - remove trailing semicolons and wrap if needed
  const cleanedLayers = validLayers.map(pattern => {
    let cleaned = pattern.trim()
    if (cleaned.endsWith(';')) {
      cleaned = cleaned.slice(0, -1)
    }
    // If pattern doesn't start with a function call, wrap it
    if (!cleaned.match(/^[a-zA-Z_$]/)) {
      cleaned = `(${cleaned})`
    }
    return cleaned
  })

  return `stack(\n  ${cleanedLayers.join(',\n  ')}\n)`
}

/**
 * ConductorAgent class - orchestrates multi-agent pattern generation
 */
export class ConductorAgent {
  private config: Required<ConductorAgentConfig>
  private specialists: Map<string, {
    generate: (message: AgentMessage, context: AgentContext) => Promise<AgentResponse>
  }> = new Map()
  private currentPlan: ConductorPlan | null = null

  constructor(config: ConductorAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if the agent is ready
   */
  isAvailable(): boolean {
    return isAnthropicAvailable()
  }

  /**
   * Register a specialist agent
   */
  registerSpecialist(
    name: 'drums' | 'bass' | 'synth' | 'fx',
    agent: {
      generate: (message: AgentMessage, context: AgentContext) => Promise<AgentResponse>
    }
  ): void {
    this.specialists.set(name, agent)
  }

  /**
   * Check if all required specialists are registered
   */
  hasAllSpecialists(): boolean {
    return (
      this.specialists.has('drums') &&
      this.specialists.has('bass') &&
      this.specialists.has('synth') &&
      this.specialists.has('fx')
    )
  }

  /**
   * Get the current plan
   */
  getCurrentPlan(): ConductorPlan | null {
    return this.currentPlan
  }

  /**
   * Create a plan from a user prompt
   */
  async createPlan(
    prompt: string,
    options?: {
      currentPattern?: string
      currentBpm?: number
      currentEnergy?: number
    }
  ): Promise<ConductorPlan> {
    if (!isAnthropicAvailable()) {
      throw new Error('OpenAI API not available')
    }

    const currentBpm = options?.currentBpm || 128

    // Analyze current pattern if provided
    let patternContext = ''
    if (options?.currentPattern) {
      const analysis = analyzePattern(options.currentPattern)
      const summary = generateStateSummary(analysis)
      patternContext = `\n\nCurrent pattern analysis: ${summary}\nCurrent energy: ${options.currentEnergy ?? analysis.energyLevel}`
    }

    const userMessage = `Create a plan for this request: "${prompt}"${patternContext}\n\nCurrent BPM: ${currentBpm}`

    try {
      console.log('[ConductorAgent] Creating plan for:', prompt)

      const rawResponse = await createChatCompletion({
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: CONDUCTOR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })

      console.log('[ConductorAgent] Plan response:', rawResponse)

      const plan = parseConductorPlan(rawResponse, currentBpm)

      if (!plan) {
        // Create a default plan if parsing failed
        return this.createDefaultPlan(prompt, currentBpm)
      }

      this.currentPlan = plan
      return plan
    } catch (error) {
      console.error('[ConductorAgent] Plan creation failed:', error)
      return this.createDefaultPlan(prompt, currentBpm)
    }
  }

  /**
   * Create a default plan when AI planning fails
   */
  private createDefaultPlan(prompt: string, bpm: number): ConductorPlan {
    const lowered = prompt.toLowerCase()

    // Infer layers from prompt
    const layers: LayerAssignment = {
      drums: true,
      bass: lowered.includes('bass') || !lowered.includes('no drums'),
      synth: lowered.includes('synth') || lowered.includes('pad') || lowered.includes('lead'),
      fx: lowered.includes('fx') || lowered.includes('atmosphere') || lowered.includes('ambient'),
    }

    // Infer energy
    let targetEnergy = 50
    if (lowered.match(/chill|relax|calm|soft/)) targetEnergy = 30
    if (lowered.match(/energy|hype|hard|heavy|intense/)) targetEnergy = 80
    if (lowered.match(/dark|moody/)) targetEnergy = 45

    return {
      intention: prompt,
      layers,
      context: {
        bpm,
        key: 'Am',
        scale: 'minor',
        energyLevel: targetEnergy,
      },
      layerInstructions: {
        drums: 'Create drums matching the vibe',
        bass: 'Create bass matching the vibe',
        synth: 'Create synth/pad matching the vibe',
        fx: 'Add subtle atmosphere and effects',
      },
      targetEnergy,
      key: 'Am',
      scale: 'minor',
    }
  }

  /**
   * Execute a plan by delegating to specialist agents
   */
  async executePlan(plan: ConductorPlan): Promise<ConductorResult> {
    const results: ConductorResult = {
      pattern: '',
      layers: {},
      plan,
      specialistResults: {},
      errors: [],
      success: true,
    }

    const layersToGenerate: Array<'drums' | 'bass' | 'synth' | 'fx'> = []

    if (plan.layers.drums) layersToGenerate.push('drums')
    if (plan.layers.bass) layersToGenerate.push('bass')
    if (plan.layers.synth) layersToGenerate.push('synth')
    if (plan.layers.fx) layersToGenerate.push('fx')

    console.log('[ConductorAgent] Generating layers:', layersToGenerate)

    // Create messages for each specialist
    const agentTasks = layersToGenerate.map(async (layer) => {
      const specialist = this.specialists.get(layer)

      if (!specialist) {
        console.warn(`[ConductorAgent] No specialist registered for ${layer}`)
        results.errors.push(`No specialist for ${layer}`)
        return { layer, success: false }
      }

      const message: AgentMessage = {
        type: 'generate',
        prompt: plan.layerInstructions[layer] || `Generate ${layer} pattern`,
        context: plan.context,
      }

      try {
        const response = await Promise.race([
          specialist.generate(message, plan.context),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout generating ${layer}`)),
              this.config.specialistTimeout
            )
          ),
        ])

        results.specialistResults[layer] = response
        results.layers[layer] = response.pattern

        return { layer, success: response.success, pattern: response.pattern }
      } catch (error) {
        const err = error as Error
        console.error(`[ConductorAgent] ${layer} generation failed:`, err)
        results.errors.push(`${layer}: ${err.message}`)
        return { layer, success: false }
      }
    })

    // Execute in parallel or sequentially based on config
    if (this.config.parallelExecution) {
      await Promise.all(agentTasks)
    } else {
      for (const task of agentTasks) {
        await task
      }
    }

    // Merge results
    results.pattern = mergeLayerPatterns(results.layers)
    results.success = results.errors.length === 0

    console.log('[ConductorAgent] Final merged pattern:', results.pattern)

    return results
  }

  /**
   * Generate a complete pattern from a user prompt
   * This is the main entry point combining planning and execution
   */
  async generate(
    prompt: string,
    options?: {
      currentPattern?: string
      currentBpm?: number
      currentEnergy?: number
    }
  ): Promise<ConductorResult> {
    // Create plan
    const plan = await this.createPlan(prompt, options)

    // Execute plan
    return this.executePlan(plan)
  }

  /**
   * Modify an existing pattern based on a prompt
   */
  async modify(
    prompt: string,
    currentPattern: string,
    options?: {
      currentBpm?: number
      currentEnergy?: number
      /** Only modify specified layers */
      targetLayers?: Array<'drums' | 'bass' | 'synth' | 'fx'>
    }
  ): Promise<ConductorResult> {
    // Analyze current pattern
    const analysis = analyzePattern(currentPattern)

    // Create a modification-focused plan
    const plan = await this.createPlan(`Modify the current pattern: ${prompt}`, {
      currentPattern,
      currentBpm: options?.currentBpm || 128,
      currentEnergy: options?.currentEnergy || analysis.energyLevel,
    })

    // If target layers specified, override plan
    if (options?.targetLayers) {
      plan.layers = {
        drums: options.targetLayers.includes('drums'),
        bass: options.targetLayers.includes('bass'),
        synth: options.targetLayers.includes('synth'),
        fx: options.targetLayers.includes('fx'),
      }
    }

    // Execute the plan
    return this.executePlan(plan)
  }

  /**
   * Get configuration
   */
  getConfig(): Required<ConductorAgentConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ConductorAgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let conductorInstance: ConductorAgent | null = null

export function getConductorAgent(): ConductorAgent {
  if (!conductorInstance) {
    conductorInstance = new ConductorAgent()
  }
  return conductorInstance
}

export function resetConductorAgent(): void {
  conductorInstance = null
}
