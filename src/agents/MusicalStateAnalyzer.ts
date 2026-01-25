/**
 * MusicalStateAnalyzer - Analyzes Strudel patterns to extract musical state
 *
 * Generates concise summaries of the current musical state for context-aware
 * AI generation. Extracts tempo feel, energy level, active instruments, and mood.
 *
 * @references AI-008
 */

export interface MusicalState {
  /** Estimated tempo feel (slow, medium, fast) */
  tempoFeel: 'slow' | 'medium' | 'fast'
  /** Energy level from 0-100 */
  energyLevel: number
  /** Active instrument/sound categories */
  activeInstruments: string[]
  /** Current mood/vibe */
  mood: string
  /** Pattern complexity (simple, moderate, complex) */
  complexity: 'simple' | 'moderate' | 'complex'
  /** Whether pattern has bass elements */
  hasBass: boolean
  /** Whether pattern has melodic elements */
  hasMelody: boolean
  /** Whether pattern has effects (reverb, delay, etc.) */
  hasEffects: boolean
  /** Raw analysis data */
  rawAnalysis: {
    elementCount: number
    layerCount: number
    effectsUsed: string[]
    soundsUsed: string[]
  }
}

export interface MusicalStateSummary {
  /** Concise summary string for AI context (< 100 tokens) */
  summary: string
  /** Full state object */
  state: MusicalState
}

// Sound categories for analysis
const SOUND_CATEGORIES = {
  drums: ['bd', 'kick', 'sd', 'snare', 'hh', 'hihat', 'oh', 'cp', 'clap', 'rim', 'tom', 'perc'],
  bass: ['bass', 'sub', 'reese', 'sawtooth', 'square', 'triangle'],
  synth: ['synth', 'lead', 'pad', 'pluck', 'keys', 'piano', 'organ'],
  fx: ['noise', 'sweep', 'riser', 'impact', 'fx', 'atmosphere'],
  melody: ['note', 'n(', 'freq('],
}

// Effect patterns to detect
const EFFECT_PATTERNS = {
  reverb: ['.room(', '.size(', '.reverb('],
  delay: ['.delay(', '.delaytime(', '.echo('],
  filter: ['.lpf(', '.hpf(', '.cutoff(', '.resonance('],
  distortion: ['.crush(', '.distort(', '.drive('],
  modulation: ['.vibrato(', '.phaser(', '.chorus('],
  spatial: ['.pan(', '.stereo('],
}

// Mood indicators in pattern structure
const MOOD_INDICATORS = {
  dark: ['minor', 'low', 'sub', 'dark', 'deep', '.lpf(', 'slow'],
  bright: ['major', 'high', 'bright', '.hpf(', 'fast'],
  aggressive: ['crush', 'distort', 'hard', '*8', '*16'],
  dreamy: ['room(0.8', 'room(0.9', 'delay(0.5', 'slow('],
  minimal: ['~', 'sparse'],
  complex: ['euclid', 'polyrhythm', 'every('],
}

/**
 * Count occurrences of patterns in code
 */
function countPatterns(code: string, patterns: string[]): number {
  return patterns.reduce((count, pattern) => {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const matches = code.match(regex)
    return count + (matches ? matches.length : 0)
  }, 0)
}

/**
 * Detect sounds used in the pattern
 */
