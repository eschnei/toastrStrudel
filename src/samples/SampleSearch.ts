/**
 * SampleSearch - Search functionality for the sample library
 *
 * Provides fuzzy matching, relevance ranking, and natural language
 * query parsing for finding samples. Supports queries like
 * "dark kick", "bright hats", "wonky bass".
 *
 * @references FR-033
 */

import type { Sample, SampleCategory, MoodTag, SampleSearchResult } from './SampleLibrary';
import { getSampleLibrary, SampleLibrary } from './SampleLibrary';

/**
 * Search options for customizing search behavior
 */
export interface SearchOptions {
  /** Maximum number of results to return (default: 20) */
  maxResults?: number;
  /** Minimum relevance score (0-1) to include in results (default: 0.1) */
  minRelevance?: number;
  /** Only search within these categories */
  categories?: SampleCategory[];
  /** Only return samples with these mood tags */
  moodTags?: MoodTag[];
  /** Only return samples within this BPM range */
  bpmRange?: { min: number; max: number };
  /** Boost samples matching current musical context */
  contextBoost?: {
    currentBpm?: number;
    currentEnergy?: number;
    currentMood?: string;
  };
}

/**
 * Query parse result
 */
interface ParsedQuery {
  /** Raw terms from the query */
  terms: string[];
  /** Detected category hints */
  categoryHints: SampleCategory[];
  /** Detected mood hints */
  moodHints: string[];
  /** Detected descriptors */
  descriptors: string[];
}

// Category aliases for natural language parsing
const CATEGORY_ALIASES: Record<string, SampleCategory> = {
  kick: 'kicks',
  kicks: 'kicks',
  bd: 'kicks',
  bassdrum: 'kicks',
  'bass drum': 'kicks',
  snare: 'snares',
  snares: 'snares',
  sd: 'snares',
  clap: 'snares',
  rim: 'snares',
  rimshot: 'snares',
  hat: 'hats',
  hats: 'hats',
  hihat: 'hats',
  'hi-hat': 'hats',
  hh: 'hats',
  cymbal: 'hats',
  ride: 'hats',
  perc: 'percussion',
  percussion: 'percussion',
  tom: 'percussion',
  conga: 'percussion',
  bongo: 'percussion',
  shaker: 'percussion',
  tambourine: 'percussion',
  cowbell: 'percussion',
  bass: 'bass',
  sub: 'bass',
  808: 'bass',
  reese: 'bass',
  synth: 'synth',
  pad: 'synth',
  lead: 'synth',
  keys: 'synth',
  arp: 'synth',
  stab: 'synth',
  pluck: 'synth',
  fx: 'fx',
  effect: 'fx',
  effects: 'fx',
  riser: 'fx',
  impact: 'fx',
  sweep: 'fx',
  atmosphere: 'fx',
  atmos: 'fx',
  vox: 'vocals',
  vocal: 'vocals',
  vocals: 'vocals',
  voice: 'vocals',
};

// Mood aliases for natural language parsing
const MOOD_ALIASES: Record<string, MoodTag> = {
  dark: 'dark',
  darker: 'dark',
  darkest: 'dark',
  bright: 'bright',
  brighter: 'bright',
  light: 'bright',
  aggressive: 'aggressive',
  hard: 'aggressive',
  heavy: 'aggressive',
  intense: 'aggressive',
  chill: 'chill',
  chilled: 'chill',
  relaxed: 'chill',
  mellow: 'chill',
  dreamy: 'dreamy',
  ethereal: 'dreamy',
  floaty: 'dreamy',
  spacey: 'dreamy',
  energetic: 'energetic',
  upbeat: 'energetic',
  driving: 'energetic',
  wonky: 'wonky',
  weird: 'wonky',
  odd: 'wonky',
  offbeat: 'wonky',
  clean: 'clean',
  crisp: 'clean',
  pristine: 'clean',
  dirty: 'dirty',
  grungy: 'dirty',
  nasty: 'dirty',
  filthy: 'dirty',
  punchy: 'punchy',
  snappy: 'punchy',
  tight: 'punchy',
  soft: 'soft',
  gentle: 'soft',
  subtle: 'soft',
  deep: 'deep',
  low: 'deep',
  subby: 'deep',
  sharp: 'sharp',
  cutting: 'sharp',
  warm: 'warm',
  fat: 'warm',
  round: 'warm',
  cold: 'cold',
  icy: 'cold',
  frozen: 'cold',
  organic: 'organic',
  natural: 'organic',
  acoustic: 'organic',
  synthetic: 'synthetic',
  electronic: 'synthetic',
  digital: 'synthetic',
  metallic: 'metallic',
  metal: 'metallic',
  woody: 'woody',
  wood: 'woody',
  glitchy: 'glitchy',
  glitch: 'glitchy',
  broken: 'glitchy',
  smooth: 'smooth',
  silky: 'smooth',
  gritty: 'gritty',
  raw: 'gritty',
  distorted: 'gritty',
  atmospheric: 'atmospheric',
  ambient: 'atmospheric',
  minimal: 'minimal',
  simple: 'minimal',
  sparse: 'minimal',
  complex: 'complex',
  intricate: 'complex',
  vintage: 'vintage',
  retro: 'vintage',
  old: 'vintage',
  classic: 'vintage',
  modern: 'modern',
  new: 'modern',
  fresh: 'modern',
  'lo-fi': 'lo-fi',
  lofi: 'lo-fi',
  'hi-fi': 'hi-fi',
  hifi: 'hi-fi',
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match score between two strings (0-1)
 */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (t === q) return 1.0;

  // Contains match
  if (t.includes(q)) return 0.9;

  // Starts with match
  if (t.startsWith(q)) return 0.85;

  // Word boundary match
  const words = t.split(/[\s\-_]+/);
  for (const word of words) {
    if (word === q) return 0.8;
    if (word.startsWith(q)) return 0.7;
  }

  // Levenshtein-based fuzzy match
  const distance = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  const similarity = 1 - distance / maxLen;

  // Only return significant matches
  return similarity > 0.5 ? similarity * 0.6 : 0;
}

