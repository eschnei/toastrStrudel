/**
 * SampleTiming - Musical timing for sample introduction
 *
 * Handles the intelligent timing of when new samples should be
 * introduced based on musical context, bar boundaries, phrase
 * structure, and arrangement state.
 *
 * @references Phase 5 Deliverables
 */

import type { Sample, SampleCategory } from './SampleLibrary';
import type { SampleRecommendation } from '../agents/SampleCuratorAgent';
import type { MusicalState } from '../agents/MusicalStateAnalyzer';
import { getTimingManager } from '../engine/TimingManager';

/**
 * Arrangement section types
 */
export type ArrangementSection = 'intro' | 'build' | 'drop' | 'breakdown' | 'transition' | 'outro';

/**
 * Introduction timing mode
 */
export type IntroductionMode = 'immediate' | 'next-bar' | 'next-phrase' | 'natural';

/**
 * Sample introduction options
 */
export interface IntroductionOptions {
  /** When to introduce the sample */
  mode?: IntroductionMode;
  /** Current arrangement section */
  section?: ArrangementSection;
  /** Current energy level (0-100) */
  energy?: number;
  /** Current bar number (for phrase calculation) */
  currentBar?: number;
  /** Bars per phrase (default: 4) */
  barsPerPhrase?: number;
  /** Force introduction even if timing isn't ideal */
  force?: boolean;
  /** Callback when sample is introduced */
  onIntroduce?: (sample: Sample, timing: IntroductionTiming) => void;
}

/**
 * Result of timing calculation
 */
export interface IntroductionTiming {
  /** Sample to introduce */
  sample: Sample;
  /** Bars to wait before introduction */
  delayBars: number;
  /** The bar number when introduction will happen */
  targetBar: number;
  /** Why this timing was chosen */
  reason: string;
  /** Whether timing is musically ideal */
  isIdeal: boolean;
  /** Suggested Strudel pattern for introduction */
  introductionPattern: string;
  /** Whether a fade-in is recommended */
  useFadeIn: boolean;
  /** Fade-in duration in bars (if applicable) */
  fadeInBars?: number;
  /** Priority level for this introduction */
  priority: 'high' | 'normal' | 'low';
}

/**
 * Configuration for the timing calculator
 */
export interface SampleTimingConfig {
  /** Default bars per phrase */
  defaultPhraseBars: number;
  /** Bars before end of phrase to introduce (for anticipation) */
  anticipationBars: number;
  /** Maximum delay in bars for natural introduction */
  maxDelayBars: number;
  /** Minimum delay to avoid abrupt changes */
  minDelayBars: number;
}

const DEFAULT_CONFIG: SampleTimingConfig = {
  defaultPhraseBars: 4,
  anticipationBars: 1,
  maxDelayBars: 8,
  minDelayBars: 1,
};

/**
 * Category-specific timing preferences
 */
const CATEGORY_TIMING: Record<SampleCategory, {
  preferredSection: ArrangementSection[];
  avoidSection: ArrangementSection[];
  minEnergyForIntro: number;
  preferPhraseStart: boolean;
}> = {
  kicks: {
    preferredSection: ['drop', 'build'],
    avoidSection: ['breakdown'],
    minEnergyForIntro: 30,
    preferPhraseStart: true,
  },
  snares: {
    preferredSection: ['drop', 'build'],
    avoidSection: ['breakdown'],
    minEnergyForIntro: 30,
    preferPhraseStart: false,
  },
  hats: {
    preferredSection: ['drop', 'build', 'transition'],
    avoidSection: [],
    minEnergyForIntro: 20,
    preferPhraseStart: false,
  },
  percussion: {
    preferredSection: ['drop', 'build', 'transition'],
    avoidSection: ['breakdown'],
    minEnergyForIntro: 25,
    preferPhraseStart: false,
  },
  bass: {
    preferredSection: ['drop'],
    avoidSection: ['breakdown', 'outro'],
    minEnergyForIntro: 50,
    preferPhraseStart: true,
  },
  synth: {
    preferredSection: ['build', 'transition', 'drop'],
    avoidSection: [],
    minEnergyForIntro: 20,
    preferPhraseStart: false,
  },
  fx: {
    preferredSection: ['build', 'transition', 'breakdown'],
    avoidSection: [],
    minEnergyForIntro: 0,
    preferPhraseStart: false,
  },
  vocals: {
    preferredSection: ['drop', 'breakdown'],
    avoidSection: ['build'],
    minEnergyForIntro: 20,
    preferPhraseStart: true,
  },
};

/**
 * Calculate bars until next phrase boundary
 */
export function barsToNextPhrase(
  currentBar: number,
  barsPerPhrase: number = 4
): number {
  const positionInPhrase = currentBar % barsPerPhrase;
  if (positionInPhrase === 0) {
    return 0; // Already at phrase boundary
  }
  return barsPerPhrase - positionInPhrase;
}

/**
 * Check if current position is a phrase boundary
 */
