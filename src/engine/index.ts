// StrudelEngine wrapper
export {
  StrudelEngine,
  getStrudelEngine,
  resetStrudelEngine,
  validatePattern,
} from './StrudelEngine'
export type { ValidationResult, AudioContextState, StrudelEngineState } from './StrudelEngine'

// TimingManager for bar-based scheduling
export {
  TimingManager,
  getTimingManager,
  resetTimingManager,
  parseTimingCommand,
  calculateBarDuration,
  calculateBeatDuration,
} from './TimingManager'
export type { TimingState, ScheduledChange, ParsedTimingCommand } from './TimingManager'

// EnergyManager for energy tracking
export {
  EnergyManager,
  getEnergyManager,
  resetEnergyManager,
  getEnergyDots,
  getEnergyColor,
  getEnergyCategory,
} from './EnergyManager'
export type { EnergyState, EnergyHistoryEntry } from './EnergyManager'

// Phase 4: Bar Boundary Sync
export {
  BarBoundarySync,
  getBarBoundarySync,
  resetBarBoundarySync,
} from './BarBoundarySync'
export type {
  PendingLayerUpdate,
  CoordinatedUpdate,
  BarBoundarySyncConfig,
  BarSyncEvent,
  BarSyncEventType,
} from './BarBoundarySync'

// Phase 4: Layer Manager
export {
  LayerManager,
  getLayerManager,
  resetLayerManager,
} from './LayerManager'
export type {
  LayerType,
  LayerState,
  LayerConfig,
  LayerManagerConfig,
  LayerChangeEvent,
} from './LayerManager'

// Pattern Optimizer (PERF-001)
export {
  analyzeComplexity,
  profilePattern,
  optimizePattern,
  isPatternSafe,
  createThrottledEvaluator,
  COMPLEXITY_GUIDELINES,
} from './PatternOptimizer'
export type {
  ComplexityMetrics,
  ComplexityLimits,
  PerformanceProfile,
  OptimizationResult,
} from './PatternOptimizer'
