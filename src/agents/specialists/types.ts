/**
 * Inter-Agent Protocol Types
 *
 * Defines the message format, context passing, and response structures
 * for communication between the Conductor and specialist agents.
 *
 * @references Phase 4 Task 4.2.1: Inter-Agent Protocol
 */

/**
 * Shared musical context passed to all agents
 */
export interface AgentContext {
  /** Current BPM */
  bpm: number
  /** Musical key (e.g., "Am", "C", "F#m") */
  key: string
  /** Scale type (e.g., "minor", "major", "dorian") */
  scale: string
  /** Current energy level (0-100) */
  energyLevel: number
  /** Optional genre hint */
  genre?: string
  /** Optional root note for bass/chord reference */
  rootNote?: string
  /** Current bar position in arrangement */
  currentBar?: number
  /** Time signature (default 4/4) */
  timeSignature?: [number, number]
}

/**
 * Message types for agent communication
 */
export type AgentMessageType =
  | 'generate' // Generate new pattern
  | 'modify' // Modify existing pattern
  | 'sync' // Synchronize with other layers
  | 'query' // Query for information

/**
 * Message sent from Conductor to specialist agents
 */
export interface AgentMessage {
  /** Type of message */
  type: AgentMessageType
  /** The prompt/instruction for generation */
  prompt: string
  /** Shared musical context */
  context: AgentContext
  /** Existing pattern to modify (for 'modify' type) */
  currentPattern?: string
  /** Patterns from other layers (for context) */
  otherLayers?: {
    drums?: string
    bass?: string
    synth?: string
    fx?: string
  }
  /** Priority level for conflict resolution */
  priority?: 'high' | 'normal' | 'low'
  /** Request ID for tracking */
  requestId?: string
}

/**
 * Response from specialist agents back to Conductor
 */
export interface AgentResponse {
  /** The generated Strudel pattern */
  pattern: string
  /** Whether generation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Layer type this response is for */
  layerType: 'drums' | 'bass' | 'synth' | 'fx'
  /** Estimated frequency range used */
  frequencyRange?: {
    low: number
    high: number
  }
  /** Rhythmic density (notes per bar estimate) */
  rhythmicDensity?: number
  /** Suggested energy level for this layer */
  suggestedEnergy?: number
  /** Any warnings (e.g., potential conflicts) */
  warnings?: string[]
  /** Metadata about the generated pattern */
  metadata?: {
    instruments?: string[]
    effects?: string[]
    rhythmType?: string
  }
}

/**
 * Specialist agent interface - implemented by Drums, Bass, Synth, FX agents
 */
export interface SpecialistAgent {
  /** Agent identifier */
  readonly name: 'drums' | 'bass' | 'synth' | 'fx'

  /** Check if agent is available */
  isAvailable(): boolean

  /** Generate a pattern based on the message and context */
  generate(message: AgentMessage, context: AgentContext): Promise<AgentResponse>

  /** Modify an existing pattern */
  modify?(
    currentPattern: string,
    instruction: string,
    context: AgentContext
  ): Promise<AgentResponse>

  /** Get default pattern for this layer */
  getDefaultPattern(context: AgentContext): string
}

/**
 * Conflict between layers
 */
export interface LayerConflict {
  /** Type of conflict */
  type: 'frequency' | 'rhythm' | 'timing'
  /** Layers involved */
  layers: Array<'drums' | 'bass' | 'synth' | 'fx'>
  /** Description of the conflict */
  description: string
  /** Severity (0-100) */
  severity: number
  /** Suggested resolution */
  suggestion?: string
}

/**
 * Resolution strategy for conflicts
 */
export type ConflictResolutionStrategy =
  | 'priority' // Higher priority layer wins
  | 'modification' // Modify conflicting layer
  | 'veto' // Remove conflicting element entirely
  | 'merge' // Try to merge/blend the conflicts

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  /** Original conflict */
  conflict: LayerConflict
  /** Strategy used */
  strategy: ConflictResolutionStrategy
  /** Which layer was modified */
  modifiedLayer: 'drums' | 'bass' | 'synth' | 'fx'
  /** Original pattern */
  originalPattern: string
  /** Modified pattern */
  resolvedPattern: string
  /** Was resolution successful */
  success: boolean
}

/**
 * Layer priority order (default)
 * Higher index = higher priority
 */
export const DEFAULT_LAYER_PRIORITY: Record<'drums' | 'bass' | 'synth' | 'fx', number> = {
  fx: 0, // Lowest - most flexible
  synth: 1,
  bass: 2,
  drums: 3, // Highest - rhythmic foundation
}

/**
 * Frequency ranges for each layer type (Hz)
 */
export const LAYER_FREQUENCY_RANGES: Record<
  'drums' | 'bass' | 'synth' | 'fx',
  { low: number; high: number }
> = {
  drums: { low: 30, high: 15000 }, // Full range (kick to hats)
  bass: { low: 30, high: 250 }, // Sub to low-mid
  synth: { low: 200, high: 8000 }, // Low-mid to presence
  fx: { low: 500, high: 16000 }, // Mid to high (atmosphere, air)
}

/**
 * Check if two frequency ranges overlap
 */
export function frequencyRangesOverlap(
  range1: { low: number; high: number },
  range2: { low: number; high: number }
): boolean {
  return range1.low <= range2.high && range2.low <= range1.high
}

/**
 * Calculate overlap percentage between two frequency ranges
 */
export function frequencyOverlapPercentage(
  range1: { low: number; high: number },
  range2: { low: number; high: number }
): number {
  if (!frequencyRangesOverlap(range1, range2)) return 0

  const overlapLow = Math.max(range1.low, range2.low)
  const overlapHigh = Math.min(range1.high, range2.high)
  const overlapSize = overlapHigh - overlapLow

  const smallerRange = Math.min(
    range1.high - range1.low,
    range2.high - range2.low
  )

  return (overlapSize / smallerRange) * 100
}

/**
 * Create a default context with sensible defaults
 */
export function createDefaultContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    bpm: 128,
    key: 'Am',
    scale: 'minor',
    energyLevel: 50,
    timeSignature: [4, 4],
    ...overrides,
  }
}

/**
 * Create an agent message for generation
 */
export function createGenerateMessage(
  prompt: string,
  context: AgentContext,
  options?: Partial<AgentMessage>
): AgentMessage {
  return {
    type: 'generate',
    prompt,
    context,
    priority: 'normal',
    requestId: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...options,
  }
}

/**
 * Create an agent message for modification
 */
export function createModifyMessage(
  prompt: string,
  currentPattern: string,
  context: AgentContext,
  options?: Partial<AgentMessage>
): AgentMessage {
  return {
    type: 'modify',
    prompt,
    context,
    currentPattern,
    priority: 'normal',
    requestId: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...options,
  }
}
