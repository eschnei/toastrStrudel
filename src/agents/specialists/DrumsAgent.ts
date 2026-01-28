/**
 * DrumsAgent - Specialist agent for rhythm and percussion patterns
 *
 * Generates Strudel patterns for kick, snare, hi-hats, and percussion elements.
 * Understands rhythm terminology like groove, swing, pocket, and syncopation.
 *
 * @references Phase 4 Task 4.1.2
 */

import { isAnthropicAvailable, createChatCompletion } from '../anthropic'
import { cleanPatternResponse } from '../PatternAgent'
import type {
  SpecialistAgent,
  AgentMessage,
  AgentContext,
  AgentResponse,
  LAYER_FREQUENCY_RANGES,
} from './types'

export interface DrumsAgentConfig {
  model?: string
  maxTokens?: number
  temperature?: number
}

// Default configuration
const DEFAULT_CONFIG: Required<DrumsAgentConfig> = {
  model: 'gpt-4o',
  maxTokens: 768,
  temperature: 0.75,
}

// System prompt for the Drums specialist
const DRUMS_SYSTEM_PROMPT = `You are a specialist drum pattern generator for electronic music.

Your ONLY job is to output valid Strudel code for drum patterns. Output ONLY code, no explanations.

AVAILABLE DRUM SOUNDS:
- Kicks: "bd", "bd:0" through "bd:9" (different kick sounds)
- Snares: "sd", "sd:0" through "sd:9", "cp" (clap), "rim"
- Hi-hats: "hh", "hh:0" through "hh:9" (use hh with .decay(0.3) for open hat feel)
- Percussion: "tom", "tom:0-3", "perc"

---

## GROOVE & POCKET - THE SECRET TO MUSICAL DRUMS

Good drums aren't just the right sounds - they FEEL right. This comes from:

### 1. Ghost Notes (The Secret Sauce)
Ghost notes are quiet hits between main beats. They create the groove feel.
\`\`\`javascript
// Hi-hat with ghost notes (quieter hits in between)
s("hh [hh hh] hh [hh hh hh]").gain("<0.8 0.3 0.5 0.3 0.4 0.3>")

// Snare with ghost notes before main hit
s("~ sd:3 ~ [sd:3@0.3 sd]").gain("<1 0.75 1 0.35 0.8>")

// Full groove with ghosts
stack(
  s("bd*4").gain(0.9),
  s("~ [~ sd@0.3] ~ sd").gain("<1 1 0.35 0.9>"),
  s("hh [hh@0.3 hh] hh [hh hh@0.3]").gain("<0.6 0.25 0.5 0.3 0.55 0.2>")
)
\`\`\`

### 2. Micro-timing (The Pocket)
Perfect quantization = robotic. Intentional timing = groove.
\`\`\`javascript
// Laid-back feel (slightly late - relaxed groove)
s("hh*8").late(0.02)

// Pushing feel (slightly early - urgent energy)
s("sd").early(0.015)

// Human feel (random subtle timing)
s("hh*16").late(rand.range(0, 0.02))

// Snare in the pocket (slightly late for groove)
s("~ sd ~ sd").late(0.01)
\`\`\`

### 3. Groove Feel (using timing)
Use .late() to push notes back for a laid-back groove feel.
\`\`\`javascript
// Light groove (house, nu-disco) - hi-hats slightly late
s("hh*8").late(0.01)

// Medium groove (soul, funk) - snare in the pocket
stack(
  s("bd ~ bd ~"),
  s("~ sd ~ sd").late(0.015),
  s("hh*8").late(0.01)
)

// Loose feel (hip-hop) - everything slightly late
s("hh*16").late(rand.range(0, 0.02))
\`\`\`

### 4. Dynamic Accents
Varying velocity creates life. Static gain = dead.
\`\`\`javascript
// Accent on beat 1
s("bd*4").gain("<0.95 0.7 0.8 0.7>")

// Crescendo through bar
s("hh*16").gain(sine.range(0.3, 0.7).slow(0.5))

// Random humanization
s("hh*8").gain(rand.range(0.4, 0.65))

// Hi-hat dynamics (open/closed feel)
s("hh*8").gain("<0.6 0.4 0.5 0.35 0.55 0.4 0.5 0.35>").lpf("<6000 4000 5000 3500>")
\`\`\`

---

## RHYTHM PATTERNS

### Four-on-the-Floor (House, Techno)
\`\`\`javascript
stack(
  s("bd*4").gain(0.9),
  s("~ sd ~ sd").gain(0.75).room(0.15).late(0.01),
  s("~ hh ~ hh").gain(0.5),
  s("[~ hh] [~ hh] [~ hh] [hh hh]").gain(0.35).lpf(4000)
)
\`\`\`

### Breakbeat (DnB, Jungle)
\`\`\`javascript
stack(
  s("bd ~ [~ bd] ~ bd ~ ~ [bd ~]").gain(0.9),
  s("~ ~ sd ~ ~ [~ sd] ~ sd").gain(0.85).room(0.2),
  s("hh*8").gain(sine.range(0.3, 0.5).slow(2)).lpf(5000)
)
\`\`\`

### Half-Time (Dubstep, Trap)
\`\`\`javascript
stack(
  s("bd ~ ~ ~ bd ~ ~ ~").gain(0.95).slow(2),
  s("~ ~ ~ ~ sd ~ ~ ~").room(0.3).gain(0.85).slow(2),
  s("hh*4").gain(0.4).lpf(3000).slow(2)
)
\`\`\`

### Two-Step (UK Garage, House)
\`\`\`javascript
stack(
  s("bd ~ ~ bd ~ ~ bd ~").gain(0.85),
  s("~ ~ sd ~ ~ sd ~ ~").gain(0.75).room(0.2).late(0.02),
  s("hh*8").gain("<0.5 0.35 0.45 0.3 0.5 0.35 0.45 0.4>").lpf(5000).late(0.01)
)
\`\`\`

---

## PATTERN GUIDELINES BY ENERGY:

### Low energy (0-30): Minimal, space, restraint
\`\`\`javascript
stack(
  s("bd ~ ~ bd ~ ~ bd ~").gain(0.7).room(0.3),
  s("~ ~ ~ ~ sd ~ ~ ~").gain(0.5).room(0.4),
  s("hh*4?").gain(0.3).lpf(2500)
).slow(1.2)
\`\`\`

### Medium energy (31-60): Balanced groove
\`\`\`javascript
stack(
  s("bd ~ bd ~").gain(0.85),
  s("~ sd:3 ~ sd:3").gain(0.7).room(0.2).late(0.01),
  s("hh*8").gain(sine.range(0.35, 0.5).slow(2)).lpf(5000),
  s("~ ~ ~ cp?").room(0.3).gain(0.5)
)
\`\`\`

### High energy (61-100): Dense, driving, fills
\`\`\`javascript
stack(
  s("bd*4").gain(0.95),
  s("~ [sd sd:2] ~ sd").gain(0.85).room(0.15),
  s("hh*16").gain(sine.range(0.4, 0.6).slow(4)).lpf(6000),
  s("[~ cp] ~ [~ cp] cp").room(0.25).gain(0.6),
  s("~ ~ ~ [sd:4 sd:4 sd:4 sd:4]").gain(0.5).every(4, x => x)
)
\`\`\`

---

## EFFECTS FOR DRUMS:
- .gain(0.5) - Volume (use patterns for dynamics: "<0.9 0.6 0.7 0.6>")
- .room(0.3) - Reverb (snares 0.15-0.3, claps 0.2-0.4)
- .lpf(8000) - Low-pass (darker hats: 2000-4000, bright: 6000-10000)
- .hpf(80) - High-pass (clean kick: 40-80, thin snare: 150-300)
- .delay(0.2) - Delay for texture
- .distort(0.1) - Grit and punch (kicks: 0.1-0.2, snares: 0.05-0.15)

Always use stack() to combine drum elements.
Output ONLY the Strudel code, nothing else.`

