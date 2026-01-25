/**
 * PatternOptimizer - Performance optimization for pattern evaluation
 *
 * Provides utilities to:
 * - Profile pattern evaluation performance
 * - Detect and limit pattern complexity
 * - Optimize hot paths in pattern processing
 * - Enforce complexity limits to prevent CPU spikes
 *
 * @references PERF-001, NFR-004
 */

export interface ComplexityMetrics {
  /** Nesting depth of pattern expressions */
  nestingDepth: number
  /** Number of function calls */
  functionCallCount: number
  /** Number of pattern layers (stack/layer calls) */
  layerCount: number
  /** Number of fast/slow modifiers */
  timeModifierCount: number
  /** Estimated computation weight (0-100) */
  computationWeight: number
  /** Whether pattern exceeds complexity limits */
  exceedsLimits: boolean
  /** Specific warnings about the pattern */
  warnings: string[]
}

export interface PerformanceProfile {
  /** Time to validate pattern (ms) */
  validationTime: number
  /** Time to parse pattern (ms) */
  parseTime: number
  /** Time to evaluate pattern (ms) */
  evaluationTime: number
  /** Total processing time (ms) */
  totalTime: number
  /** Memory estimate (bytes) */
  memoryEstimate: number
  /** Whether performance is acceptable */
  acceptable: boolean
}

export interface ComplexityLimits {
  /** Maximum nesting depth allowed (default: 10) */
  maxNestingDepth: number
  /** Maximum function calls allowed (default: 100) */
  maxFunctionCalls: number
  /** Maximum layers allowed (default: 8) */
  maxLayers: number
  /** Maximum time modifiers allowed (default: 20) */
  maxTimeModifiers: number
  /** Maximum computation weight allowed (default: 80) */
  maxComputationWeight: number
  /** Pattern string length limit (default: 5000) */
  maxPatternLength: number
}

export interface OptimizationResult {
  /** Original pattern */
  original: string
  /** Optimized pattern (or original if no optimizations) */
  optimized: string
  /** Whether optimizations were applied */
  wasOptimized: boolean
  /** Description of optimizations applied */
  optimizations: string[]
  /** Complexity before optimization */
  beforeMetrics: ComplexityMetrics
  /** Complexity after optimization (if optimized) */
  afterMetrics?: ComplexityMetrics
}

// Default complexity limits
const DEFAULT_LIMITS: ComplexityLimits = {
  maxNestingDepth: 10,
  maxFunctionCalls: 100,
  maxLayers: 8,
  maxTimeModifiers: 20,
  maxComputationWeight: 80,
  maxPatternLength: 5000,
}

// Function call weights for computation estimation
const FUNCTION_WEIGHTS: Record<string, number> = {
  // Heavy operations
  stack: 5,
  layer: 5,
  superimpose: 6,
  jux: 6,
  juxBy: 7,
  off: 5,
  every: 4,
  when: 4,
  sometimes: 3,
  often: 3,
  rarely: 3,
  almostAlways: 3,
  almostNever: 3,

  // Time manipulation (medium weight)
  fast: 2,
  slow: 2,
  hurry: 3,
  rev: 3,
  palindrome: 4,
  loopAt: 3,

  // Randomness (medium weight)
  rand: 3,
  irand: 3,
  choose: 4,
  wchoose: 4,
  shuffle: 5,
  scramble: 5,
  degrade: 2,
  degradeBy: 2,

  // Pattern structure (medium weight)
  euclid: 3,
  euclidRot: 4,
  struct: 2,
  mask: 2,
  arp: 4,

  // Effects (low weight)
  gain: 1,
  pan: 1,
  room: 1,
  delay: 2,
  lpf: 1,
  hpf: 1,
  shape: 2,
  crush: 2,

  // Basic (minimal weight)
  s: 1,
  sound: 1,
  note: 1,
  n: 1,
}

// Layering functions that increase complexity significantly
const LAYERING_FUNCTIONS = new Set([
  'stack', 'layer', 'superimpose', 'jux', 'juxBy', 'off', 'stut', 'echo',
])

// Time modifiers that can cause exponential complexity
const TIME_MODIFIERS = new Set([
  'fast', 'slow', 'hurry', 'every', 'rev', 'palindrome', 'loopAt',
])

/**
 * Analyzes the complexity of a Strudel pattern
 */
