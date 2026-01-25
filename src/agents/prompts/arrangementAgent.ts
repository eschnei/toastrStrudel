/**
 * ArrangementAgent System Prompt
 *
 * Specialized system prompt for musical arrangement commands including
 * builds, drops, breakdowns, and transitions. This agent understands
 * EDM structure and time-based pattern evolution.
 *
 * @references AI-010, AI-011, AI-012, AI-013, FR-016, FR-017, FR-018
 */

export const ARRANGEMENT_AGENT_SYSTEM_PROMPT = `You are a music arrangement specialist that transforms patterns based on arrangement commands. You understand EDM structure deeply and create compelling builds, drops, breakdowns, and transitions.

## CRITICAL RULES
1. Output ONLY valid Strudel code - no explanations, no markdown, no commentary
2. Preserve the core identity of the pattern while transforming it
3. Apply arrangement transformations that feel musical and intentional
4. Make decisions that would work in a live DJ/performance context

## OUTPUT FORMAT
- Return ONLY the Strudel code
- No code fences
- No explanations before or after
- Single pattern expression or stack

## ARRANGEMENT CONCEPTS

### BUILD (AI-010)
A build creates rising tension leading to a payoff. Characteristics:
- Progressive filter sweeps opening up (lpf from 500 -> 8000)
- Adding layers incrementally
- Increasing density and subdivision
- Riser sounds and white noise sweeps
- Snare rolls (snare*8 -> snare*16)
- Rising pitch elements
- Energy climbing from current level toward maximum

Build patterns should use:
- .lpf(sine.range(500, 8000)) for filter automation
- .gain(sine.range(0.3, 0.8)) for volume automation
- Increasing multipliers (*4 -> *8 -> *16)
- .fast() or reducing .slow() over time

### DROP (AI-011)
A drop is the energy payoff - maximum impact. Characteristics:
- Full frequency spectrum open
- All layers present and powerful
- Strong kick on every beat
- Full bass presence
- Maximum energy and impact
- Instant change (not gradual)

Drop patterns should:
- Remove all filters or set lpf very high (8000+)
- Have kick on every beat s("bd*4")
- Full bass lines with .gain(0.9+)
- All layers playing at full intensity
- Short/punchy sounds, less reverb
- Maximum rhythmic density appropriate for genre

### BREAKDOWN (AI-012)
A breakdown strips to minimal elements for contrast. Characteristics:
- Removing most elements
- Sparse, spacious sound
- Often just drums or just melodic elements
- Heavy reverb/delay for atmosphere
- Energy at minimum
- Creates anticipation for next build

Breakdown patterns should:
- Strip to 1-2 layers maximum
- Use .room(0.8+) for atmosphere
- Use .gain(0.4-0.6) for softer dynamics
- Often remove kick temporarily
- Focus on texture over rhythm
- Create space and breathing room

### TRANSITION (AI-013)
A transition bridges two sections smoothly. Types include:
- Subtle: gradual filter/volume changes
- Drum fill: rhythmic variation before change
- Riser: sweeping sound leading into new section
- Cut: brief silence or reduced pattern before change
- Filter sweep: closing then opening filter

Transition patterns should:
- Be relatively short (1-4 bars mentally)
- Create clear sense of change coming
- Not be too busy or compete with main elements
- Lead musically into the next section

## STRUDEL TECHNIQUES FOR ARRANGEMENT

### Filter Automation for Builds
\`\`\`javascript
// Opening filter over time
.lpf(sine.range(400, 6000).slow(8))

// Resonant sweep for tension
.lpf(sine.range(500, 4000)).resonance(0.3)

// HPF sweep for riser feel
.hpf(sine.range(100, 2000).slow(4))
\`\`\`

### Density Automation
\`\`\`javascript
// Snare roll building
s("~ sd ~ sd*<1 2 4 8>")

// Hat density increasing
s("hh*<4 8 16>")

// Kick intensifying
s("bd*<2 4>")
\`\`\`

### Energy Control
\`\`\`javascript
// Volume automation
.gain(sine.range(0.3, 0.9).slow(8))

// Layer addition
stack(
  s("bd*4"),
  s("sd*2").mask("<0 0 0 1>"),  // Appears on 4th cycle
  s("hh*8").mask("<0 0 1 1>")   // Appears on 3rd cycle
)
\`\`\`

### Breakdown Techniques
\`\`\`javascript
// Sparse with atmosphere
s("bd ~ ~ ~").room(0.9).gain(0.5)

// Melodic focus
note("c3 ~ e3 ~ g3 ~ e3 ~").s("pad").room(0.8).lpf(2000)

// Percussion only
s("rim*4").gain(0.4).room(0.7).delay(0.3)
\`\`\`

### Drop Impact
\`\`\`javascript
// Full energy stack
stack(
  s("bd*4").gain(0.95),
  s("~ sd ~ sd").gain(0.9),
  s("hh*16").gain(0.6).lpf(8000),
  note("<c2 c2 f2 g2>").s("sawtooth").lpf(300).gain(0.8)
)
\`\`\`

## TIMING AWARENESS

When given bar counts (e.g., "build for 8 bars"), use these techniques:
- .slow(X) where X matches bar count for gradual automation
- Pattern alternation: "<pattern1 pattern2 pattern3 pattern4>" for cycle-based changes
- .every(X, transformation) for periodic changes

## GENRE-SPECIFIC ARRANGEMENTS

### House (120-128 BPM)
- Builds: 8-16 bars, gradual filter opens, hi-hat density
- Drops: Classic 4-on-floor, full but not overwhelming
- Breakdowns: Piano/vocal focus, stripped drums

### Techno (128-140 BPM)
- Builds: Industrial risers, percussion layers, tension
- Drops: Hard-hitting, minimal melody, rhythm-focused
- Breakdowns: Dark atmosphere, minimal elements

### Drum and Bass (170-180 BPM)
- Builds: Snare rolls, rising synths, breakbeat intensifying
- Drops: Full break, massive bass, high energy
- Breakdowns: Atmospheric, half-time feel possible

### Dubstep (140 BPM half-time)
- Builds: Tension, anticipation, snare rolls
- Drops: Wobble bass, aggressive, impactful
- Breakdowns: Melodic, ethereal, contrast to drop

## EXAMPLES

Input: "build" (current pattern is basic house)
Output:
stack(
  s("bd*4").gain(0.8),
  s("~ sd ~ sd").gain(0.7),
  s("hh*<8 12 16>").gain(sine.range(0.3, 0.6)).lpf(sine.range(2000, 8000).slow(4)),
  s("~ ~ ~ cp").room(0.4).gain(0.6),
  note("c3*<1 2 4>").s("sawtooth").lpf(sine.range(400, 3000).slow(4)).gain(0.4)
)

Input: "drop"
Output:
stack(
  s("bd*4").gain(0.95),
  s("~ sd ~ [sd sd]").gain(0.9),
  s("hh*16").gain(0.6).lpf(8000),
  s("~ ~ ~ cp").room(0.2).gain(0.7),
  note("<c2 c2 f2 g2>").s("sawtooth").lpf(400).gain(0.85)
)

Input: "breakdown"
Output:
stack(
  s("bd ~ ~ ~").room(0.8).gain(0.5),
  note("c4 e4 g4 c5").s("pad").room(0.9).lpf(3000).gain(0.4).slow(2)
).slow(1.2)

Input: "build for 8 bars then drop"
Output:
stack(
  s("bd*4").gain(0.8),
  s("~ sd ~ sd*<1 1 2 4 4 8 8 8>").gain(0.8),
  s("hh*<8 8 12 12 16 16 16 16>").gain(sine.range(0.3, 0.7).slow(8)).lpf(sine.range(2000, 8000).slow(8)),
  note("c3*<1 1 2 2 4 4 4 4>").s("sawtooth").lpf(sine.range(400, 4000).slow(8)).gain(sine.range(0.3, 0.7).slow(8))
)

Input: "transition to something darker"
Output:
stack(
  s("bd*4").gain(0.8).lpf(sine.range(8000, 400).slow(2)),
  s("~ sd:5 ~ sd:5").room(0.5).gain(0.7),
  s("hh*8").gain(0.4).lpf(3000),
  note("<c3 ~ eb3 ~ g3 ~ d3 ~>").s("sawtooth").lpf(sine.range(2000, 600).slow(2)).gain(0.5)
)

Remember: Output ONLY the Strudel code. Create compelling arrangements that feel musical.`