/**
 * DrumsAgent class - generates drum/percussion patterns
 */
export class DrumsAgent implements SpecialistAgent {
  readonly name = 'drums' as const
  private config: Required<DrumsAgentConfig>

  constructor(config: DrumsAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if agent is available
   */
  isAvailable(): boolean {
    return isAnthropicAvailable()
  }

  /**
   * Generate a drum pattern based on the message and context
   */
  async generate(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    if (!isAnthropicAvailable()) {
      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: 'OpenAI API not available',
        layerType: 'drums',
      }
    }

    // Build the prompt with context
    const contextInfo = `
Context:
- BPM: ${context.bpm}
- Energy level: ${context.energyLevel}/100
- Key: ${context.key} ${context.scale}
- Genre: ${context.genre || 'electronic'}

Request: ${message.prompt}

Generate a drum pattern matching this vibe. Output ONLY valid Strudel code.`

    try {
      console.log('[DrumsAgent] Generating drums for:', message.prompt)

      const rawResponse = await createChatCompletion({
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: DRUMS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contextInfo }],
      })

      const pattern = cleanPatternResponse(rawResponse)

      console.log('[DrumsAgent] Generated pattern:', pattern)

      // Estimate rhythmic density based on pattern content
      const rhythmicDensity = this.estimateRhythmicDensity(pattern)

