/**
 * BassAgent - Specialist agent for bass and sub-frequency patterns
 *
 * Generates Strudel patterns for bass lines, sub bass, and low-frequency elements.
 * Understands harmonic context and follows root notes from chord progressions.
 *
 * @references Phase 4 Task 4.1.3
 */

import { isAnthropicAvailable, createChatCompletion } from '../anthropic'
import { cleanPatternResponse } from '../PatternAgent'
import type {
  SpecialistAgent,
  AgentMessage,
  AgentContext,
  AgentResponse,
} from './types'

export interface BassAgentConfig {
  model?: string
  maxTokens?: number
  temperature?: number
}

// Default configuration
const DEFAULT_CONFIG: Required<BassAgentConfig> = {
  model: 'gpt-4o',
  maxTokens: 768,
  temperature: 0.7,
}

// Note mappings for keys
const KEY_ROOT_NOTES: Record<string, string> = {
  'C': 'c2',
  'Cm': 'c2',
  'C#': 'cs2',
  'C#m': 'cs2',
  'Db': 'cs2',
  'Dbm': 'cs2',
  'D': 'd2',
  'Dm': 'd2',
  'D#': 'ds2',
  'D#m': 'ds2',
  'Eb': 'ds2',
  'Ebm': 'ds2',
  'E': 'e2',
  'Em': 'e2',
  'F': 'f2',
  'Fm': 'f2',
  'F#': 'fs2',
  'F#m': 'fs2',
  'Gb': 'fs2',
  'Gbm': 'fs2',
  'G': 'g2',
  'Gm': 'g2',
  'G#': 'gs2',
  'G#m': 'gs2',
  'Ab': 'gs2',
  'Abm': 'gs2',
  'A': 'a2',
  'Am': 'a2',
  'A#': 'as2',
  'A#m': 'as2',
  'Bb': 'as2',
  'Bbm': 'as2',
  'B': 'b2',
  'Bm': 'b2',
}