function detectSounds(code: string): string[] {
  const sounds: string[] = []

  // Match s("...") or sound("...") patterns
  const soundMatches = code.match(/(?:s|sound)\s*\(\s*["']([^"']+)["']/g) || []

  soundMatches.forEach(match => {
    const content = match.match(/["']([^"']+)["']/)?.[1] || ''
    // Extract individual sound names
    const soundNames = content.split(/[\s\[\]<>]+/).filter(s => s.length > 0)
    sounds.push(...soundNames)
  })

  // Also check for note() patterns
  if (code.includes('note(') || /\bn\s*\(/.test(code)) {
    sounds.push('melodic')
  }

  return [...new Set(sounds)]
}

/**
 * Detect effects used in the pattern
 */
function detectEffects(code: string): string[] {
  const effects: string[] = []

  Object.entries(EFFECT_PATTERNS).forEach(([effect, patterns]) => {
    if (patterns.some(p => code.includes(p))) {
      effects.push(effect)
    }
  })

  return effects
}

/**
 * Categorize sounds into instrument groups
 */
function categorizeSounds(sounds: string[]): string[] {
  const categories: Set<string> = new Set()

  sounds.forEach(sound => {
    const soundLower = sound.toLowerCase()
    Object.entries(SOUND_CATEGORIES).forEach(([category, patterns]) => {
      if (patterns.some(p => soundLower.includes(p) || p.includes(soundLower))) {
        categories.add(category)
      }
    })
  })

  return [...categories]
}

/**
 * Estimate energy level from pattern (0-100)
 */
function estimateEnergy(code: string, soundCount: number, effectCount: number): number {
  let energy = 30 // Base energy

  // More sounds = more energy
  energy += Math.min(soundCount * 5, 25)

  // Fast subdivisions increase energy
  const fastPatterns = (code.match(/\*\d+/g) || [])
  const maxMultiplier = fastPatterns.reduce((max, p) => {
    const num = parseInt(p.slice(1))
    return Math.max(max, num)
  }, 0)
  energy += Math.min(maxMultiplier * 2, 20)

  // Effects can increase energy
  energy += Math.min(effectCount * 3, 10)

  // Slow patterns reduce energy
  if (code.includes('.slow(')) {
    const slowMatches = code.match(/\.slow\(([0-9.]+)\)/g) || []
    slowMatches.forEach(match => {
      const slowFactor = parseFloat(match.match(/([0-9.]+)/)?.[1] || '1')
      if (slowFactor > 1) {
        energy -= Math.min(slowFactor * 5, 15)
      }
    })
  }

  // Heavy effects like distortion add energy
  if (code.includes('.crush(') || code.includes('.distort(')) {
    energy += 10
  }

  // Lots of reverb/delay = more dreamy, less energy
  if (code.includes('.room(0.9') || code.includes('.room(0.8')) {
    energy -= 10
  }

  return Math.max(0, Math.min(100, Math.round(energy)))
}

/**
 * Determine tempo feel from pattern
 */
function determineTempoFeel(code: string): 'slow' | 'medium' | 'fast' {
  // Check for slow() method
  if (code.includes('.slow(')) {
    const slowMatches = code.match(/\.slow\(([0-9.]+)\)/)
    if (slowMatches) {
      const slowFactor = parseFloat(slowMatches[1])
      if (slowFactor >= 1.5) return 'slow'
    }
  }

  // Check for fast() method
  if (code.includes('.fast(')) {
    const fastMatches = code.match(/\.fast\(([0-9.]+)\)/)
    if (fastMatches) {
      const fastFactor = parseFloat(fastMatches[1])
      if (fastFactor >= 1.5) return 'fast'
    }
  }

  // Check for high multipliers (fast pattern)
  const multipliers = (code.match(/\*(\d+)/g) || []).map(m => parseInt(m.slice(1)))
  const maxMult = Math.max(...multipliers, 0)
  if (maxMult >= 16) return 'fast'
  if (maxMult <= 2) return 'slow'

  return 'medium'
}

/**
 * Determine current mood from pattern
 */
function determineMood(code: string, energy: number, effects: string[]): string {
  const loweredCode = code.toLowerCase()
  const moods: string[] = []

  // Check mood indicators
  Object.entries(MOOD_INDICATORS).forEach(([mood, indicators]) => {
    const matches = indicators.filter(i => loweredCode.includes(i.toLowerCase()))
    if (matches.length >= 2) {
      moods.push(mood)
    }
  })

  // Energy-based mood defaults
  if (moods.length === 0) {
    if (energy >= 70) moods.push('energetic')
    else if (energy >= 50) moods.push('driving')
    else if (energy >= 30) moods.push('chill')
    else moods.push('ambient')
  }

  // Effects influence mood
  if (effects.includes('reverb') && effects.includes('delay')) {
    if (!moods.includes('dreamy')) moods.push('spacey')
  }
  if (effects.includes('distortion')) {
    if (!moods.includes('aggressive')) moods.push('gritty')
  }

  return moods.slice(0, 2).join(', ') || 'neutral'
}

/**
 * Determine pattern complexity
 */
function determineComplexity(code: string, layerCount: number, elementCount: number): 'simple' | 'moderate' | 'complex' {
  let complexityScore = 0

  // Layer count affects complexity
  complexityScore += layerCount * 2

  // Element count affects complexity
  complexityScore += elementCount

  // Advanced patterns increase complexity
  if (code.includes('euclid(')) complexityScore += 3
  if (code.includes('every(')) complexityScore += 2
  if (code.includes('sometimes(')) complexityScore += 2
  if (code.includes('.add(')) complexityScore += 2
  if (code.includes('sequence(')) complexityScore += 2

  // Nested patterns increase complexity
  const nestedBrackets = (code.match(/\[\[/g) || []).length
  complexityScore += nestedBrackets * 2

  if (complexityScore >= 15) return 'complex'
  if (complexityScore >= 8) return 'moderate'
  return 'simple'
}

/**
 * Count layers in a stack pattern
 */
function countLayers(code: string): number {
  // Check for stack() or sequence()
  if (code.includes('stack(')) {
    // Count comma-separated elements in stack
    const stackContent = code.match(/stack\s*\(([\s\S]*)\)/)
    if (stackContent) {
      // Rough count by looking for s( or sound( or note( patterns
      const layers = stackContent[1].match(/(?:s|sound|note)\s*\(/g) || []
      return Math.max(layers.length, 1)
    }
  }

  // Single pattern
  return 1
}

/**
 * Analyze a Strudel pattern and extract musical state
 */
export function analyzePattern(patternCode: string): MusicalState {
  if (!patternCode || patternCode.trim().length === 0) {
    return {
      tempoFeel: 'medium',
      energyLevel: 0,
      activeInstruments: [],
      mood: 'silent',
      complexity: 'simple',
      hasBass: false,
      hasMelody: false,
      hasEffects: false,
      rawAnalysis: {
        elementCount: 0,
        layerCount: 0,
        effectsUsed: [],
        soundsUsed: [],
      },
    }
  }

  const sounds = detectSounds(patternCode)
  const effects = detectEffects(patternCode)
  const instruments = categorizeSounds(sounds)
  const layerCount = countLayers(patternCode)

  const energy = estimateEnergy(patternCode, sounds.length, effects.length)
  const tempoFeel = determineTempoFeel(patternCode)
  const mood = determineMood(patternCode, energy, effects)
  const complexity = determineComplexity(patternCode, layerCount, sounds.length)

  return {
    tempoFeel,
    energyLevel: energy,
    activeInstruments: instruments,
    mood,
    complexity,
    hasBass: instruments.includes('bass') || sounds.some(s => s.includes('bass') || s.includes('sub')),
    hasMelody: instruments.includes('melody') || sounds.includes('melodic') || patternCode.includes('note('),
    hasEffects: effects.length > 0,
    rawAnalysis: {
      elementCount: sounds.length,
      layerCount,
      effectsUsed: effects,
      soundsUsed: sounds,
    },
  }
}

/**
 * Generate a concise summary of the musical state (< 100 tokens)
 * This summary is passed to the AI for context-aware generation (AI-008)
 */
export function generateStateSummary(state: MusicalState): string {
  const parts: string[] = []

  // Tempo feel
  parts.push(`Tempo: ${state.tempoFeel}`)

  // Energy level
  const energyDescription =
    state.energyLevel >= 80 ? 'very high' :
    state.energyLevel >= 60 ? 'high' :
    state.energyLevel >= 40 ? 'medium' :
    state.energyLevel >= 20 ? 'low' : 'very low'
  parts.push(`Energy: ${energyDescription} (${state.energyLevel}/100)`)

  // Active instruments
  if (state.activeInstruments.length > 0) {
    parts.push(`Instruments: ${state.activeInstruments.join(', ')}`)
  }

  // Mood
  parts.push(`Mood: ${state.mood}`)

  // Key characteristics
  const characteristics: string[] = []
  if (state.hasBass) characteristics.push('has bass')
  if (state.hasMelody) characteristics.push('has melody')
  if (state.hasEffects) characteristics.push('using effects')

  if (characteristics.length > 0) {
    parts.push(`Features: ${characteristics.join(', ')}`)
  }

  // Complexity
  parts.push(`Complexity: ${state.complexity}`)

  return parts.join('. ') + '.'
}

/**
 * Get full musical state summary including state object and summary string
 */
export function getMusicalStateSummary(patternCode: string | null): MusicalStateSummary {
  if (!patternCode) {
    return {
      summary: 'No pattern currently playing.',
      state: analyzePattern(''),
    }
  }

  const state = analyzePattern(patternCode)
  const summary = generateStateSummary(state)

  return { summary, state }
}

// Singleton for tracking state over time
let lastAnalyzedState: MusicalState | null = null

/**
 * Analyze pattern and track state changes
 */
export function analyzeAndTrackState(patternCode: string): {
  state: MusicalState
  summary: string
  changed: boolean
  changes: string[]
} {
  const state = analyzePattern(patternCode)
  const summary = generateStateSummary(state)

  const changes: string[] = []

  if (lastAnalyzedState) {
    if (state.energyLevel !== lastAnalyzedState.energyLevel) {
      const direction = state.energyLevel > lastAnalyzedState.energyLevel ? 'increased' : 'decreased'
      changes.push(`Energy ${direction} to ${state.energyLevel}`)
    }
    if (state.mood !== lastAnalyzedState.mood) {
      changes.push(`Mood changed to ${state.mood}`)
    }
    if (state.tempoFeel !== lastAnalyzedState.tempoFeel) {
      changes.push(`Tempo feel changed to ${state.tempoFeel}`)
    }
  }

  lastAnalyzedState = state

  return {
    state,
    summary,
    changed: changes.length > 0,
    changes,
  }
}
