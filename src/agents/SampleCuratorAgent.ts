/**
 * SampleCuratorAgent - AI agent for intelligent sample selection and curation
 *
 * Receives musical context (mood, genre, energy) and searches the sample
 * library for matching samples. Returns recommendations with usage suggestions
 * and avoids samples that clash with the current pattern.
 *
 * @references Phase 5 Deliverables
 */

import { analyzePattern, type MusicalState } from './MusicalStateAnalyzer';
import {
  getSampleLibrary,
  searchSamples,
  findSimilarSamples,
  type Sample,
  type SampleCategory,
  type MoodTag,
} from '../samples';
import {
  calculateTimeStretch,
  getRecommendedStretchMode,
  generateStretchedSamplePattern,
  type TimeStretchResult,
} from '../samples/TimeStretch';
import { DEFAULT_SAMPLE_INDEX } from '../samples/defaultSampleIndex';

/**
 * Sample recommendation with usage context
 */
export interface SampleRecommendation {
  /** The recommended sample */
  sample: Sample;
  /** Relevance score (0-1) */
  score: number;
  /** Suggested usage/placement */
  usage: string;
  /** How the sample fits the context */
  fit: 'perfect' | 'good' | 'acceptable';
  /** Time stretch info if needed */
  timeStretch?: TimeStretchResult;
  /** Generated Strudel pattern code for this sample */
  patternCode: string;
  /** Layer this sample fits best in */
  suggestedLayer: 'drums' | 'bass' | 'synth' | 'fx';
  /** Whether this might clash with current pattern */
  potentialClash: boolean;
  /** Reason for potential clash if any */
  clashReason?: string;
}

/**
 * Musical context for sample curation
 */
export interface CurationContext {
  /** Current mood/vibe description */
  mood?: string;
  /** Current genre */
  genre?: string;
  /** Current energy level (0-100) */
  energy?: number;
  /** Current BPM */
  bpm?: number;
  /** Current pattern code (for clash detection) */
  currentPattern?: string;
  /** Analyzed musical state */
  musicalState?: MusicalState;
  /** Sample IDs already in use */
  currentSamples?: string[];
  /** Specific category to focus on */
  preferredCategory?: SampleCategory;
  /** Specific mood tags to prioritize */
  preferredMoods?: MoodTag[];
}

/**
 * Curation result from the agent
 */
export interface CurationResult {
  /** Recommended samples with usage info */
  recommendations: SampleRecommendation[];
  /** Summary of the curation */
  summary: string;
  /** Samples that were avoided due to clashes */
  avoided: { sample: Sample; reason: string }[];
  /** Context used for curation */
  context: CurationContext;
}

/**
 * Agent configuration
 */
export interface SampleCuratorConfig {
  /** Maximum recommendations to return */
  maxRecommendations?: number;
  /** Whether to use AI for enhanced curation */
  useAI?: boolean;
  /** Model to use for AI curation */
  model?: string;
  /** Maximum tokens for AI response */
  maxTokens?: number;
  /** Temperature for AI creativity */
  temperature?: number;
}

// Default configuration
const DEFAULT_CONFIG: Required<SampleCuratorConfig> = {
  maxRecommendations: 6,
  useAI: false, // Start with deterministic approach
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  temperature: 0.7,
};

/**
 * Map sample categories to layers
 */
function categoryToLayer(category: SampleCategory): 'drums' | 'bass' | 'synth' | 'fx' {
  switch (category) {
    case 'kicks':
    case 'snares':
    case 'hats':
    case 'percussion':
      return 'drums';
    case 'bass':
      return 'bass';
    case 'synth':
    case 'vocals':
      return 'synth';
    case 'fx':
      return 'fx';
    default:
      return 'fx';
  }
}

/**
 * Determine fit quality based on score
 */
function determineFit(score: number): 'perfect' | 'good' | 'acceptable' {
  if (score >= 0.8) return 'perfect';
  if (score >= 0.5) return 'good';
  return 'acceptable';
}

/**
 * Map energy level to appropriate mood tags
 */
function energyToMoodTags(energy: number): MoodTag[] {
  if (energy >= 80) return ['aggressive', 'energetic', 'punchy'];
  if (energy >= 60) return ['energetic', 'bright', 'clean'];
  if (energy >= 40) return ['warm', 'clean', 'smooth'];
  if (energy >= 20) return ['chill', 'soft', 'dreamy'];
  return ['atmospheric', 'soft', 'minimal'];
}