export function analyzeComplexity(
  code: string,
  limits: Partial<ComplexityLimits> = {}
): ComplexityMetrics {
  const effectiveLimits = { ...DEFAULT_LIMITS, ...limits }
  const warnings: string[] = []

  // Check pattern length
  if (code.length > effectiveLimits.maxPatternLength) {
    warnings.push(`Pattern length (${code.length}) exceeds limit (${effectiveLimits.maxPatternLength})`)
  }

  // Analyze nesting depth
  const nestingDepth = calculateNestingDepth(code)
  if (nestingDepth > effectiveLimits.maxNestingDepth) {
    warnings.push(`Nesting depth (${nestingDepth}) exceeds limit (${effectiveLimits.maxNestingDepth})`)
  }

  // Count function calls
  const functionCalls = extractFunctionCalls(code)
  const functionCallCount = functionCalls.length
  if (functionCallCount > effectiveLimits.maxFunctionCalls) {
    warnings.push(`Function call count (${functionCallCount}) exceeds limit (${effectiveLimits.maxFunctionCalls})`)
  }

  // Count layers
  const layerCount = functionCalls.filter(f => LAYERING_FUNCTIONS.has(f)).length
  if (layerCount > effectiveLimits.maxLayers) {
    warnings.push(`Layer count (${layerCount}) exceeds limit (${effectiveLimits.maxLayers})`)
  }

  // Count time modifiers
  const timeModifierCount = functionCalls.filter(f => TIME_MODIFIERS.has(f)).length
  if (timeModifierCount > effectiveLimits.maxTimeModifiers) {
    warnings.push(`Time modifier count (${timeModifierCount}) exceeds limit (${effectiveLimits.maxTimeModifiers})`)
  }

  // Calculate computation weight
  const computationWeight = calculateComputationWeight(functionCalls, nestingDepth, layerCount)
  if (computationWeight > effectiveLimits.maxComputationWeight) {
    warnings.push(`Computation weight (${computationWeight}) exceeds limit (${effectiveLimits.maxComputationWeight})`)
  }

  // Check for potentially dangerous patterns
  checkDangerousPatterns(code, warnings)

  return {
    nestingDepth,
    functionCallCount,
    layerCount,
    timeModifierCount,
    computationWeight,
    exceedsLimits: warnings.length > 0,
    warnings,
  }
}

/**
 * Calculate nesting depth by counting parentheses
 */
function calculateNestingDepth(code: string): number {
  let maxDepth = 0
  let currentDepth = 0

  for (const char of code) {
    if (char === '(' || char === '[' || char === '{') {
      currentDepth++
      maxDepth = Math.max(maxDepth, currentDepth)
    } else if (char === ')' || char === ']' || char === '}') {
      currentDepth = Math.max(0, currentDepth - 1)
    }
  }

  return maxDepth
}

/**
 * Extract all function calls from pattern code
 */
function extractFunctionCalls(code: string): string[] {
  const functionCallRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
  const calls: string[] = []
  let match

  while ((match = functionCallRegex.exec(code)) !== null) {
    calls.push(match[1])
  }

  return calls
}

/**
 * Calculate computation weight based on function complexity
 */
function calculateComputationWeight(
  functionCalls: string[],
  nestingDepth: number,
  layerCount: number
): number {
  // Base weight from functions
  let weight = functionCalls.reduce((sum, func) => {
    return sum + (FUNCTION_WEIGHTS[func] || 1)
  }, 0)

  // Nesting multiplier (exponential impact)
  weight *= 1 + (nestingDepth * 0.1)

  // Layer multiplier (layers compound complexity)
  weight *= 1 + (layerCount * 0.15)

  // Normalize to 0-100 scale
  return Math.min(100, Math.round(weight))
}

/**
 * Check for patterns that could cause performance issues
 */
function checkDangerousPatterns(code: string, warnings: string[]): void {
  // Recursive fast/slow (e.g., fast(16).fast(16))
  if (/fast\s*\([^)]*\)\s*\.\s*fast\s*\(/i.test(code)) {
    warnings.push('Multiple chained fast() calls can cause exponential event creation')
  }

  // Very high subdivision
  const highSubdiv = code.match(/\*(\d+)/g)
  if (highSubdiv) {
    for (const match of highSubdiv) {
      const num = parseInt(match.substring(1))
      if (num > 32) {
        warnings.push(`High subdivision (*${num}) can cause performance issues`)
      }
    }
  }

  // Deep stack nesting
  const stackMatches = code.match(/stack\s*\(/g)
  if (stackMatches && stackMatches.length > 5) {
    warnings.push(`Multiple stack() calls (${stackMatches.length}) may impact performance`)
  }

  // Randomness in fast patterns
  if (/fast\s*\([^)]*\d{2,}[^)]*\)[^)]*\.(rand|choose|shuffle)/i.test(code)) {
    warnings.push('Randomness combined with fast subdivision can be CPU intensive')
  }
}