// System prompt for the Bass specialist
const BASS_SYSTEM_PROMPT = `You are a specialist bass pattern generator for electronic music.

Your ONLY job is to output valid Strudel code for bass patterns. Output ONLY code, no explanations.

---

## VOICE LEADING - THE KEY TO MUSICAL BASS

Good bass isn't just playing root notes - it's about SMOOTH MOVEMENT between notes.

### Voice Leading Rules for Bass:
1. **Prefer small intervals** - Move by whole steps (2 semitones) or half steps (1 semitone)
2. **Avoid awkward jumps** - Tritones (6 semitones) and large leaps sound jarring
3. **Approach target notes** - Lead into important notes from a step above or below
4. **Use passing tones** - Fill gaps between chord tones for smooth motion

### Bad vs. Good Bass Motion:
\`\`\`javascript
// BAD - Jumpy, mechanical (large random intervals)
note("c2 g2 d2 a2")  // Jumping 7, -4, 7 semitones

// GOOD - Smooth, musical (stepwise motion)
note("c2 d2 e2 d2")  // Moving 2, 2, -2 semitones

// GOOD - Approach notes (leading to target)
note("<c2 b1 c2 d2>")  // B leads up to C, D continues upward

// GOOD - Walking bass (fills gaps smoothly)
note("<c2 d2 e2 g2> <f2 e2 d2 c2>")  // Up then down, stepwise
\`\`\`

### Harmonic Foundation:
Bass provides the harmonic foundation. When chords change, bass should:
1. Play the ROOT of each chord as the anchor
2. Use passing tones BETWEEN chord changes
3. Anticipate the next chord by approaching from a step away

\`\`\`javascript
// Chord progression: C - G - Am - F
// Bass follows roots with smooth connections:
note("<c2 b1 c2 d2> <g1 a1 b1 c2> <a1 g1 a1 b1> <f1 g1 a1 g1>")

// Simpler version - just roots with good voice leading:
note("<c2 g1 a1 f1>")  // C→G (down 5), G→A (up 2), A→F (down 3)
\`\`\`

---

## BASS SOUND SOURCES:

\`\`\`javascript
// Sub bass (deep, sine-like)
note("c1").s("sine").lpf(150).gain(0.75)

// Synth bass (rich harmonics)
note("c2").s("sawtooth").lpf(350).gain(0.7)

// Square bass (hollow, punchy)
note("c2").s("square").lpf(400).gain(0.7)

// Reese bass (detuned, wide)
note("c1").s("sawtooth").lpf(250).room(0.1).gain(0.8)

// 808 bass (punchy with decay)
note("c2").s("sawtooth").lpf(200).decay(0.4).sustain(0).gain(0.8)
\`\`\`

---

## FILTER MODULATION (ESSENTIAL FOR MUSICALITY)

Static bass = boring. Moving bass = alive.

\`\`\`javascript
// Breathing filter (subtle tension/release)
note("c2*4").s("sawtooth").lpf(sine.range(150, 400).slow(4)).gain(0.75)

// Opening filter (building energy)
note("c2*4").s("sawtooth").lpf(saw.range(100, 600).slow(8)).gain(0.75)

// Wobble bass (dubstep-style)
note("c1").s("sawtooth").lpf(sine.range(100, 800).fast(4)).gain(0.85)

// Resonant character
note("c2*4").s("sawtooth").lpf(300).resonance(0.25).gain(0.7)
\`\`\`

---

## OCTAVE RANGES:

- Octave 1 (c1-b1): Deep sub bass - use with .s("sine"), .lpf(100-200)
- Octave 2 (c2-b2): Standard bass - main bass range, most waveforms work
- Octave 3 (c3-b3): Upper bass/low mid - for leads, accents

---

## RHYTHM PATTERNS:

\`\`\`javascript
// Root pulse (4/4 foundation)
note("<c2 c2 f2 g2>").s("sawtooth").lpf(300).gain(0.75)

// Syncopated (off-beat energy)
note("c2 ~ [c2 c2] ~ c2 ~ [c2 d2] ~").s("sawtooth").lpf(350).gain(0.7)

// Octave bounce (adds movement)
note("<c2 c1 c2 c1>").s("sawtooth").lpf(250).gain(0.75)

// Walking (smooth melodic bass)
note("<c2 d2 e2 g2> <f2 e2 d2 c2>").s("sawtooth").lpf(400).gain(0.7)

// Ghost notes (subtle groove)
note("c2 [c2@0.3 c2] c2 [c2 c2@0.3]").s("sawtooth").lpf(300).gain("<0.75 0.4 0.7 0.45 0.75>")
\`\`\`

---

## KEY/SCALE PATTERNS:

### Minor Key (Am) - Dark, tense
- Root (A): a2 - stable, home
- Minor 3rd (C): c3 - sadness
- Perfect 4th (D): d3 - tension
- Perfect 5th (E): e3 - power, open
- Minor 7th (G): g3 - tension before resolution

\`\`\`javascript
note("<a1 ~ a1 c2 ~ e2 ~ a1>").s("sawtooth").lpf(250).gain(0.75)
\`\`\`

### Major Key (C) - Bright, happy
- Root (C): c2 - stable, home
- Major 3rd (E): e2 - brightness
- Perfect 5th (G): g2 - power, open
- Octave (C): c3 - resolution

\`\`\`javascript
note("<c2 ~ e2 ~ g2 ~ c3 g2>").s("sawtooth").lpf(350).gain(0.7)
\`\`\`

---

## ENERGY GUIDELINES:

### Low energy (0-30): Sparse, sustained
\`\`\`javascript
note("<c2 ~ ~ ~ g1 ~ ~ ~>").s("sine").lpf(180).room(0.15).gain(0.6).attack(0.1).decay(0.5)
\`\`\`

### Medium energy (31-60): Rhythmic, grooving
\`\`\`javascript
note("<c2 c2 ~ [c2 d2]> <f2 ~ f2 e2>").s("sawtooth").lpf(sine.range(200, 400).slow(4)).gain(0.7)
\`\`\`

### High energy (61-100): Driving, active
\`\`\`javascript
note("<c2 c2 c2 [c2 c2]>*2").s("sawtooth").lpf(sine.range(150, 500).fast(0.5)).gain(0.85).distort(0.1)
\`\`\`

---

## GENRE-SPECIFIC:

### House (120-128 BPM)
\`\`\`javascript
note("<c2 ~ c2 ~> <f2 ~ f2 ~>").s("sawtooth").lpf(sine.range(200, 450).slow(2)).gain(0.7)
\`\`\`

### Techno (128-140 BPM)
\`\`\`javascript
note("<c1 ~ c1 c1>*2").s("sawtooth").lpf(sine.range(100, 300).slow(4)).gain(0.8)
\`\`\`

### DnB (170-180 BPM)
\`\`\`javascript
note("<a1 ~ a1 c2 ~ d2 ~ a1>").s("sawtooth").lpf(220).gain(0.8)
\`\`\`

### Dubstep (140 BPM, half-time)
\`\`\`javascript
note("<c1 ~ ~ ~ eb1 ~ ~ ~>").s("sawtooth").lpf(sine.range(80, 600).fast(4)).gain(0.9).slow(2)
\`\`\`

Always match the key provided in context. Use smooth voice leading between notes.
Output ONLY the Strudel code, nothing else.`

/**
 * BassAgent class - generates bass patterns
 */
export class BassAgent implements SpecialistAgent {
  readonly name = 'bass' as const
  private config: Required<BassAgentConfig>

