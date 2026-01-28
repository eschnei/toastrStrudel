/**
 * SynthAgent - Specialist agent for melodic and harmonic elements
 *
 * Generates Strudel patterns for pads, leads, arpeggios, stabs, and chord progressions.
 * Understands musical theory for scales and chord progressions.
 *
 * @references Phase 4 Task 4.1.4
 */

import { isAnthropicAvailable, createChatCompletion } from '../anthropic'
import { cleanPatternResponse } from '../PatternAgent'
import type {
  SpecialistAgent,
  AgentMessage,
  AgentContext,
  AgentResponse,
} from './types'

export interface SynthAgentConfig {
  model?: string
  maxTokens?: number
  temperature?: number
}

// Default configuration
const DEFAULT_CONFIG: Required<SynthAgentConfig> = {
  model: 'gpt-4o',
  maxTokens: 768,
  temperature: 0.8,
}

// Scale definitions for different keys
const SCALE_NOTES: Record<string, Record<string, string[]>> = {
  minor: {
    'A': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    'Am': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    'B': ['b', 'cs', 'd', 'e', 'fs', 'g', 'a'],
    'Bm': ['b', 'cs', 'd', 'e', 'fs', 'g', 'a'],
    'C': ['c', 'd', 'ds', 'f', 'g', 'gs', 'as'],
    'Cm': ['c', 'd', 'ds', 'f', 'g', 'gs', 'as'],
    'D': ['d', 'e', 'f', 'g', 'a', 'as', 'c'],
    'Dm': ['d', 'e', 'f', 'g', 'a', 'as', 'c'],
    'E': ['e', 'fs', 'g', 'a', 'b', 'c', 'd'],
    'Em': ['e', 'fs', 'g', 'a', 'b', 'c', 'd'],
    'F': ['f', 'g', 'gs', 'as', 'c', 'cs', 'ds'],
    'Fm': ['f', 'g', 'gs', 'as', 'c', 'cs', 'ds'],
    'G': ['g', 'a', 'as', 'c', 'd', 'ds', 'f'],
    'Gm': ['g', 'a', 'as', 'c', 'd', 'ds', 'f'],
  },
  major: {
    'C': ['c', 'd', 'e', 'f', 'g', 'a', 'b'],
    'D': ['d', 'e', 'fs', 'g', 'a', 'b', 'cs'],
    'E': ['e', 'fs', 'gs', 'a', 'b', 'cs', 'ds'],
    'F': ['f', 'g', 'a', 'as', 'c', 'd', 'e'],
    'G': ['g', 'a', 'b', 'c', 'd', 'e', 'fs'],
    'A': ['a', 'b', 'cs', 'd', 'e', 'fs', 'gs'],
    'B': ['b', 'cs', 'ds', 'e', 'fs', 'gs', 'as'],
  },
}