/**
 * Check if a sample might clash with current pattern
 */
function detectClash(
  sample: Sample,
  context: CurationContext
): { clashes: boolean; reason?: string } {
  if (!context.currentPattern) {
    return { clashes: false };
  }

  const currentPattern = context.currentPattern.toLowerCase();

  // Check for frequency clashes
  if (sample.type === 'bass' && context.musicalState?.hasBass) {
    // Check if there's already a bass pattern
    if (currentPattern.includes('bass') || currentPattern.includes('sub')) {
      return {
        clashes: true,
        reason: 'Bass frequency conflict - pattern already has bass element',
      };
    }
  }

  // Check for melodic clashes - if different keys
  if (sample.key && context.musicalState?.hasMelody) {
    // Simple check - if there are note() calls, there's melodic content
    if (currentPattern.includes('note(')) {
      // Could clash, but not definitively
      return {
        clashes: true,
        reason: 'Potential key conflict with existing melodic content',
      };
    }
  }

  // Check for rhythmic density clashes
  if (
    ['kicks', 'snares', 'hats', 'percussion'].includes(sample.type) &&
    context.musicalState?.rawAnalysis.elementCount &&
    context.musicalState.rawAnalysis.elementCount > 8
  ) {
    return {
      clashes: true,
      reason: 'Pattern already has high rhythmic density',
    };
  }

  // Check for specific conflicts
  const conflictPatterns: Record<string, string[]> = {
    kicks: ['bd', 'kick', 'bd:'],
    snares: ['sd', 'snare', 'cp', 'clap'],
    hats: ['hh', 'oh', 'hihat'],
  };

  if (sample.type in conflictPatterns) {
    const conflicts = conflictPatterns[sample.type];
    for (const conflict of conflicts) {
      if (currentPattern.includes(conflict)) {
        return {
          clashes: true,
          reason: `Similar ${sample.type} element already present in pattern`,
        };
      }
    }
  }

  return { clashes: false };
}

/**
 * Generate usage suggestion for a sample
 */
function generateUsageSuggestion(
  sample: Sample,
  context: CurationContext,
  fit: 'perfect' | 'good' | 'acceptable'
): string {
  const suggestions: string[] = [];

  // Category-specific suggestions
  switch (sample.type) {
    case 'kicks':
      suggestions.push('Use as the foundation of your rhythm');
      if (context.energy && context.energy > 60) {
        suggestions.push('Works well on downbeats for driving energy');
      }
      break;
    case 'snares':
      suggestions.push('Place on beats 2 and 4 for classic groove');
      break;
    case 'hats':
      suggestions.push('Layer with existing drums for texture');
      if (sample.name.toLowerCase().includes('open')) {
        suggestions.push('Use sparingly for accents');
      }
      break;
    case 'percussion':
      suggestions.push('Add for rhythmic interest and variation');
      break;
    case 'bass':
      suggestions.push('Drive the low end of your track');
      if (context.musicalState?.hasMelody) {
        suggestions.push('Consider matching the root note of your melody');
      }
      break;
    case 'synth':
      if (sample.name.toLowerCase().includes('pad')) {
        suggestions.push('Use for atmospheric background texture');
      } else if (sample.name.toLowerCase().includes('lead')) {
        suggestions.push('Use as the melodic hook');
      } else if (sample.name.toLowerCase().includes('stab')) {
        suggestions.push('Punctuate key moments in your arrangement');
      }
      break;
    case 'fx':
      if (sample.name.toLowerCase().includes('riser')) {
        suggestions.push('Build tension before drops');
      } else if (sample.name.toLowerCase().includes('impact')) {
        suggestions.push('Mark the beginning of drops');
      }
      break;
    case 'vocals':
      suggestions.push('Add human element to your track');
      break;
  }

  // Mood-based suggestions
  if (sample.moodTags.includes('atmospheric')) {
    suggestions.push('Perfect for creating space and depth');
  }
  if (sample.moodTags.includes('punchy')) {
    suggestions.push('Great for adding impact and presence');
  }

  // Fit-based suggestions
  if (fit === 'perfect') {
    suggestions.unshift('Excellent match for your current vibe -');
  } else if (fit === 'good') {
    suggestions.unshift('Solid fit -');
  } else {
    suggestions.unshift('Could work with some adjustment -');
  }

  return suggestions.slice(0, 2).join(' ');
}

