// AI agent classes
export {
  PatternAgent,
  getPatternAgent,
  resetPatternAgent,
  cleanPatternResponse,
} from './PatternAgent'
export type { PatternAgentConfig, GenerationResult } from './PatternAgent'

export {
  ConversationManager,
  getConversationManager,
  resetConversationManager,
} from './ConversationManager'
export type {
  ConversationEntry,
  ConversationSummary,
  ConversationManagerConfig,
} from './ConversationManager'

export {
  ArrangementAgent,
  getArrangementAgent,
  resetArrangementAgent,
} from './ArrangementAgent'
export type {
  ArrangementAgentConfig,
  ArrangementResult,
  ArrangementIntent,
  ArrangementCommand,
} from './ArrangementAgent'

export { anthropic, isAnthropicAvailable, getAnthropicClient } from './anthropic'

export {
  analyzePattern,
  generateStateSummary,
  getMusicalStateSummary,
  analyzeAndTrackState,
} from './MusicalStateAnalyzer'
export type { MusicalState, MusicalStateSummary } from './MusicalStateAnalyzer'

// Arrangement utilities
export {
  isArrangementCommand,
  parseArrangementCommand,
  createArrangementContext,
} from './prompts/arrangementAgent'

// Genre management
export {
  GenreManager,
  getGenreManager,
  resetGenreManager,
  detectGenre,
  detectGenreFromBpm,
  getGenreBpm,
  getGenreBpmRange,
  getGenrePattern,
  getGenreConfig,
  createGenreContext,
  GENRE_CONFIGS,
} from './GenreManager'
export type { GenreType, GenreConfig } from './GenreManager'

// Genre blending
export {
  parseBlendedGenre,
  isBlendedGenrePrompt,
  getBlendedBpm,
  createBlendContext,
  createBlendedPattern,
  calculateTransitionBpm,
  getBlendedBpmRange,
} from './GenreBlender'
export type { BlendedGenre } from './GenreBlender'

// Phase 4: Conductor Agent (Multi-Agent Orchestration)
export {
  ConductorAgent,
  getConductorAgent,
  resetConductorAgent,
} from './ConductorAgent'
export type {
  ConductorAgentConfig,
  ConductorPlan,
  ConductorResult,
  LayerAssignment,
} from './ConductorAgent'

// Phase 4: Specialist Agents
export * from './specialists'

// Phase 4: Agent Protocol
export {
  AgentProtocol,
  getAgentProtocol,
  resetAgentProtocol,
} from './AgentProtocol'
export type {
  ProtocolConfig,
  ProtocolEvent,
  ProtocolEventType,
} from './AgentProtocol'

// Phase 4: Conflict Resolver
export {
  ConflictResolver,
  getConflictResolver,
  resetConflictResolver,
} from './ConflictResolver'
export type { ConflictResolverConfig } from './ConflictResolver'

// Phase 5: Sample Curator Agent
export {
  SampleCuratorAgent,
  getSampleCuratorAgent,
  resetSampleCuratorAgent,
} from './SampleCuratorAgent'
export type {
  SampleRecommendation,
  CurationContext,
  CurationResult,
  SampleCuratorConfig,
} from './SampleCuratorAgent'