// System prompt for the Synth specialist
const SYNTH_SYSTEM_PROMPT = `You are a specialist synthesizer and melodic pattern generator for electronic music.

Your ONLY job is to output valid Strudel code for synth patterns. Output ONLY code, no explanations.

---

## HARMONIC INTELLIGENCE - THE KEY TO MUSICAL SYNTHS

### Chord Progressions (not just static chords)
Music is about MOVEMENT through chords, not just playing one chord.

**Common Progressions:**
\`\`\`javascript
// I-V-vi-IV (Happy, uplifting) - C G Am F
note("<[c3,e3,g3] [g2,b2,d3] [a2,c3,e3] [f2,a2,c3]>").s("sawtooth").lpf(2500).room(0.5).gain(0.45)

// vi-IV-I-V (Emotional, pop) - Am F C G
note("<[a2,c3,e3] [f2,a2,c3] [c3,e3,g3] [g2,b2,d3]>").s("triangle").lpf(2000).room(0.6).gain(0.4)

// i-iv-VII-III (Dark, minor) - Am Dm G C
note("<[a2,c3,e3] [d3,f3,a3] [g2,b2,d3] [c3,e3,g3]>").s("sawtooth").lpf(1800).room(0.5).gain(0.45)

// i-VI-III-VII (Epic, cinematic) - Am F C G
note("<[a2,c3,e3] [f2,a2,c3] [c3,e3,g3] [g2,b2,d3]>").s("sawtooth").lpf(3000).room(0.6).gain(0.5)
\`\`\`

### Voice Leading - Smooth Chord Transitions
When chords change, notes should move SMOOTHLY, not jump randomly.

**Rules:**
1. Keep common tones (notes shared between chords) in the same voice
2. Move other notes by the smallest interval possible
3. Avoid parallel motion in all voices

\`\`\`javascript
// BAD - All voices jump (sounds mechanical)
note("<[c3,e3,g3] [g3,b3,d4]>")  // All voices jump up

// GOOD - Voice leading (smooth transitions)
note("<[c3,e3,g3] [b2,d3,g3]>")  // G stays, others move stepwise

// GOOD - Inversions for smooth voice leading
note("<[c3,e3,g3] [d3,g3,b3] [e3,a3,c4] [f3,a3,c4]>")  // C-G-Am-F with good voicing
\`\`\`

### Chord Inversions (Variety in Voicing)
Don't always use root position. Inversions create smoother movement and variety.

\`\`\`javascript
// Root position (solid, grounded)
note("[c3,e3,g3]")

// First inversion (lighter, moving up)
note("[e3,g3,c4]")

// Second inversion (airy, suspended feel)
note("[g3,c4,e4]")
\`\`\`

---

## MELODIC CONTOUR - TELLING A STORY

Melodies have SHAPE. The shape conveys emotion.

\`\`\`javascript
// Ascending (building energy, hope)
note("c4 d4 e4 f4 g4").s("sawtooth").lpf(4000).gain(0.5)

// Descending (releasing, settling)
note("g4 f4 e4 d4 c4").s("triangle").lpf(3000).gain(0.5)

// Arch (build then release - most satisfying)
note("c4 d4 e4 f4 e4 d4 c4 ~").s("sawtooth").lpf(3500).gain(0.5)

// Wave (hypnotic, flowing)
note("c4 e4 d4 f4 e4 g4 f4 a4").s("triangle").lpf(3000).room(0.4).gain(0.45)

// Call and response (conversational)
note("<c4 d4 e4 ~> <e4 d4 c4 ~>").s("square").lpf(4000).gain(0.5)
\`\`\`

---

## SYNTH TYPES WITH EXPRESSION:

### 1. PADS - Evolving, breathing atmosphere
\`\`\`javascript
// Static pad (boring)
note("[a3,c4,e4]").s("sawtooth").lpf(2000).gain(0.5)

// Evolving pad (alive, musical)
note("<[a3,c4,e4] [g3,c4,e4] [f3,a3,c4] [g3,b3,d4]>").s("sawtooth")
  .lpf(sine.range(1000, 3000).slow(8))
  .room(0.7)
  .gain(sine.range(0.35, 0.5).slow(4))
  .attack(0.3).decay(0.5).sustain(0.7).release(1)
\`\`\`

### 2. LEADS - Expressive melodic lines
\`\`\`javascript
// Mechanical lead (boring)
note("a4 c5 b4 e5").s("square").gain(0.6)

// Expressive lead (musical)
note("a4 c5 b4 e5 d5 c5 b4 a4").s("sawtooth")
  .lpf(sine.range(2000, 5000).slow(2))
  .gain("<0.6 0.5 0.55 0.65 0.5 0.45 0.5 0.55>")
  .attack(0.01).decay(0.2).sustain(0.6).release(0.3)
  .room(0.3).delay(0.2)
\`\`\`

### 3. ARPEGGIOS - Rhythmic with movement
\`\`\`javascript
// Basic arp (static)
note("a3 c4 e4 a4").fast(2).s("triangle").gain(0.5)

// Musical arp (dynamic, evolving)
note("<a3 c4 e4 a4> <c4 e4 g4 c5>").fast(2).s("triangle")
  .lpf(sine.range(2000, 5000).slow(4))
  .gain(sine.range(0.35, 0.55).slow(2))
  .room(0.4).delay(0.3).delayfeedback(0.4)
\`\`\`

### 4. STABS - Punchy with character
\`\`\`javascript
// Rhythmic stabs with dynamics
note("<[a3,c4,e4] ~ [g3,b3,d4] ~> <~ [f3,a3,c4] ~ [e3,g3,b3]>").s("sawtooth")
  .lpf(3500)
  .gain("<0.7 0 0.65 0>")
  .attack(0.005).decay(0.15).sustain(0).release(0.1)
  .room(0.2)
\`\`\`

### 5. PLUCKS - Short, melodic
\`\`\`javascript
note("a4 ~ e4 ~ c5 ~ g4 ~").s("triangle")
  .lpf(4000)
  .gain("<0.6 0 0.55 0 0.65 0 0.5 0>")
  .attack(0.001).decay(0.2).sustain(0).release(0.15)
  .room(0.3)
\`\`\`

---

## ARTICULATION - HOW NOTES FEEL

\`\`\`javascript
// Staccato (short, punchy)
.attack(0.001).decay(0.08).sustain(0).release(0.05)

// Legato (smooth, flowing)
.attack(0.05).decay(0.2).sustain(0.8).release(0.5)

// Pad (slow, evolving)
.attack(0.5).decay(1).sustain(0.7).release(2)

// Plucky (quick attack, medium decay)
.attack(0.001).decay(0.25).sustain(0.1).release(0.2)

// Swelling (builds in)
.attack(0.8).decay(0.3).sustain(0.6).release(0.8)
\`\`\`

---

## FILTER EXPRESSION

Filters create tonal emotion. MOVING filters = character.

\`\`\`javascript
// Breathing filter
.lpf(sine.range(1000, 3500).slow(4))

// Opening filter (building)
.lpf(saw.range(800, 5000).slow(8))

// Resonant character
.lpf(2000).resonance(0.3)

// Closing filter (dark, ending)
.lpf(saw.range(4000, 500).slow(8))
\`\`\`

---

## SCALE-AWARE COMPOSITION:

### Minor Keys (dark, emotional)
- Am: a b c d e f g
- Em: e fs g a b c d
- Dm: d e f g a as c

Emphasize: root, 5th, minor 3rd
Tension notes: 7th (leading tone), 4th

### Major Keys (bright, happy)
- C: c d e f g a b
- G: g a b c d e fs
- F: f g a as c d e

Emphasize: root, 5th, major 3rd
Tension notes: 7th, 4th

---

## ENERGY GUIDELINES:

### Low energy (0-30): Soft, evolving, spacious
\`\`\`javascript
note("<[a3,c4,e4] ~ [e3,g3,b3] ~>").s("triangle")
  .lpf(sine.range(800, 1800).slow(8))
  .room(0.8)
  .gain(sine.range(0.25, 0.4).slow(4))
  .attack(0.5).decay(1).sustain(0.6).release(2)
  .slow(2)
\`\`\`

### Medium energy (31-60): Active, moving, grooving
\`\`\`javascript
note("<a3 c4 e4 a4> <c4 e4 g4 c5>").fast(2).s("sawtooth")
  .lpf(sine.range(1500, 4000).slow(4))
  .room(0.4)
  .gain(sine.range(0.4, 0.55).slow(2))
  .attack(0.01).decay(0.3).sustain(0.5).release(0.3)
\`\`\`

### High energy (61-100): Bright, fast, driving
\`\`\`javascript
note("a4 c5 e5 a5 e5 c5 a4 c5").fast(2).s("sawtooth")
  .lpf(sine.range(3000, 7000).slow(2))
  .room(0.25)
  .gain("<0.65 0.5 0.6 0.7 0.55 0.5 0.6 0.65>")
  .attack(0.005).decay(0.15).sustain(0.4).release(0.2)
\`\`\`

---

## GENRE-SPECIFIC:

### House
\`\`\`javascript
note("<[c3,e3,g3] ~ [f3,a3,c4] ~> <[g3,b3,d4] ~ [c3,e3,g3] ~>").s("sawtooth")
  .lpf(sine.range(1500, 3500).slow(4)).room(0.4).gain(0.45)
\`\`\`

### Techno
\`\`\`javascript
note("<[a2,c3,e3] [a2,c3,e3] ~ ~>").s("sawtooth")
  .lpf(sine.range(400, 1500).slow(8)).room(0.3).gain(0.5).distort(0.1)
\`\`\`

### Ambient
\`\`\`javascript
note("<[c3,e3,g3,b3] ~ ~ ~> <[a2,c3,e3,g3] ~ ~ ~>").s("triangle")
  .lpf(sine.range(600, 2000).slow(16)).room(0.95).delay(0.6).gain(0.35)
  .attack(2).decay(3).sustain(0.5).release(4).slow(4)
\`\`\`

Match the key and scale provided in context. Use voice leading for smooth chord changes.
Output ONLY the Strudel code, nothing else.`

