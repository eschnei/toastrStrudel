/**
 * Specialist Agents Index
 *
 * Exports all specialist agents and their types for the multi-agent
 * orchestration system.
 */

// Types
export * from './types'

// Drums Agent
export {
  DrumsAgent,
  getDrumsAgent,
  resetDrumsAgent,
} from './DrumsAgent'
export type { DrumsAgentConfig } from './DrumsAgent'

// Bass Agent
export {
  BassAgent,
  getBassAgent,
  resetBassAgent,
} from './BassAgent'
export type { BassAgentConfig } from './BassAgent'

// Synth Agent
export {
  SynthAgent,
  getSynthAgent,
  resetSynthAgent,
} from './SynthAgent'
export type { SynthAgentConfig } from './SynthAgent'

// FX Agent
export {
  FXAgent,
  getFXAgent,
  resetFXAgent,
} from './FXAgent'
export type { FXAgentConfig } from './FXAgent'

// Convenience function to get all specialists
import { getDrumsAgent } from './DrumsAgent'
import { getBassAgent } from './BassAgent'
import { getSynthAgent } from './SynthAgent'
import { getFXAgent } from './FXAgent'

export function getAllSpecialists() {
  return {
    drums: getDrumsAgent(),
    bass: getBassAgent(),
    synth: getSynthAgent(),
    fx: getFXAgent(),
  }
}

// Reset all specialists
import { resetDrumsAgent } from './DrumsAgent'
import { resetBassAgent } from './BassAgent'
import { resetSynthAgent } from './SynthAgent'
import { resetFXAgent } from './FXAgent'

export function resetAllSpecialists(): void {
  resetDrumsAgent()
  resetBassAgent()
  resetSynthAgent()
  resetFXAgent()
}