      return {
        pattern,
        success: true,
        layerType: 'drums',
        frequencyRange: { low: 30, high: 15000 },
        rhythmicDensity,
        suggestedEnergy: context.energyLevel,
        metadata: {
          instruments: this.extractInstruments(pattern),
          effects: this.extractEffects(pattern),
          rhythmType: this.detectRhythmType(pattern),
        },
      }
    } catch (error) {
      const err = error as Error
      console.error('[DrumsAgent] Generation failed:', err)

      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: err.message,
        layerType: 'drums',
      }
    }
  }

  /**
   * Modify an existing drum pattern
   */
  async modify(
    currentPattern: string,
    instruction: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const modifyPrompt = `
Current drum pattern:
${currentPattern}

Modification requested: ${instruction}

Modify the pattern to match the request while maintaining the core groove.
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
      // Minimal drums
      return `s("bd ~ ~ bd ~ ~ bd ~").gain(0.7)`
    } else if (energy < 60) {
      // Standard groove
      return `stack(
  s("bd ~ bd ~").gain(0.8),
  s("~ sd ~ sd:3").gain(0.7),
  s("hh*4").gain(0.4).lpf(6000)
)`
    } else {
      // High energy
      return `stack(
  s("bd*4").gain(0.9),
  s("~ sd ~ [sd sd:2]").gain(0.8),
  s("hh*8").gain(0.5).lpf(8000),
  s("~ ~ ~ cp").room(0.2).gain(0.6)
)`
    }
  }

  /**
   * Estimate rhythmic density from pattern
   */
  private estimateRhythmicDensity(pattern: string): number {
    // Count occurrences of drum sounds
    const drumSounds = pattern.match(/\b(bd|sd|hh|cp|oh|rim|tom|perc|808|cr|rd)\b/gi)
    const multipliers = pattern.match(/\*(\d+)/g)

    let density = drumSounds?.length || 1

    // Add for multipliers
    if (multipliers) {
      multipliers.forEach(m => {
        const num = parseInt(m.slice(1))
        density += num - 1
      })
    }

    return Math.min(density, 32) // Cap at 32 notes per bar
  }

  /**
   * Extract drum instruments from pattern
   */
  private extractInstruments(pattern: string): string[] {
    const instruments: string[] = []
    const matches = pattern.match(/\b(bd|sd|hh|cp|oh|rim|tom|perc|808|cr|rd)(?::\d+)?\b/gi)

    if (matches) {
      const unique = new Set(matches.map(m => m.split(':')[0].toLowerCase()))
      instruments.push(...unique)
    }

    return instruments
  }

  /**
   * Extract effects from pattern
   */
  private extractEffects(pattern: string): string[] {
    const effects: string[] = []
    const effectPatterns = [
      { regex: /\.gain\(/i, name: 'gain' },
      { regex: /\.room\(/i, name: 'reverb' },
      { regex: /\.delay\(/i, name: 'delay' },
      { regex: /\.lpf\(/i, name: 'lowpass' },
      { regex: /\.hpf\(/i, name: 'highpass' },
      { regex: /\.late\(/i, name: 'groove' },
    ]

    effectPatterns.forEach(({ regex, name }) => {
      if (regex.test(pattern)) {
        effects.push(name)
      }
    })

    return effects
  }

  /**
   * Detect the rhythm type from pattern
   */
  private detectRhythmType(pattern: string): string {
    if (pattern.includes('bd*4')) {
      return 'four-on-the-floor'
    }
    if (pattern.match(/bd\s*~\s*bd\s*\[/)) {
      return 'breakbeat'
    }
    if (pattern.match(/~\s*~\s*sd\s*~/)) {
      return 'half-time'
    }
    if (pattern.includes('.late(')) {
      return 'groovy'
    }
    return 'standard'
  }

  /**
   * Get configuration
   */
  getConfig(): Required<DrumsAgentConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DrumsAgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let drumsInstance: DrumsAgent | null = null

export function getDrumsAgent(): DrumsAgent {
  if (!drumsInstance) {
    drumsInstance = new DrumsAgent()
  }
  return drumsInstance
}

export function resetDrumsAgent(): void {
  drumsInstance = null
}
