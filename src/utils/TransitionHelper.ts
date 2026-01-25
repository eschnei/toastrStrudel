/**
 * TransitionHelper - Utilities for gradual and instant pattern transitions
 *
 * Provides helper functions for generating Strudel code with gradual builds,
 * instant drops, and progressive breakdowns using .slow(), .range(), and
 * other Strudel automation techniques.
 *
 * @references Phase 3 Deliverables
 */

export type TransitionType =
  | 'gradual_build'
  | 'instant_drop'
  | 'gradual_breakdown'
  | 'slow_build'
  | 'fast_build'
  | 'filter_sweep'

export interface TransitionConfig {
  /** Duration in bars/cycles */
  durationBars: number
  /** Starting value (0-1 or frequency) */
  startValue: number
  /** Ending value (0-1 or frequency) */
  endValue: number
  /** Whether to use sine curve (smoother) or linear */
  useSineCurve?: boolean
}

/**
 * Generate a filter sweep automation string
 *
 * @example
 * generateFilterSweep({ durationBars: 8, startValue: 500, endValue: 8000 })
 * // Returns: ".lpf(sine.range(500, 8000).slow(8))"
 */
export function generateFilterSweep(config: TransitionConfig): string {
  const { durationBars, startValue, endValue, useSineCurve = true } = config

  if (useSineCurve) {
    return `.lpf(sine.range(${startValue}, ${endValue}).slow(${durationBars}))`
  } else {
    // Linear ramp using saw
    return `.lpf(saw.range(${startValue}, ${endValue}).slow(${durationBars}))`
  }
}

/**
 * Generate a gain automation string
 */
export function generateGainAutomation(config: TransitionConfig): string {
  const { durationBars, startValue, endValue, useSineCurve = true } = config

  if (useSineCurve) {
    return `.gain(sine.range(${startValue}, ${endValue}).slow(${durationBars}))`
  } else {
    return `.gain(saw.range(${startValue}, ${endValue}).slow(${durationBars}))`
  }
}

/**
 * Generate a density automation pattern
 * Creates patterns that increase/decrease density over cycles
 *
 * @example
 * generateDensityAutomation({ element: 'hh', stages: [4, 8, 12, 16] })
 * // Returns: 's("hh*<4 8 12 16>")'
 */
export function generateDensityAutomation(options: {
  element: string
  stages: number[]
}): string {
  const { element, stages } = options
  return `s("${element}*<${stages.join(' ')}>")`
}

/**
 * Generate progressive layer entry pattern
 * Layers appear progressively using mask patterns
 *
 * @example
 * generateProgressiveLayer({ pattern: 's("hh*8")', appearAtCycle: 3 })
 * // Returns: 's("hh*8").mask("<0 0 0 1 1 1 1 1>")'
 */
export function generateProgressiveLayer(options: {
  pattern: string
  appearAtCycle: number
  totalCycles?: number
}): string {
  const { pattern, appearAtCycle, totalCycles = 8 } = options

  const mask = Array(totalCycles)
    .fill(0)
    .map((_, i) => (i >= appearAtCycle ? 1 : 0))
    .join(' ')

  return `${pattern}.mask("<${mask}>")`
}

/**
 * Analyze a command to determine transition type
 */
export function analyzeTransitionType(prompt: string): TransitionType {
  const lowered = prompt.toLowerCase().trim()

  // Instant transitions
  if (/\bdrop\b/.test(lowered) && !/slow|gradual|build/.test(lowered)) {
    return 'instant_drop'
  }

  // Gradual builds
  if (/slow\s*build/.test(lowered) || /gradual\s*build/.test(lowered)) {
    return 'slow_build'
  }

  if (/fast\s*build|quick\s*build/.test(lowered)) {
    return 'fast_build'
  }

  if (/\bbuild\b/.test(lowered)) {
    return 'gradual_build'
  }

  // Breakdowns
  if (/breakdown|strip\s*back/.test(lowered)) {
    return 'gradual_breakdown'
  }

  // Filter sweeps
  if (/filter|sweep/.test(lowered)) {
    return 'filter_sweep'
  }

  return 'gradual_build' // Default
}

/**
 * Get default transition configuration based on type
 */
export function getDefaultTransitionConfig(type: TransitionType): TransitionConfig {
  switch (type) {
    case 'gradual_build':
      return {
        durationBars: 8,
        startValue: 500,
        endValue: 8000,
        useSineCurve: true,
      }

    case 'slow_build':
      return {
        durationBars: 16,
        startValue: 400,
        endValue: 8000,
        useSineCurve: true,
      }

    case 'fast_build':
      return {
        durationBars: 4,
        startValue: 800,
        endValue: 8000,
        useSineCurve: false, // Linear for faster response
      }

    case 'instant_drop':
      return {
        durationBars: 1,
        startValue: 8000,
        endValue: 8000,
        useSineCurve: false,
      }

    case 'gradual_breakdown':
      return {
        durationBars: 8,
        startValue: 8000,
        endValue: 500,
        useSineCurve: true,
      }

    case 'filter_sweep':
      return {
        durationBars: 4,
        startValue: 200,
        endValue: 6000,
        useSineCurve: true,
      }
  }
}