/**
 * SampleCuratorAgent class
 */
export class SampleCuratorAgent {
  private config: Required<SampleCuratorConfig>;
  private libraryInitialized = false;

  constructor(config?: SampleCuratorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the sample library with default samples
   */
  async initializeLibrary(): Promise<void> {
    if (this.libraryInitialized) return;

    const library = getSampleLibrary();
    if (library.getSampleCount() === 0) {
      await library.loadFromIndex(DEFAULT_SAMPLE_INDEX);
    }
    this.libraryInitialized = true;
  }

  /**
   * Curate samples based on musical context
   */
  async curateSamples(context: CurationContext): Promise<CurationResult> {
    await this.initializeLibrary();

    // Analyze current pattern if provided
    if (context.currentPattern && !context.musicalState) {
      context.musicalState = analyzePattern(context.currentPattern);
    }

    // Build search query from context
    const queryParts: string[] = [];

    if (context.mood) {
      queryParts.push(context.mood);
    }

    if (context.genre) {
      queryParts.push(context.genre);
    }

    if (context.preferredCategory) {
      queryParts.push(context.preferredCategory);
    }

    // Add energy-based mood tags
    if (context.energy !== undefined) {
      const energyMoods = energyToMoodTags(context.energy);
      queryParts.push(...energyMoods.slice(0, 2));
    }

    // Add preferred moods
    if (context.preferredMoods) {
      queryParts.push(...context.preferredMoods);
    }

    const query = queryParts.join(' ');

    // Search for samples
    const searchResults = searchSamples(query, {
      maxResults: this.config.maxRecommendations * 2, // Get more to filter
      categories: context.preferredCategory ? [context.preferredCategory] : undefined,
      contextBoost: {
        currentBpm: context.bpm,
        currentEnergy: context.energy,
        currentMood: context.mood,
      },
    });

    // Process results into recommendations
    const recommendations: SampleRecommendation[] = [];
    const avoided: { sample: Sample; reason: string }[] = [];

    for (const result of searchResults) {
      // Check for clashes
      const clashResult = detectClash(result.sample, context);

      // Skip if sample is already in use
      if (context.currentSamples?.includes(result.sample.id)) {
        avoided.push({ sample: result.sample, reason: 'Already in use' });
        continue;
      }

      // Calculate time stretch if BPM provided
      let timeStretch: TimeStretchResult | undefined;
      if (context.bpm && result.sample.bpm) {
        const mode = getRecommendedStretchMode(result.sample, context.bpm);
        timeStretch = calculateTimeStretch(result.sample, {
          targetBpm: context.bpm,
          mode,
        });
      }

      // Generate pattern code
      const patternCode = context.bpm
        ? generateStretchedSamplePattern(result.sample, {
            targetBpm: context.bpm,
            mode: getRecommendedStretchMode(result.sample, context.bpm),
          })
        : `s("${result.sample.path}")`;

      // Determine fit quality
      const fit = determineFit(result.relevanceScore);

      // Generate usage suggestion
      const usage = generateUsageSuggestion(result.sample, context, fit);

      const recommendation: SampleRecommendation = {
        sample: result.sample,
        score: result.relevanceScore,
        usage,
        fit,
        timeStretch,
        patternCode,
        suggestedLayer: categoryToLayer(result.sample.type),
        potentialClash: clashResult.clashes,
        clashReason: clashResult.reason,
      };

      // Prioritize non-clashing samples, but still include clashing ones at the end
      if (clashResult.clashes) {
        avoided.push({ sample: result.sample, reason: clashResult.reason || 'Potential clash' });
      }

      recommendations.push(recommendation);
    }

    // Sort: non-clashing first, then by score
    recommendations.sort((a, b) => {
      if (a.potentialClash !== b.potentialClash) {
        return a.potentialClash ? 1 : -1;
      }
      return b.score - a.score;
    });

    // Limit to max recommendations
    const finalRecommendations = recommendations.slice(0, this.config.maxRecommendations);

    // Generate summary
    const summary = this.generateSummary(finalRecommendations, context);

    return {
      recommendations: finalRecommendations,
      summary,
      avoided,
      context,
    };
  }

  /**
   * Quick sample search by category and mood
   */
  async quickCurate(
    category: SampleCategory,
    mood?: MoodTag,
    bpm?: number
  ): Promise<SampleRecommendation[]> {
    await this.initializeLibrary();

    const result = await this.curateSamples({
      preferredCategory: category,
      preferredMoods: mood ? [mood] : undefined,
      bpm,
    });

    return result.recommendations;
  }

  /**
   * Find samples similar to a given sample
   */
  async findSimilar(
    sampleId: string,
    context?: CurationContext
  ): Promise<SampleRecommendation[]> {
    await this.initializeLibrary();

    const library = getSampleLibrary();
    const sample = library.getSample(sampleId);

    if (!sample) {
      return [];
    }

    const similar = findSimilarSamples(sample, this.config.maxRecommendations);

    return similar.map((result) => {
      const fit = determineFit(result.relevanceScore);
      const patternCode = context?.bpm
        ? generateStretchedSamplePattern(result.sample, {
            targetBpm: context.bpm,
            mode: getRecommendedStretchMode(result.sample, context.bpm),
          })
        : `s("${result.sample.path}")`;

      return {
        sample: result.sample,
        score: result.relevanceScore,
        usage: `Similar to ${sample.name}`,
        fit,
        patternCode,
        suggestedLayer: categoryToLayer(result.sample.type),
        potentialClash: false,
      };
    });
  }

  /**
   * Suggest samples for a specific arrangement section
   */
  async suggestForSection(
    section: 'intro' | 'build' | 'drop' | 'breakdown' | 'outro',
    context: CurationContext
  ): Promise<CurationResult> {
    // Adjust context based on section
    const adjustedContext: CurationContext = { ...context };

    switch (section) {
      case 'intro':
        adjustedContext.energy = Math.min(context.energy || 30, 40);
        adjustedContext.preferredMoods = ['atmospheric', 'minimal', 'soft'];
        break;
      case 'build':
        adjustedContext.energy = Math.min((context.energy || 50) + 20, 80);
        adjustedContext.preferredMoods = ['energetic', 'bright'];
        adjustedContext.preferredCategory = 'fx'; // Risers, etc.
        break;
      case 'drop':
        adjustedContext.energy = 100;
        adjustedContext.preferredMoods = ['punchy', 'aggressive', 'energetic'];
        break;
      case 'breakdown':
        adjustedContext.energy = Math.max((context.energy || 50) - 30, 20);
        adjustedContext.preferredMoods = ['soft', 'atmospheric', 'dreamy'];
        break;
      case 'outro':
        adjustedContext.energy = Math.min(context.energy || 30, 30);
        adjustedContext.preferredMoods = ['soft', 'minimal', 'atmospheric'];
        break;
    }

    return this.curateSamples(adjustedContext);
  }

  /**
   * Generate a human-readable summary of recommendations
   */
  private generateSummary(
    recommendations: SampleRecommendation[],
    context: CurationContext
  ): string {
    if (recommendations.length === 0) {
      return 'No matching samples found for the current context.';
    }

    const parts: string[] = [];

    // Overview
    const perfectCount = recommendations.filter((r) => r.fit === 'perfect').length;
    const goodCount = recommendations.filter((r) => r.fit === 'good').length;

    if (perfectCount > 0) {
      parts.push(`Found ${perfectCount} excellent match${perfectCount > 1 ? 'es' : ''}`);
    }
    if (goodCount > 0) {
      parts.push(`${goodCount} good option${goodCount > 1 ? 's' : ''}`);
    }

    // Context acknowledgment
    if (context.mood) {
      parts.push(`matching "${context.mood}" vibe`);
    }
    if (context.genre) {
      parts.push(`for ${context.genre}`);
    }

    // BPM note
    if (context.bpm) {
      const needsStretch = recommendations.filter(
        (r) => r.timeStretch && r.timeStretch.stretchRatio !== 1
      ).length;
      if (needsStretch > 0) {
        parts.push(`(${needsStretch} will be time-stretched to ${context.bpm} BPM)`);
      }
    }

    return parts.join(' ') + '.';
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SampleCuratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<SampleCuratorConfig> {
    return { ...this.config };
  }
}

// Singleton instance
let sampleCuratorInstance: SampleCuratorAgent | null = null;

export function getSampleCuratorAgent(): SampleCuratorAgent {
  if (!sampleCuratorInstance) {
    sampleCuratorInstance = new SampleCuratorAgent();
  }
  return sampleCuratorInstance;
}

export function resetSampleCuratorAgent(): void {
  sampleCuratorInstance = null;
}