export function isPhraseBoundary(
  currentBar: number,
  barsPerPhrase: number = 4
): boolean {
  return currentBar % barsPerPhrase === 0;
}

/**
 * Determine if current section is appropriate for introducing a sample
 */
export function isSectionAppropriate(
  sample: Sample,
  section: ArrangementSection
): { appropriate: boolean; reason: string } {
  const timing = CATEGORY_TIMING[sample.type];

  if (timing.avoidSection.includes(section)) {
    return {
      appropriate: false,
      reason: `${sample.type} samples are typically avoided during ${section}`,
    };
  }

  if (timing.preferredSection.includes(section)) {
    return {
      appropriate: true,
      reason: `${section} is an ideal section for ${sample.type}`,
    };
  }

  return {
    appropriate: true,
    reason: `${section} is acceptable for ${sample.type}`,
  };
}

/**
 * Calculate optimal timing for sample introduction
 */
export function calculateIntroductionTiming(
  sample: Sample,
  options: IntroductionOptions = {},
  config: SampleTimingConfig = DEFAULT_CONFIG
): IntroductionTiming {
  const {
    mode = 'natural',
    section = 'drop',
    energy = 50,
    currentBar = 0,
    barsPerPhrase = config.defaultPhraseBars,
    force = false,
  } = options;

  const categoryTiming = CATEGORY_TIMING[sample.type];

  // Base result
  const result: IntroductionTiming = {
    sample,
    delayBars: 0,
    targetBar: currentBar,
    reason: '',
    isIdeal: true,
    introductionPattern: `s("${sample.path}")`,
    useFadeIn: false,
    priority: 'normal',
  };

  // Handle immediate mode
  if (mode === 'immediate') {
    result.reason = 'Immediate introduction requested';
    result.isIdeal = force || isSectionAppropriate(sample, section).appropriate;
    return result;
  }

  // Handle next-bar mode
  if (mode === 'next-bar') {
    result.delayBars = 1;
    result.targetBar = currentBar + 1;
    result.reason = 'Introducing on next bar boundary';
    return result;
  }

  // Handle next-phrase mode
  if (mode === 'next-phrase') {
    const toNextPhrase = barsToNextPhrase(currentBar, barsPerPhrase);
    result.delayBars = toNextPhrase === 0 ? barsPerPhrase : toNextPhrase;
    result.targetBar = currentBar + result.delayBars;
    result.reason = 'Introducing at next phrase boundary';
    return result;
  }

  // Natural mode - intelligent timing based on context
  let delayBars = config.minDelayBars;
  const reasons: string[] = [];

  // Check section appropriateness
  const sectionCheck = isSectionAppropriate(sample, section);
  if (!sectionCheck.appropriate && !force) {
    // Delay until section might change (at least 4 bars)
    delayBars = Math.max(delayBars, barsPerPhrase);
    reasons.push(sectionCheck.reason);
    result.isIdeal = false;
  }

  // Check energy level
  if (energy < categoryTiming.minEnergyForIntro && !force) {
    // Wait for energy to potentially rise
    delayBars = Math.max(delayBars, 2);
    reasons.push(`Energy (${energy}) below ideal for ${sample.type}`);
    result.isIdeal = false;
  }

  // Prefer phrase boundaries for certain categories
  if (categoryTiming.preferPhraseStart) {
    const toNextPhrase = barsToNextPhrase(currentBar + delayBars, barsPerPhrase);
    if (toNextPhrase > 0 && toNextPhrase <= 2) {
      delayBars += toNextPhrase;
      reasons.push('Aligned to phrase boundary');
    }
  }

  // Avoid breakdowns with rhythmic elements
  if (
    section === 'breakdown' &&
    ['kicks', 'snares', 'bass'].includes(sample.type)
  ) {
    if (!force) {
      delayBars = Math.max(delayBars, barsPerPhrase * 2);
      reasons.push('Waiting for breakdown to end');
      result.isIdeal = false;
      result.priority = 'low';
    }
  }

  // Builds are great for FX and atmospheric elements
  if (section === 'build' && ['fx', 'synth'].includes(sample.type)) {
    // Introduce sooner
    delayBars = Math.min(delayBars, 1);
    reasons.push('Build section favors atmospheric elements');
    result.priority = 'high';
  }

  // Drops are perfect for full introduction
  if (section === 'drop') {
    // Check if we're at the start of a drop
    if (isPhraseBoundary(currentBar, barsPerPhrase)) {
      delayBars = 0;
      reasons.push('Perfect drop timing - phrase boundary');
      result.priority = 'high';
    }
  }

  // Apply limits
  delayBars = Math.max(config.minDelayBars, Math.min(config.maxDelayBars, delayBars));

  // Determine if fade-in should be used
  if (['synth', 'fx', 'vocals'].includes(sample.type)) {
    result.useFadeIn = true;
    result.fadeInBars = 1;
  }

  // Build the introduction pattern
  result.introductionPattern = buildIntroductionPattern(sample, result);

  result.delayBars = delayBars;
  result.targetBar = currentBar + delayBars;
  result.reason = reasons.length > 0 ? reasons.join('; ') : 'Optimal timing calculated';

  return result;
}