/**
 * Parse a natural language query into structured components
 */
function parseQuery(query: string): ParsedQuery {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const categoryHints: SampleCategory[] = [];
  const moodHints: string[] = [];
  const descriptors: string[] = [];

  for (const term of terms) {
    // Check for category matches
    if (CATEGORY_ALIASES[term]) {
      categoryHints.push(CATEGORY_ALIASES[term]);
    } else if (MOOD_ALIASES[term]) {
      moodHints.push(MOOD_ALIASES[term]);
    } else {
      descriptors.push(term);
    }
  }

  return { terms, categoryHints, moodHints, descriptors };
}

/**
 * Calculate relevance score for a sample against a parsed query
 */
function calculateRelevance(
  sample: Sample,
  parsedQuery: ParsedQuery,
  options?: SearchOptions
): { score: number; matchedFields: string[] } {
  const matchedFields: string[] = [];
  let score = 0;

  // Category matching (high weight)
  if (parsedQuery.categoryHints.includes(sample.type)) {
    score += 0.4;
    matchedFields.push('category');
  }

  // Mood tag matching (high weight)
  for (const moodHint of parsedQuery.moodHints) {
    if (sample.moodTags.includes(moodHint as MoodTag)) {
      score += 0.3;
      matchedFields.push(`mood:${moodHint}`);
    }
  }

  // Name matching (fuzzy)
  for (const term of parsedQuery.terms) {
    const nameMatch = fuzzyMatch(term, sample.name);
    if (nameMatch > 0.5) {
      score += nameMatch * 0.2;
      matchedFields.push(`name:${term}`);
    }
  }

  // Description matching (if available)
  if (sample.metadata?.description) {
    for (const term of parsedQuery.terms) {
      const descMatch = fuzzyMatch(term, sample.metadata.description);
      if (descMatch > 0.5) {
        score += descMatch * 0.1;
        matchedFields.push(`description:${term}`);
      }
    }
  }

  // Genre matching
  if (sample.metadata?.genre) {
    for (const term of parsedQuery.terms) {
      const genreMatch = fuzzyMatch(term, sample.metadata.genre);
      if (genreMatch > 0.5) {
        score += genreMatch * 0.15;
        matchedFields.push(`genre:${term}`);
      }
    }
  }

  // Pack matching
  if (sample.metadata?.pack) {
    for (const term of parsedQuery.terms) {
      const packMatch = fuzzyMatch(term, sample.metadata.pack);
      if (packMatch > 0.5) {
        score += packMatch * 0.1;
        matchedFields.push(`pack:${term}`);
      }
    }
  }

  // Context boost (if provided)
  if (options?.contextBoost) {
    // BPM proximity boost
    if (options.contextBoost.currentBpm && sample.bpm) {
      const bpmDiff = Math.abs(sample.bpm - options.contextBoost.currentBpm);
      if (bpmDiff <= 5) {
        score += 0.1;
        matchedFields.push('bpm-match');
      } else if (bpmDiff <= 15) {
        score += 0.05;
      }
    }
  }

  // Normalize score to 0-1 range
  score = Math.min(1, score);

  return { score, matchedFields };
}