/**
 * SynthAgent class - generates synth/melodic patterns
 */
export class SynthAgent implements SpecialistAgent {
  readonly name = 'synth' as const
  private config: Required<SynthAgentConfig>

  constructor(config: SynthAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if agent is available
   */
  isAvailable(): boolean {
    return isAnthropicAvailable()
  }

  /**
   * Get scale notes for a key
   */
  private getScaleNotes(key: string, scale: string): string[] {
    const scaleType = scale.includes('major') ? 'major' : 'minor'
    const keyLookup = key.replace('m', '')
    return SCALE_NOTES[scaleType]?.[keyLookup] || SCALE_NOTES.minor['A']
  }

  /**
   * Generate a synth pattern based on the message and context
   */
  async generate(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    if (!isAnthropicAvailable()) {
      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: 'OpenAI API not available',
        layerType: 'synth',
      }
    }
    const scaleNotes = this.getScaleNotes(context.key, context.scale)

    // Build the prompt with context
    const contextInfo = `
Context:
- BPM: ${context.bpm}
- Energy level: ${context.energyLevel}/100
- Key: ${context.key} ${context.scale}
- Scale notes: ${scaleNotes.join(', ')}
- Genre: ${context.genre || 'electronic'}

${message.otherLayers?.bass ? `Bass pattern is playing: ${message.otherLayers.bass}\nMake sure synth harmonizes with bass.` : ''}

Request: ${message.prompt}

Generate a synth pattern in ${context.key} ${context.scale}.
Use notes from the scale: ${scaleNotes.join(', ')}
Output ONLY valid Strudel code.`

    try {
      console.log('[SynthAgent] Generating synth for:', message.prompt)

      const rawResponse = await createChatCompletion({
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: SYNTH_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contextInfo }],
      })