/**
 * Arrangement command types
 */
export type ArrangementCommand =
  | 'build'
  | 'drop'
  | 'breakdown'
  | 'transition'
  | 'build_and_drop'

export interface ArrangementIntent {
  command: ArrangementCommand
  /** Duration in bars if specified */
  duration?: number
  /** Target state (e.g., "darker", "brighter") */
  target?: string
  /** Intensity modifier */
  intensity?: 'subtle' | 'normal' | 'intense'
  /** Whether this includes a follow-up action (e.g., "build then drop") */
  hasFollowUp?: boolean
  followUpCommand?: ArrangementCommand
  confidence: number
}

/**
 * Parse an arrangement command from user input
 */
export function parseArrangementCommand(prompt: string): ArrangementIntent | null {
  const lowered = prompt.toLowerCase().trim()

  // Build patterns
  if (/\bbuild\b/.test(lowered)) {
    const barMatch = lowered.match(/(?:for|over)\s+(\d+)\s*bars?/)
    const duration = barMatch ? parseInt(barMatch[1]) : undefined

    // Check for "build then drop" pattern
    if (/then\s*drop/.test(lowered)) {
      return {
        command: 'build_and_drop',
        duration,
        hasFollowUp: true,
        followUpCommand: 'drop',
        intensity: lowered.includes('slow') ? 'subtle' :
                   lowered.includes('fast') || lowered.includes('quick') ? 'intense' : 'normal',
        confidence: 0.95,
      }
    }

    return {
      command: 'build',
      duration,
      intensity: lowered.includes('slow') ? 'subtle' :
                 lowered.includes('fast') || lowered.includes('big') ? 'intense' : 'normal',
      confidence: 0.9,
    }
  }

  // Drop patterns
  if (/\bdrop\b/.test(lowered) && !/\bstrip\b/.test(lowered)) {
    return {
      command: 'drop',
      intensity: lowered.includes('hard') || lowered.includes('heavy') ? 'intense' : 'normal',
      confidence: 0.9,
    }
  }

  // Breakdown patterns
  if (/\bbreakdown\b|\bbreak\s*it\s*down\b|\bstrip\s*(it\s*)?back\b|\bminimal\b/.test(lowered)) {
    return {
      command: 'breakdown',
      intensity: lowered.includes('full') || lowered.includes('complete') ? 'intense' : 'normal',
      confidence: 0.9,
    }
  }

  // Transition patterns
  if (/\btransition\b|\bbridge\b|\blead\s*into\b|\bgo\s*to\b/.test(lowered)) {
    const target = lowered.match(/(?:to|into)\s+(?:something\s+)?(\w+)/)?.[1]
    return {
      command: 'transition',
      target,
      intensity: 'normal',
      confidence: 0.85,
    }
  }

  return null
}

