// Sample Library exports
export {
  SampleLibrary,
  getSampleLibrary,
  resetSampleLibrary,
} from './SampleLibrary';

export type {
  Sample,
  SampleCategory,
  MoodTag,
  MusicalKey,
  SampleLibraryIndex,
  SampleSearchResult,
  SampleLibraryStats,
} from './SampleLibrary';

// Default sample index
export {
  DEFAULT_SAMPLE_INDEX,
  getDefaultSampleIndex,
  getSampleCountByCategory,
} from './defaultSampleIndex';

// Sample search
export {
  searchSamples,
  findSamples,
  findSimilarSamples,
  suggestSamples,
  quickSearch,
} from './SampleSearch';

export type { SearchOptions } from './SampleSearch';

// Time stretching
export {
  calculateStretchRatio,
  detectSampleBpm,
  generateSpeedModifier,
  generatePitchPreserveModifier,
  calculateTimeStretch,
  applyTimeStretch,
  generateStretchedSamplePattern,
  batchTimeStretch,
  getStretchInfo,
  isBpmCompatible,
  getRecommendedStretchMode,
} from './TimeStretch';

export type {
  StretchMode,
  TimeStretchResult,
  TimeStretchOptions,
} from './TimeStretch';

// Sample timing for musical introduction
export {
  barsToNextPhrase,
  isPhraseBoundary,
  isSectionAppropriate,
  calculateIntroductionTiming,
  scheduleSampleIntroduction,
  scheduleMultipleSamples,
  getTimingRecommendation,
  isGoodTimeToIntroduce,
  getSectionAdvice,
} from './SampleTiming';

export type {
  ArrangementSection,
  IntroductionMode,
  IntroductionOptions,
  IntroductionTiming,
  SampleTimingConfig,
} from './SampleTiming';
