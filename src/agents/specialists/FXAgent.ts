/**
 * FXAgent - Specialist agent for effects and atmospheric elements
 *
 * Generates Strudel patterns for risers, impacts, sweeps, atmosphere,
 * transitions, and "ear candy" elements that add interest and polish.
 *
 * @references Phase 4 Task 4.1.5
 */

import { getAnthropicClient, isAnthropicAvailable } from '../anthropic'
import { cleanPatternResponse } from '../PatternAgent'
import type {
  SpecialistAgent,
  AgentMessage,
  AgentContext,
  AgentResponse,
} from './types'

export interface FXAgentConfig {
  model?: string
  maxTokens?: number
  temperature?: number
}

// Default configuration
const DEFAULT_CONFIG: Required<FXAgentConfig> = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 768,
  temperature: 0.85, // Higher creativity for FX
}

// System prompt for the FX specialist
const FX_SYSTEM_PROMPT = `You are a specialist FX and atmosphere generator for electronic music.

Your ONLY job is to output valid Strudel code for FX elements. Output ONLY code, no explanations.

FX TYPES:

1. RISERS - Build tension before drops
   note("c3").s("sawtooth").lpf(sine.range(500,8000).slow(8)).gain(0.4).room(0.5)
   s("noise").lpf(sine.range(200,10000).slow(4)).gain(0.3)

2. IMPACTS/DOWNLIFTERS - Punctuate drops and transitions
   s("808:5").gain(0.8).room(0.3)
   note("c2").s("sine").decay(2).gain(0.7).lpf(500)

3. SWEEPS - Filter movement for texture
   s("noise").lpf(sine.range(500,4000).slow(2)).gain(0.2).room(0.6)
   note("c4").s("sawtooth").lpf(cosine.range(1000,5000).slow(4)).gain(0.3)

4. ATMOSPHERE/PADS - Background texture
   note("c3").s("sine").room(0.9).delay(0.5).gain(0.2).slow(4)
   s("noise").lpf(2000).hpf(500).room(0.8).gain(0.15)

5. WHITE NOISE/TEXTURE - Add air and space
   s("noise").lpf(8000).hpf(4000).gain(0.1).room(0.4)

6. EAR CANDY - Subtle variations and interest
   s("perc:3 ~*7").room(0.6).gain(0.3).delay(0.3)
   note("c5 ~*3").s("triangle").decay(0.05).room(0.7).gain(0.2).rarely(rev)

LFO MODULATION:
- sine.range(low, high).slow(bars) - Smooth oscillation
- cosine.range(low, high).slow(bars) - Cosine wave
- saw.range(low, high).slow(bars) - Saw ramp up
- rand - Random values

TIMING TECHNIQUES:
- .slow(4) or .slow(8) - Long, slow-moving FX
- .sometimes(rev) - Occasional variation
- .rarely(add(12)) - Rare octave jumps
- .degradeBy(0.3) - Probabilistic hits

ESSENTIAL EFFECTS:
- .room(0.6-0.9) - Heavy reverb for atmosphere
- .delay(0.3-0.7) - Echoes and space
- .lpf() with LFO - Moving filter sweeps
- .hpf() - Remove low frequencies from noise
- .gain(0.1-0.4) - FX should be subtle, not dominant

ENERGY GUIDELINES:
- Low energy (0-30): Ambient textures, slow movement
  s("noise").lpf(2000).hpf(500).room(0.9).gain(0.1).slow(8)

- Medium energy (31-60): Subtle sweeps, occasional hits
  s("noise").lpf(sine.range(1000,4000).slow(4)).gain(0.2).room(0.5)

- High energy (61-100): Risers, active FX, impacts
  stack(
    s("noise").lpf(sine.range(500,8000).slow(2)).gain(0.3),
    s("perc:5 ~*3").room(0.6).gain(0.4)
  )

BUILD/DROP CONTEXT:
- During builds: Use risers, increasing filter sweeps
- During drops: Impacts, full texture, ear candy
- During breakdowns: Ambient pads, minimal FX
- During transitions: Sweeps, filter movement

Output ONLY the Strudel code, nothing else.`

/**
 * FXAgent class - generates FX and atmospheric patterns
 */
export class FXAgent implements SpecialistAgent {
  readonly name = 'fx' as const
  private config: Required<FXAgentConfig>