/**
 * Search the sample library with fuzzy matching and relevance ranking
 */
export function searchSamples(
  query: string,
  options?: SearchOptions,
  library?: SampleLibrary
): SampleSearchResult[] {
  const lib = library || getSampleLibrary();

  // Handle empty query
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Parse the query
  const parsedQuery = parseQuery(query);

  // Get candidate samples
  let candidates: Sample[];

  // If category hints exist, only search within those categories
  if (parsedQuery.categoryHints.length > 0) {
    candidates = parsedQuery.categoryHints.flatMap((cat) => lib.getByCategory(cat));
  } else if (options?.categories) {
    candidates = options.categories.flatMap((cat) => lib.getByCategory(cat));
  } else {
    candidates = lib.getAllSamples();
  }

  // Apply filters
  if (options?.moodTags && options.moodTags.length > 0) {
    candidates = candidates.filter((s) =>
      options.moodTags!.some((tag) => s.moodTags.includes(tag))
    );
  }

  if (options?.bpmRange) {
    candidates = candidates.filter(
      (s) =>
        s.bpm === null ||
        (s.bpm >= options.bpmRange!.min && s.bpm <= options.bpmRange!.max)
    );
  }

  // Calculate relevance scores
  const results: SampleSearchResult[] = [];

  for (const sample of candidates) {
    const { score, matchedFields } = calculateRelevance(sample, parsedQuery, options);

    // Apply minimum relevance threshold
    const minRelevance = options?.minRelevance ?? 0.1;
    if (score >= minRelevance) {
      results.push({
        sample,
        relevanceScore: score,
        matchedFields,
      });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limit results
  const maxResults = options?.maxResults ?? 20;
  return results.slice(0, maxResults);
}

/**
 * Search for samples matching a natural language description
 * Convenience wrapper around searchSamples
 */
export function findSamples(
  description: string,
  maxResults: number = 10
): SampleSearchResult[] {
  return searchSamples(description, { maxResults });
}

/**
 * Find samples similar to a given sample
 */
export function findSimilarSamples(
  sample: Sample,
  maxResults: number = 5,
  library?: SampleLibrary
): SampleSearchResult[] {
  const lib = library || getSampleLibrary();

  // Build a query from the sample's properties
  const queryParts: string[] = [];

  // Add mood tags as query terms
  queryParts.push(...sample.moodTags);

  // Add category
  queryParts.push(sample.type);

  // Add genre if available
  if (sample.metadata?.genre) {
    queryParts.push(sample.metadata.genre);
  }

  const query = queryParts.join(' ');

  // Search but exclude the original sample
  const results = searchSamples(query, { maxResults: maxResults + 1 }, lib);

  return results.filter((r) => r.sample.id !== sample.id).slice(0, maxResults);
}

/**
 * Get sample suggestions based on current musical context
 */
export function suggestSamples(
  context: {
    mood?: string;
    genre?: string;
    energy?: number;
    category?: SampleCategory;
    currentSamples?: string[];
  },
  maxResults: number = 5,
  library?: SampleLibrary
): SampleSearchResult[] {
  const lib = library || getSampleLibrary();

  // Build query from context
  const queryParts: string[] = [];

  if (context.mood) {
    queryParts.push(context.mood);
  }

  if (context.genre) {
    queryParts.push(context.genre);
  }

  if (context.category) {
    queryParts.push(context.category);
  }

  // Add energy-based mood hints
  if (context.energy !== undefined) {
    if (context.energy > 70) {
      queryParts.push('energetic', 'punchy');
    } else if (context.energy > 40) {
      queryParts.push('clean', 'warm');
    } else {
      queryParts.push('soft', 'atmospheric');
    }
  }

  const query = queryParts.join(' ');

  // Search
  const results = searchSamples(query, { maxResults: maxResults + 5 }, lib);

  // Filter out samples already in use
  const filtered = context.currentSamples
    ? results.filter((r) => !context.currentSamples!.includes(r.sample.id))
    : results;

  return filtered.slice(0, maxResults);
}

/**
 * Quick search by category and mood
 */
export function quickSearch(
  category: SampleCategory,
  mood?: MoodTag,
  maxResults: number = 10,
  library?: SampleLibrary
): Sample[] {
  const lib = library || getSampleLibrary();

  let samples = lib.getByCategory(category);

  if (mood) {
    samples = samples.filter((s) => s.moodTags.includes(mood));
  }

  return samples.slice(0, maxResults);
}