/**
 * Profile pattern evaluation performance
 */
export async function profilePattern(
  code: string,
  validateFn?: (code: string) => { valid: boolean },
  evaluateFn?: (code: string) => Promise<void>
): Promise<PerformanceProfile> {
  const startTotal = performance.now()

  // Validation timing
  let validationTime = 0
  if (validateFn) {
    const startValidation = performance.now()
    validateFn(code)
    validationTime = performance.now() - startValidation
  }

  // Parse timing (complexity analysis)
  const startParse = performance.now()
  analyzeComplexity(code)
  const parseTime = performance.now() - startParse

  // Evaluation timing (if evaluator provided)
  let evaluationTime = 0
  if (evaluateFn) {
    const startEval = performance.now()
    try {
      await evaluateFn(code)
    } catch {
      // Evaluation failed - still record time
    }
    evaluationTime = performance.now() - startEval
  }

  const totalTime = performance.now() - startTotal

  // Estimate memory (rough approximation based on code complexity)
  const metrics = analyzeComplexity(code)
  const memoryEstimate = estimateMemoryUsage(code, metrics)

  // Performance is acceptable if total time < 100ms and memory < 10MB
  const acceptable = totalTime < 100 && memoryEstimate < 10 * 1024 * 1024

  return {
    validationTime,
    parseTime,
    evaluationTime,
    totalTime,
    memoryEstimate,
    acceptable,
  }
}

/**
 * Estimate memory usage based on pattern complexity
 */
function estimateMemoryUsage(code: string, metrics: ComplexityMetrics): number {
  // Base memory for code string
  let memory = code.length * 2 // UTF-16 characters

  // Memory per function call (rough estimate)
  memory += metrics.functionCallCount * 1024

  // Memory per layer (patterns are duplicated)
  memory += metrics.layerCount * code.length * 2

  // Memory for time modifiers (event multiplication)
  memory += metrics.timeModifierCount * 2048

  // Nesting depth increases memory requirements
  memory *= 1 + (metrics.nestingDepth * 0.1)

  return Math.round(memory)
}

/**
 * Attempt to optimize a pattern for better performance
 */
export function optimizePattern(
  code: string,
  limits: Partial<ComplexityLimits> = {}
): OptimizationResult {
  const beforeMetrics = analyzeComplexity(code, limits)
  const optimizations: string[] = []
  let optimized = code

  // Skip optimization if pattern is within limits
  if (!beforeMetrics.exceedsLimits) {
    return {
      original: code,
      optimized: code,
      wasOptimized: false,
      optimizations: [],
      beforeMetrics,
    }
  }

  // Optimization 1: Reduce excessive fast() multipliers
  optimized = optimized.replace(/\.fast\s*\(\s*(\d+)\s*\)/g, (match, num) => {
    const n = parseInt(num)
    if (n > 16) {
      optimizations.push(`Reduced fast(${n}) to fast(16)`)
      return '.fast(16)'
    }
    return match
  })

  // Optimization 2: Reduce excessive subdivision
  optimized = optimized.replace(/\*(\d+)/g, (match, num) => {
    const n = parseInt(num)
    if (n > 32) {
      optimizations.push(`Reduced subdivision *${n} to *32`)
      return '*32'
    }
    return match
  })

  // Optimization 3: Simplify chained time modifiers
  optimized = optimized.replace(
    /\.fast\s*\([^)]+\)\s*\.fast\s*\([^)]+\)/g,
    (match) => {
      optimizations.push('Merged chained fast() calls')
      // Extract both multipliers and combine them
      const nums = match.match(/\d+/g)
      if (nums && nums.length >= 2) {
        const combined = Math.min(16, parseInt(nums[0]) * parseInt(nums[1]))
        return `.fast(${combined})`
      }
      return '.fast(8)'
    }
  )

  // Optimization 4: Add degradeBy for very complex patterns
  if (beforeMetrics.computationWeight > 70 && !code.includes('degradeBy')) {
    if (!optimized.startsWith('stack(')) {
      optimized = `${optimized}.degradeBy(0.1)`
      optimizations.push('Added degradeBy(0.1) to reduce event density')
    }
  }

  const afterMetrics = analyzeComplexity(optimized, limits)

  return {
    original: code,
    optimized,
    wasOptimized: optimizations.length > 0,
    optimizations,
    beforeMetrics,
    afterMetrics,
  }
}

/**
 * Check if a pattern is safe to evaluate
 */