      const pattern = cleanPatternResponse(rawResponse)

      console.log('[SynthAgent] Generated pattern:', pattern)

      return {
        pattern,
        success: true,
        layerType: 'synth',
        frequencyRange: { low: 200, high: 8000 },
        rhythmicDensity: this.estimateRhythmicDensity(pattern),
        suggestedEnergy: context.energyLevel,
        metadata: {
          instruments: this.detectSynthType(pattern),
          effects: this.extractEffects(pattern),
          rhythmType: this.detectPatternStyle(pattern),
        },
      }
    } catch (error) {
      const err = error as Error
      console.error('[SynthAgent] Generation failed:', err)

      return {
        pattern: this.getDefaultPattern(context),
        success: false,
        error: err.message,
        layerType: 'synth',
      }
    }
  }

  /**
   * Modify an existing synth pattern
   */
  async modify(
    currentPattern: string,
    instruction: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const scaleNotes = this.getScaleNotes(context.key, context.scale)

    const modifyPrompt = `
Current synth pattern:
${currentPattern}

Key: ${context.key} ${context.scale}
Scale notes: ${scaleNotes.join(', ')}

Modification requested: ${instruction}

Modify the synth pattern to match the request while staying in key.
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
    const scaleNotes = this.getScaleNotes(context.key, context.scale)
    const root = scaleNotes[0]
    const third = scaleNotes[2]
    const fifth = scaleNotes[4]
    const energy = context.energyLevel

    if (energy < 30) {
      // Soft pad
      return `note("[${root}3,${third}4,${fifth}4]").s("triangle").lpf(1500).room(0.7).gain(0.4).slow(2)`
    } else if (energy < 60) {
      // Arpeggio
      return `note("${root}3 ${third}4 ${fifth}4 ${root}4").fast(2).s("sawtooth").lpf(3000).room(0.4).gain(0.5)`
    } else {
      // Active lead
      return `note("${root}4 ${third}4 ${fifth}4 ${root}5").fast(4).s("square").lpf(5000).gain(0.6)`
    }
  }

  /**
   * Estimate rhythmic density from pattern
   */
  private estimateRhythmicDensity(pattern: string): number {
    const notes = pattern.match(/\b[a-g][s#]?\d\b/gi)
    const chords = pattern.match(/\[[^\]]+\]/g)
    const multipliers = pattern.match(/\.fast\((\d+)\)/g)

    let density = notes?.length || 1
    density += (chords?.length || 0) * 3 // Chords count more

    if (multipliers) {
      multipliers.forEach(m => {
        const num = parseInt(m.match(/\d+/)?.[0] || '1')
        density *= num
      })
    }

    return Math.min(density, 32)
  }

  /**
   * Detect synth type from pattern
   */
  private detectSynthType(pattern: string): string[] {
    const types: string[] = []

    if (pattern.match(/\[[^\]]+\].*slow/i)) {
      types.push('pad')
    }
    if (pattern.match(/\[[^\]]+\].*decay/i)) {
      types.push('stab')
    }
    if (pattern.match(/\.fast\(/i) && !pattern.includes('[')) {
      types.push('arpeggio')
    }
    if (!pattern.includes('[') && pattern.match(/note\(/i)) {
      types.push('lead')
    }

    if (types.length === 0) {
      types.push('synth')
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
      { regex: /\.room\(/i, name: 'reverb' },
      { regex: /\.delay\(/i, name: 'delay' },
      { regex: /\.decay\(/i, name: 'decay' },
      { regex: /\.attack\(/i, name: 'attack' },
      { regex: /\.s\(["'](?:sawtooth|square|sine|triangle)["']\)/i, name: 'waveform' },
    ]

    effectPatterns.forEach(({ regex, name }) => {
      if (regex.test(pattern)) {
        effects.push(name)
      }
    })

    return effects
  }

  /**
   * Detect the pattern style
   */
  private detectPatternStyle(pattern: string): string {
    if (pattern.includes('.slow(')) {
      return 'sustained'
    }
    if (pattern.match(/\.fast\(4\)/)) {
      return 'sixteenths'
    }
    if (pattern.match(/\.fast\(2\)/)) {
      return 'eighths'
    }
    if (pattern.match(/decay\(0\.[01]/)) {
      return 'staccato'
    }
    return 'standard'
  }

  /**
   * Get configuration
   */
  getConfig(): Required<SynthAgentConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SynthAgentConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let synthInstance: SynthAgent | null = null

export function getSynthAgent(): SynthAgent {
  if (!synthInstance) {
    synthInstance = new SynthAgent()
  }
  return synthInstance
}

export function resetSynthAgent(): void {
  synthInstance = null
}