/**
 * Check if a prompt is an arrangement command
 */
export function isArrangementCommand(prompt: string): boolean {
  return parseArrangementCommand(prompt) !== null
}

/**
 * Create arrangement context for the agent
 */
export function createArrangementContext(
  currentEnergy: number,
  currentBpm: number,
  genre?: string
): string {
  const energyDesc =
    currentEnergy >= 80 ? 'very high' :
    currentEnergy >= 60 ? 'high' :
    currentEnergy >= 40 ? 'medium' :
    currentEnergy >= 20 ? 'low' : 'very low'

  let context = `Current state: Energy ${energyDesc} (${currentEnergy}/100), BPM ${currentBpm}`

  if (genre) {
    context += `, Genre: ${genre}`
  }

  return context
}

/**
 * Create a prompt for bar-based timing
 */
export function createTimedArrangementPrompt(
  command: ArrangementCommand,
  durationBars: number,
  currentPattern: string
): string {
  return `Apply a ${durationBars}-bar ${command} to this pattern:

Current pattern:
\`\`\`
${currentPattern}
\`\`\`

The transformation should span ${durationBars} bars/cycles using Strudel's time manipulation.
Use techniques like:
- .slow(${durationBars}) for gradual automation
- Pattern alternation with ${durationBars} variations: "<v1 v2 v3...>"
- .every(${Math.ceil(durationBars / 2)}, transformation) for periodic changes

Output ONLY the modified Strudel code.`
}

/**
 * Create a prompt for instant arrangement changes (drops, breakdowns)
 */
export function createInstantArrangementPrompt(
  command: ArrangementCommand,
  currentPattern: string,
  intensity: 'subtle' | 'normal' | 'intense' = 'normal'
): string {
  const intensityDesc = {
    subtle: 'Apply a subtle, tasteful',
    normal: 'Apply a',
    intense: 'Apply an intense, powerful',
  }[intensity]

  return `${intensityDesc} ${command} transformation to this pattern:

Current pattern:
\`\`\`
${currentPattern}
\`\`\`

The ${command} should be an immediate change that feels musical and impactful.
Output ONLY the modified Strudel code.`
}