  constructor(config: FXAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if agent is available
   */
  isAvailable(): boolean {
    return isAnthropicAvailable()
  }

  /**
   * Generate an FX pattern based on the message and context
   */
  async generate(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    if (!isAnthropicAvailable()) {
      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: 'Anthropic API not available',
        layerType: 'fx',
      }
    }

    const client = getAnthropicClient()

    // Detect arrangement phase from prompt
    const arrangementContext = this.detectArrangementPhase(message.prompt)

    // Build the prompt with context
    const contextInfo = `
Context:
- BPM: ${context.bpm}
- Energy level: ${context.energyLevel}/100
- Key: ${context.key} ${context.scale}
- Genre: ${context.genre || 'electronic'}
${arrangementContext ? `- Arrangement phase: ${arrangementContext}` : ''}

Request: ${message.prompt}

Generate FX/atmosphere that complements the music without overpowering it.
FX should be subtle and supportive, not the main focus.
Output ONLY valid Strudel code.`

    try {
      console.log('[FXAgent] Generating FX for:', message.prompt)

      const response = await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: FX_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: contextInfo,
          },
        ],
      })

      const rawResponse =
        response.content[0].type === 'text' ? response.content[0].text : ''

      const pattern = cleanPatternResponse(rawResponse)

      console.log('[FXAgent] Generated pattern:', pattern)

      return {
        pattern,
        success: true,
        layerType: 'fx',
        frequencyRange: { low: 500, high: 16000 },
        rhythmicDensity: this.estimateRhythmicDensity(pattern),
        suggestedEnergy: context.energyLevel,
        metadata: {
          instruments: this.detectFXTypes(pattern),
          effects: this.extractEffects(pattern),
          rhythmType: this.detectFXStyle(pattern),
        },
      }
    } catch (error) {
      const err = error as Error
      console.error('[FXAgent] Generation failed:', err)

      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: err.message,
        layerType: 'fx',
      }
    }
  }

  /**
   * Modify an existing FX pattern
   */
  async modify(
    currentPattern: string,
    instruction: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const modifyPrompt = `
Current FX pattern:
${currentPattern}

Modification requested: ${instruction}

Modify the FX pattern to match the request while keeping it subtle.
Output ONLY the modified Strudel code.`

    return this.generate(
      {
        type: 'modify',
        prompt: modifyPrompt,
        context,
        currentPattern,
      },
      context
    )
  }

  /**
   * Get a default pattern based on context
   */
  getDefaultPattern(context: AgentContext): string {
    const energy = context.energyLevel

    if (energy < 30) {
      // Ambient texture
      return `s("noise").lpf(2000).hpf(500).room(0.9).gain(0.1).slow(8)`
    } else if (energy < 60) {
      // Subtle sweep
      return `s("noise").lpf(sine.range(1000,4000).slow(4)).hpf(400).gain(0.2).room(0.5)`
    } else {
      // Active FX
      return `stack(
  s("noise").lpf(sine.range(500,6000).slow(2)).gain(0.25),
  s("perc:5 ~*7").room(0.6).gain(0.3).delay(0.2)
)`
    }
  }

  /**
   * Detect arrangement phase from prompt
   */
  private detectArrangementPhase(prompt: string): string | null {
    const lowered = prompt.toLowerCase()

    if (lowered.includes('build') || lowered.includes('riser')) {
      return 'build'
    }
    if (lowered.includes('drop') || lowered.includes('impact')) {
      return 'drop'
    }
    if (lowered.includes('breakdown') || lowered.includes('ambient')) {
      return 'breakdown'
    }
    if (lowered.includes('transition')) {
      return 'transition'
    }

    return null
  }

  /**
   * Estimate rhythmic density from pattern
   */
  private estimateRhythmicDensity(pattern: string): number {
    // FX are typically less rhythmically dense
    const hits = pattern.match(/s\(["'][^"']+["']\)/g)
    const multipliers = pattern.match(/\*(\d+)/g)

    let density = hits?.length || 1

    if (multipliers) {
      multipliers.forEach(m => {
        const num = parseInt(m.slice(1))
        density += num - 1
      })
    }

    // FX should be sparse, cap lower
    return Math.min(density, 8)
  }

  /**
   * Detect FX types from pattern
   */
  private detectFXTypes(pattern: string): string[] {
    const types: string[] = []

    if (pattern.includes('noise')) {
      if (pattern.includes('sine.range') || pattern.includes('cosine.range')) {
        types.push('sweep')
      } else {
        types.push('texture')
      }
    }
    if (pattern.match(/\.slow\((?:[48]|16)\)/)) {
      types.push('riser')
    }
    if (pattern.match(/808|decay\([12]/)) {
      types.push('impact')
    }
    if (pattern.match(/\.room\(0\.[789]/)) {
      types.push('atmosphere')
    }
    if (pattern.match(/perc|rarely|sometimes/)) {
      types.push('ear-candy')
    }

    if (types.length === 0) {
      types.push('fx')
    }

    return types
  }

  /**
   * Extract effects from pattern
   */
  private extractEffects(pattern: string): string[] {
    const effects: string[] = []
    const effectPatterns = [
      { regex: /\.lpf\(/i, name: 'filter' },
      { regex: /\.hpf\(/i, name: 'highpass' },
      { regex: /\.room\(/i, name: 'reverb' },
      { regex: /\.delay\(/i, name: 'delay' },
      { regex: /sine\.range|cosine\.range/i, name: 'lfo' },
      { regex: /\.degradeBy\(/i, name: 'probability' },
    ]

    effectPatterns.forEach(({ regex, name }) => {
      if (regex.test(pattern)) {
        effects.push(name)
      }
    })

    return effects
  }

  /**
   * Detect the FX style
   */
  private detectFXStyle(pattern: string): string {
    if (pattern.includes('sine.range') || pattern.includes('cosine.range')) {
      return 'modulated'
    }
    if (pattern.match(/\.slow\(8|16\)/)) {
      return 'evolving'
    }
    if (pattern.match(/sometimes|rarely/)) {
      return 'sporadic'
    }
    if (pattern.match(/perc|808/)) {
      return 'percussive'
    }
    return 'ambient'
  }

  /**
   * Generate a riser pattern for builds
   */
  generateRiser(durationBars: number = 8, context: AgentContext): string {
    return `s("noise").lpf(sine.range(500,10000).slow(${durationBars})).gain(0.35).room(0.4)`
  }

  /**
   * Generate an impact for drops
   */
  generateImpact(context: AgentContext): string {
    return `s("808:5").gain(0.85).room(0.3).hpf(30)`
  }

  /**
   * Get configuration
   */
  getConfig(): Required<FXAgentConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<FXAgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let fxInstance: FXAgent | null = null

export function getFXAgent(): FXAgent {
  if (!fxInstance) {
    fxInstance = new FXAgent()
  }
  return fxInstance
}

export function resetFXAgent(): void {
  fxInstance = null
}