/**
 * Build density stages for a gradual build
 */
export function getBuildDensityStages(durationBars: number): number[] {
  // Generate increasing density stages
  const stages: number[] = []
  const baseMultipliers = [4, 8, 12, 16]

  for (let i = 0; i < durationBars; i++) {
    const progress = i / (durationBars - 1)
    const stageIndex = Math.min(
      Math.floor(progress * baseMultipliers.length),
      baseMultipliers.length - 1
    )
    stages.push(baseMultipliers[stageIndex])
  }

  return stages
}

/**
 * Build gain stages for a gradual build
 */
export function getBuildGainStages(durationBars: number): number[] {
  const stages: number[] = []

  for (let i = 0; i < durationBars; i++) {
    const progress = i / (durationBars - 1)
    // Gain from 0.3 to 0.9
    const gain = 0.3 + progress * 0.6
    stages.push(Number(gain.toFixed(2)))
  }

  return stages
}

/**
 * Generate a complete build pattern template
 */
export function generateBuildTemplate(durationBars: number = 8): string {
  const filterSweep = generateFilterSweep({
    durationBars,
    startValue: 500,
    endValue: 8000,
    useSineCurve: true,
  })

  const densityStages = getBuildDensityStages(durationBars).join(' ')

  return `stack(
  s("bd*4").gain(0.8),
  s("~ sd ~ sd*<1 1 2 2 4 4 8 8>").gain(0.8),
  s("hh*<${densityStages}>").gain(sine.range(0.3, 0.7).slow(${durationBars}))${filterSweep},
  note("c3*<1 1 2 2 4 4 4 4>").s("sawtooth").lpf(sine.range(400, 4000).slow(${durationBars})).gain(sine.range(0.3, 0.7).slow(${durationBars}))
)`
}

/**
 * Generate a complete drop pattern template
 */
export function generateDropTemplate(): string {
  return `stack(
  s("bd*4").gain(0.95),
  s("~ sd ~ [sd sd]").gain(0.9),
  s("hh*16").gain(0.6).lpf(8000),
  s("~ ~ ~ cp").room(0.2).gain(0.7),
  note("<c2 c2 f2 g2>").s("sawtooth").lpf(400).gain(0.85)
)`
}

/**
 * Generate a breakdown pattern template
 */
export function generateBreakdownTemplate(): string {
  return `stack(
  s("bd ~ ~ ~").room(0.8).gain(0.5),
  note("c4 e4 g4 c5").s("pad").room(0.9).lpf(3000).gain(0.4).slow(2)
).slow(1.2)`
}

/**
 * Strudel automation patterns reference
 */
export const AUTOMATION_PATTERNS = {
  // Filter automations
  filterOpenSlow: (bars: number) =>
    `.lpf(sine.range(500, 8000).slow(${bars}))`,
  filterOpenFast: (bars: number) =>
    `.lpf(saw.range(800, 6000).slow(${bars}))`,
  filterClose: (bars: number) =>
    `.lpf(sine.range(6000, 400).slow(${bars}))`,

  // Gain automations
  gainBuild: (bars: number) =>
    `.gain(sine.range(0.3, 0.9).slow(${bars}))`,
  gainFade: (bars: number) =>
    `.gain(sine.range(0.9, 0.3).slow(${bars}))`,

  // Speed automations
  speedUp: (bars: number) =>
    `.speed(sine.range(1, 1.5).slow(${bars}))`,
  slowDown: (bars: number) =>
    `.speed(sine.range(1, 0.7).slow(${bars}))`,

  // Pan automations
  panSweep: () => `.pan(sine)`,
  panFast: () => `.pan(sine.fast(2))`,

  // Room automations
  roomBuild: (bars: number) =>
    `.room(sine.range(0.1, 0.6).slow(${bars}))`,
  roomFade: (bars: number) =>
    `.room(sine.range(0.6, 0.1).slow(${bars}))`,
}

/**
 * Check if a command implies gradual (vs instant) change
 */
export function isGradualTransition(prompt: string): boolean {
  const lowered = prompt.toLowerCase()

  // Explicit gradual indicators
  if (/slow|gradual|gentle|ease|smooth|over\s+\d+\s*bars?/.test(lowered)) {
    return true
  }

  // Explicit instant indicators
  if (/instant|sudden|immediate|now|hard\s+drop/.test(lowered)) {
    return false
  }

  // Default behaviors by command type
  if (/\bbuild\b/.test(lowered)) return true
  if (/\bdrop\b/.test(lowered)) return false
  if (/breakdown/.test(lowered)) return true

  return true // Default to gradual
}