/**
 * Build Strudel pattern for sample introduction
 */
function buildIntroductionPattern(
  sample: Sample,
  timing: IntroductionTiming
): string {
  let pattern = `s("${sample.path}")`;

  // Add fade-in if recommended
  if (timing.useFadeIn && timing.fadeInBars) {
    // Use Strudel's gain automation for fade-in
    pattern += `.gain(sine.range(0, 0.8).slow(${timing.fadeInBars * 4}))`;
  }

  return pattern;
}

/**
 * Schedule a sample introduction using TimingManager
 */
export function scheduleSampleIntroduction(
  sample: Sample,
  patternCode: string,
  options: IntroductionOptions = {},
  config: SampleTimingConfig = DEFAULT_CONFIG
): { scheduleId: string; timing: IntroductionTiming } {
  const timing = calculateIntroductionTiming(sample, options, config);
  const timingManager = getTimingManager();

  const scheduleId = timingManager.scheduleChange(
    patternCode || timing.introductionPattern,
    timing.delayBars,
    {
      type: 'pattern',
      description: `Introduce ${sample.name}`,
      onExecute: () => {
        if (options.onIntroduce) {
          options.onIntroduce(sample, timing);
        }
        console.log(
          `[SampleTiming] Introduced ${sample.name} at bar ${timing.targetBar}`
        );
      },
    }
  );

  return { scheduleId, timing };
}

/**
 * Schedule multiple sample introductions with staggered timing
 */
export function scheduleMultipleSamples(
  recommendations: SampleRecommendation[],
  options: IntroductionOptions = {},
  config: SampleTimingConfig = DEFAULT_CONFIG
): { scheduleIds: string[]; timings: IntroductionTiming[] } {
  const scheduleIds: string[] = [];
  const timings: IntroductionTiming[] = [];

  // Sort by priority (high first)
  const sorted = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const aPriority = calculateIntroductionTiming(a.sample, options, config).priority;
    const bPriority = calculateIntroductionTiming(b.sample, options, config).priority;
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });

  let staggerOffset = 0;

  for (const rec of sorted) {
    // Calculate timing with stagger offset
    const adjustedOptions = {
      ...options,
      currentBar: (options.currentBar || 0) + staggerOffset,
    };

    const timing = calculateIntroductionTiming(rec.sample, adjustedOptions, config);
    const { scheduleId } = scheduleSampleIntroduction(
      rec.sample,
      rec.patternCode,
      adjustedOptions,
      config
    );

    scheduleIds.push(scheduleId);
    timings.push(timing);

    // Stagger next sample introduction
    staggerOffset += timing.delayBars > 0 ? timing.delayBars : config.minDelayBars;
  }

  return { scheduleIds, timings };
}

/**
 * Get timing recommendations for a sample
 */
export function getTimingRecommendation(
  sample: Sample,
  musicalState: MusicalState,
  section: ArrangementSection = 'drop'
): IntroductionTiming {
  return calculateIntroductionTiming(sample, {
    section,
    energy: musicalState.energyLevel,
    currentBar: 0, // Will be determined at schedule time
    mode: 'natural',
  });
}

/**
 * Check if now is a good time to introduce a sample
 */
export function isGoodTimeToIntroduce(
  sample: Sample,
  options: IntroductionOptions
): { isGood: boolean; reason: string; waitBars?: number } {
  const timing = calculateIntroductionTiming(sample, options);

  if (timing.delayBars === 0) {
    return {
      isGood: true,
      reason: timing.reason,
    };
  }

  return {
    isGood: false,
    reason: timing.reason,
    waitBars: timing.delayBars,
  };
}

/**
 * Get section-specific introduction advice
 */
export function getSectionAdvice(section: ArrangementSection): {
  goodFor: SampleCategory[];
  avoidIntroducing: SampleCategory[];
  energyGuideline: string;
} {
  const goodFor: SampleCategory[] = [];
  const avoidIntroducing: SampleCategory[] = [];

  for (const [category, timing] of Object.entries(CATEGORY_TIMING)) {
    if (timing.preferredSection.includes(section)) {
      goodFor.push(category as SampleCategory);
    }
    if (timing.avoidSection.includes(section)) {
      avoidIntroducing.push(category as SampleCategory);
    }
  }

  const energyGuidelines: Record<ArrangementSection, string> = {
    intro: 'Low energy (20-40) - introduce atmospheric elements',
    build: 'Rising energy (40-70) - add layers progressively, great for risers and FX',
    drop: 'High energy (80-100) - full drums and bass, maximum impact',
    breakdown: 'Reduced energy (20-50) - strip back, focus on atmosphere',
    transition: 'Variable energy - bridge elements, introduce or remove',
    outro: 'Declining energy (20-40) - remove elements, atmospheric finish',
  };

  return {
    goodFor,
    avoidIntroducing,
    energyGuideline: energyGuidelines[section],
  };
}