  constructor(config: BassAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if agent is available
   */
  isAvailable(): boolean {
    return isAnthropicAvailable()
  }

  /**
   * Get the root note for a key
   */
  private getRootNote(key: string): string {
    return KEY_ROOT_NOTES[key] || KEY_ROOT_NOTES[key.replace('m', '')] || 'a2'
  }

  /**
   * Generate a bass pattern based on the message and context
   */
  async generate(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    if (!isAnthropicAvailable()) {
      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: 'OpenAI API not available',
        layerType: 'bass',
      }
    }
    const rootNote = this.getRootNote(context.key)

    // Build the prompt with context
    const contextInfo = `
Context:
- BPM: ${context.bpm}
- Energy level: ${context.energyLevel}/100
- Key: ${context.key} ${context.scale}
- Root note: ${rootNote}
- Genre: ${context.genre || 'electronic'}

Request: ${message.prompt}

Generate a bass pattern in the key of ${context.key} ${context.scale}.
The root note should be ${rootNote}.
Output ONLY valid Strudel code.`

    try {
      console.log('[BassAgent] Generating bass for:', message.prompt)

      const rawResponse = await createChatCompletion({
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: BASS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contextInfo }],
      })

      const pattern = cleanPatternResponse(rawResponse)

      console.log('[BassAgent] Generated pattern:', pattern)

      return {
        pattern,
        success: true,
        layerType: 'bass',
        frequencyRange: { low: 30, high: 250 },
        rhythmicDensity: this.estimateRhythmicDensity(pattern),
        suggestedEnergy: context.energyLevel,
        metadata: {
          instruments: ['bass'],
          effects: this.extractEffects(pattern),
          rhythmType: this.detectBassStyle(pattern),
        },
      }
    } catch (error) {
      const err = error as Error
      console.error('[BassAgent] Generation failed:', err)

      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: err.message,
        layerType: 'bass',
      }
    }
  }

  /**
   * Modify an existing bass pattern
   */
  async modify(
    currentPattern: string,
    instruction: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const rootNote = this.getRootNote(context.key)

    const modifyPrompt = `
Current bass pattern:
${currentPattern}

Key: ${context.key} ${context.scale}
Root note: ${rootNote}

Modification requested: ${instruction}

Modify the bass pattern to match the request while staying in the correct key.
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
    const rootNote = this.getRootNote(context.key)
    const energy = context.energyLevel

    if (energy < 30) {
      // Sparse, ambient bass
      return `note("${rootNote} ~ ~ ~").s("sine").lpf(200).gain(0.6).room(0.2)`
    } else if (energy < 60) {
      // Standard groove bass
      return `note("${rootNote} ${rootNote} ~ [${rootNote} ${rootNote}]").s("sawtooth").lpf(400).gain(0.75)`
    } else {
      // Driving bass
      return `note("${rootNote}*4").s("square").lpf(500).gain(0.8).hpf(40)`
    }
  }

  /**
   * Estimate rhythmic density from pattern
   */
  private estimateRhythmicDensity(pattern: string): number {
    // Count note occurrences and multipliers
    const notes = pattern.match(/\b[a-g][s#]?\d\b/gi)
    const multipliers = pattern.match(/\*(\d+)/g)

    let density = notes?.length || 1

    if (multipliers) {
      multipliers.forEach(m => {
        const num = parseInt(m.slice(1))
        density += num - 1
      })
    }

    return Math.min(density, 16) // Cap at 16 notes per bar for bass
  }

  /**
   * Extract effects from pattern
   */
  private extractEffects(pattern: string): string[] {
    const effects: string[] = []
    const effectPatterns = [
      { regex: /\.gain\(/i, name: 'gain' },
      { regex: /\.room\(/i, name: 'reverb' },
      { regex: /\.lpf\(/i, name: 'lowpass' },
      { regex: /\.hpf\(/i, name: 'highpass' },
      { regex: /\.s\(["'](?:sawtooth|square|sine|triangle)["']\)/i, name: 'synth' },
    ]

    effectPatterns.forEach(({ regex, name }) => {
      if (regex.test(pattern)) {
        effects.push(name)
      }
    })

    return effects
  }

  /**
   * Detect the bass style from pattern
   */
  private detectBassStyle(pattern: string): string {
    if (pattern.includes('.slow(2)')) {
      return 'dubstep/half-time'
    }
    if (pattern.match(/\*8|\*16/)) {
      return 'driving'
    }
    if (pattern.includes('~') && pattern.match(/\[.*\]/)) {
      return 'syncopated'
    }
    if (pattern.match(/sine.*room/i)) {
      return 'ambient'
    }
    return 'standard'
  }

  /**
   * Get configuration
   */
  getConfig(): Required<BassAgentConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BassAgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let bassInstance: BassAgent | null = null

export function getBassAgent(): BassAgent {
  if (!bassInstance) {
    bassInstance = new BassAgent()
  }
  return bassInstance
}

export function resetBassAgent(): void {
  bassInstance = null
}