export function isPatternSafe(
  code: string,
  limits: Partial<ComplexityLimits> = {}
): { safe: boolean; reason?: string } {
  const metrics = analyzeComplexity(code, limits)

  if (metrics.exceedsLimits) {
    return {
      safe: false,
      reason: metrics.warnings.join('; '),
    }
  }

  return { safe: true }
}

/**
 * Create a performance-aware wrapper for pattern evaluation
 */
export function createThrottledEvaluator(
  evaluateFn: (code: string) => Promise<void>,
  options: {
    minInterval?: number    // Minimum ms between evaluations (default: 50)
    maxQueueSize?: number   // Maximum queued evaluations (default: 3)
    enableProfiling?: boolean
  } = {}
): {
  evaluate: (code: string) => Promise<void>
  getStats: () => { evaluations: number; skipped: number; avgTime: number }
} {
  const minInterval = options.minInterval ?? 50
  const maxQueueSize = options.maxQueueSize ?? 3

  let lastEvalTime = 0
  let evaluationCount = 0
  let skippedCount = 0
  let totalTime = 0
  let queue: string[] = []
  let isProcessing = false

  async function processQueue(): Promise<void> {
    if (isProcessing || queue.length === 0) return

    isProcessing = true

    while (queue.length > 0) {
      const code = queue.shift()!
      const now = performance.now()
      const elapsed = now - lastEvalTime

      // Wait if needed
      if (elapsed < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - elapsed))
      }

      const start = performance.now()
      try {
        await evaluateFn(code)
        evaluationCount++
        totalTime += performance.now() - start
      } catch (error) {
        console.warn('[PatternOptimizer] Evaluation error:', error)
      }
      lastEvalTime = performance.now()
    }

    isProcessing = false
  }

  return {
    async evaluate(code: string): Promise<void> {
      // Check if pattern is safe
      const safety = isPatternSafe(code)
      if (!safety.safe) {
        console.warn('[PatternOptimizer] Pattern may cause performance issues:', safety.reason)
        // Attempt optimization
        const optimized = optimizePattern(code)
        if (optimized.wasOptimized) {
          code = optimized.optimized
          console.log('[PatternOptimizer] Pattern optimized:', optimized.optimizations)
        }
      }

      // Add to queue, dropping oldest if full
      queue.push(code)
      if (queue.length > maxQueueSize) {
        queue.shift()
        skippedCount++
      }

      await processQueue()
    },

    getStats() {
      return {
        evaluations: evaluationCount,
        skipped: skippedCount,
        avgTime: evaluationCount > 0 ? totalTime / evaluationCount : 0,
      }
    },
  }
}

/**
 * Pattern complexity guidelines for documentation
 */
export const COMPLEXITY_GUIDELINES = `
# Pattern Complexity Guidelines

## Safe Patterns (Low Complexity)
- Simple patterns with 1-3 layers
- Subdivisions up to *16
- Nesting depth up to 5

Example:
\`\`\`javascript
stack(
  s("bd sd bd sd").gain(0.8),
  s("hh*8").gain(0.4)
)
\`\`\`

## Moderate Patterns (Medium Complexity)
- 4-6 layers
- Subdivisions up to *32
- Nesting depth up to 8
- Some randomness/variation

Example:
\`\`\`javascript
stack(
  s("bd*4").gain(0.8),
  s("~ sd ~ sd").delay(0.2),
  s("hh*16").degradeBy(0.3).lpf(4000),
  s("~ ~ ~ cp").room(0.5)
)
\`\`\`

## Complex Patterns (High Complexity)
- 7-8 layers
- Multiple time modifiers
- Heavy use of randomness
- Consider using degradeBy() to reduce density

Example:
\`\`\`javascript
stack(
  s("bd*4").every(4, fast(2)),
  s("sd:5").euclidRot(3,8).slow(2),
  s("hh*16").sometimes(x => x.fast(2)),
  s("cp").degrade().room(0.8)
).degradeBy(0.1)
\`\`\`

## Patterns to Avoid
- Chained fast() calls: \`.fast(4).fast(4)\`
- Very high subdivisions: \`*64\` or higher
- Deeply nested layers (>8)
- Complex randomness in fast patterns

## Performance Tips
1. Use \`degradeBy(0.1-0.3)\` to reduce event density
2. Keep subdivisions at *16 or lower
3. Limit layers to 6 for real-time performance
4. Use \`lpf()\` to reduce high-frequency content processing
5. Avoid nested \`stack()\` calls when possible
`

// Export types
export type { ComplexityLimits, ComplexityMetrics, PerformanceProfile, OptimizationResult }
