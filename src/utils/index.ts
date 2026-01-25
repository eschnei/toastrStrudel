// Helper functions
export {
  PatternHistory,
  getPatternHistory,
  resetPatternHistory,
} from './PatternHistory'
export type { PatternHistoryEntry, PatternHistoryConfig } from './PatternHistory'

export {
  SnapshotManager,
  getSnapshotManager,
  resetSnapshotManager,
} from './SnapshotManager'
export type { Snapshot, SnapshotManagerConfig } from './SnapshotManager'

export * from './browser'

// Transition helpers
export {
  generateFilterSweep,
  generateGainAutomation,
  generateDensityAutomation,
  generateProgressiveLayer,
  analyzeTransitionType,
  getDefaultTransitionConfig,
  getBuildDensityStages,
  getBuildGainStages,
  generateBuildTemplate,
  generateDropTemplate,
  generateBreakdownTemplate,
  isGradualTransition,
  AUTOMATION_PATTERNS,
} from './TransitionHelper'
export type { TransitionType, TransitionConfig } from './TransitionHelper'
