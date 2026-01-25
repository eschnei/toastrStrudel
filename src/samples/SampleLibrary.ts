/**
 * SampleLibrary - Indexed sample library with metadata for searchable samples
 *
 * Provides a searchable library of samples organized by category with rich
 * metadata including BPM, key, mood tags, and duration. Supports runtime
 * loading of JSON index files.
 *
 * @references FR-033
 */

export type SampleCategory =
  | 'kicks'
  | 'snares'
  | 'hats'
  | 'percussion'
  | 'bass'
  | 'synth'
  | 'fx'
  | 'vocals';

export type MoodTag =
  | 'dark'
  | 'bright'
  | 'aggressive'
  | 'chill'
  | 'dreamy'
  | 'energetic'
  | 'wonky'
  | 'clean'
  | 'dirty'
  | 'punchy'
  | 'soft'
  | 'deep'
  | 'sharp'
  | 'warm'
  | 'cold'
  | 'organic'
  | 'synthetic'
  | 'metallic'
  | 'woody'
  | 'glitchy'
  | 'smooth'
  | 'gritty'
  | 'atmospheric'
  | 'minimal'
  | 'complex'
  | 'vintage'
  | 'modern'
  | 'lo-fi'
  | 'hi-fi';

export type MusicalKey =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'
  | null; // null for atonal samples (drums, etc.)

export interface Sample {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Path to sample file (can be URL or Strudel sample reference) */
  path: string;
  /** Sample category */
  type: SampleCategory;
  /** BPM if applicable (null for one-shots) */
  bpm: number | null;
  /** Musical key if applicable */
  key: MusicalKey;
  /** Mood/character tags */
  moodTags: MoodTag[];
  /** Duration in seconds */
  duration: number;
  /** Additional metadata */
  metadata?: {
    /** Source pack or collection */
    pack?: string;
    /** Artist/creator */
    artist?: string;
    /** Genre association */
    genre?: string;
    /** Whether sample is a loop */
    isLoop?: boolean;
    /** Whether sample is a one-shot */
    isOneShot?: boolean;
    /** Pitch/note if applicable (e.g., "C3") */
    pitch?: string;
    /** Description */
    description?: string;
  };
}

export interface SampleLibraryIndex {
  version: string;
  samples: Sample[];
  categories: Record<SampleCategory, string[]>; // Map of category to sample IDs
  lastUpdated: string;
}

export interface SampleSearchResult {
  sample: Sample;
  relevanceScore: number;
  matchedFields: string[];
}

export interface SampleLibraryStats {
  totalSamples: number;
  categoryCounts: Record<SampleCategory, number>;
  moodTagCounts: Record<string, number>;
  bpmRange: { min: number; max: number } | null;
}

/**
 * SampleLibrary class - manages indexed sample library
 */
export class SampleLibrary {
  private samples: Map<string, Sample> = new Map();
  private byCategory: Map<SampleCategory, Set<string>> = new Map();
  private byMoodTag: Map<MoodTag, Set<string>> = new Map();
  private byBpmRange: Map<string, Set<string>> = new Map(); // e.g., "120-130" -> sample IDs
  private isLoaded = false;

  constructor() {
    // Initialize category maps
    const categories: SampleCategory[] = [
      'kicks',
      'snares',
      'hats',
      'percussion',
      'bass',
      'synth',
      'fx',
      'vocals',
    ];
    categories.forEach((cat) => this.byCategory.set(cat, new Set()));
  }

  /**
   * Load samples from a JSON index
   */
  async loadFromIndex(index: SampleLibraryIndex): Promise<void> {
    this.clear();

    for (const sample of index.samples) {
      this.addSample(sample);
    }

    this.isLoaded = true;
    console.log(`[SampleLibrary] Loaded ${this.samples.size} samples`);
  }

  /**
   * Load samples from a JSON URL
   */
  async loadFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sample index: ${response.statusText}`);
      }
      const index: SampleLibraryIndex = await response.json();
      await this.loadFromIndex(index);
    } catch (error) {
      console.error('[SampleLibrary] Error loading from URL:', error);
      throw error;
    }
  }

  /**
   * Add a single sample to the library
   */
  addSample(sample: Sample): void {
    // Store sample
    this.samples.set(sample.id, sample);

    // Index by category
    const categorySet = this.byCategory.get(sample.type);
    if (categorySet) {
      categorySet.add(sample.id);
    } else {
      this.byCategory.set(sample.type, new Set([sample.id]));
    }

    // Index by mood tags
    for (const tag of sample.moodTags) {
      const tagSet = this.byMoodTag.get(tag);
      if (tagSet) {
        tagSet.add(sample.id);
      } else {
        this.byMoodTag.set(tag, new Set([sample.id]));
      }
    }

    // Index by BPM range (10 BPM buckets)
    if (sample.bpm !== null) {
      const bucket = Math.floor(sample.bpm / 10) * 10;
      const key = `${bucket}-${bucket + 10}`;
      const bpmSet = this.byBpmRange.get(key);
      if (bpmSet) {
        bpmSet.add(sample.id);
      } else {
        this.byBpmRange.set(key, new Set([sample.id]));
      }
    }
  }

  /**
   * Remove a sample from the library
   */
  removeSample(id: string): boolean {
    const sample = this.samples.get(id);
    if (!sample) return false;

    // Remove from all indices
    this.samples.delete(id);
    this.byCategory.get(sample.type)?.delete(id);
    sample.moodTags.forEach((tag) => this.byMoodTag.get(tag)?.delete(id));

    if (sample.bpm !== null) {
      const bucket = Math.floor(sample.bpm / 10) * 10;
      const key = `${bucket}-${bucket + 10}`;
      this.byBpmRange.get(key)?.delete(id);
    }

    return true;
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.samples.clear();
    this.byCategory.forEach((set) => set.clear());
    this.byMoodTag.clear();
    this.byBpmRange.clear();
    this.isLoaded = false;
  }

  /**
   * Get a sample by ID
   */
  getSample(id: string): Sample | undefined {
    return this.samples.get(id);
  }

  /**
   * Get all samples
   */
  getAllSamples(): Sample[] {
    return Array.from(this.samples.values());
  }

  /**
   * Get samples by category
   */
  getByCategory(category: SampleCategory): Sample[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.samples.get(id))
      .filter((s): s is Sample => s !== undefined);
  }

  /**
   * Get samples by mood tag
   */
  getByMoodTag(tag: MoodTag): Sample[] {
    const ids = this.byMoodTag.get(tag);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.samples.get(id))
      .filter((s): s is Sample => s !== undefined);
  }

  /**
   * Get samples within a BPM range
   */
  getByBpmRange(minBpm: number, maxBpm: number): Sample[] {
    const results: Sample[] = [];

    for (const sample of this.samples.values()) {
      if (sample.bpm !== null && sample.bpm >= minBpm && sample.bpm <= maxBpm) {
        results.push(sample);
      }
    }

    return results;
  }

  /**
   * Get library statistics
   */
  getStats(): SampleLibraryStats {
    const categoryCounts: Record<SampleCategory, number> = {
      kicks: 0,
      snares: 0,
      hats: 0,
      percussion: 0,
      bass: 0,
      synth: 0,
      fx: 0,
      vocals: 0,
    };

    const moodTagCounts: Record<string, number> = {};
    let minBpm: number | null = null;
    let maxBpm: number | null = null;

    for (const sample of this.samples.values()) {
      categoryCounts[sample.type]++;

      for (const tag of sample.moodTags) {
        moodTagCounts[tag] = (moodTagCounts[tag] || 0) + 1;
      }

      if (sample.bpm !== null) {
        if (minBpm === null || sample.bpm < minBpm) minBpm = sample.bpm;
        if (maxBpm === null || sample.bpm > maxBpm) maxBpm = sample.bpm;
      }
    }

    return {
      totalSamples: this.samples.size,
      categoryCounts,
      moodTagCounts,
      bpmRange:
        minBpm !== null && maxBpm !== null ? { min: minBpm, max: maxBpm } : null,
    };
  }

  /**
   * Check if library is loaded
   */
  isLibraryLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get sample count
   */
  getSampleCount(): number {
    return this.samples.size;
  }

  /**
   * Export library to JSON index format
   */
  exportToIndex(): SampleLibraryIndex {
    const samples = this.getAllSamples();
    const categories: Record<SampleCategory, string[]> = {
      kicks: [],
      snares: [],
      hats: [],
      percussion: [],
      bass: [],
      synth: [],
      fx: [],
      vocals: [],
    };

    for (const sample of samples) {
      categories[sample.type].push(sample.id);
    }

    return {
      version: '1.0.0',
      samples,
      categories,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get all unique mood tags in the library
   */
  getAvailableMoodTags(): MoodTag[] {
    return Array.from(this.byMoodTag.keys());
  }

  /**
   * Get all categories with samples
   */
  getAvailableCategories(): SampleCategory[] {
    return Array.from(this.byCategory.entries())
      .filter(([, ids]) => ids.size > 0)
      .map(([cat]) => cat);
  }
}

// Singleton instance
let sampleLibraryInstance: SampleLibrary | null = null;

export function getSampleLibrary(): SampleLibrary {
  if (!sampleLibraryInstance) {
    sampleLibraryInstance = new SampleLibrary();
  }
  return sampleLibraryInstance;
}

export function resetSampleLibrary(): void {
  if (sampleLibraryInstance) {
    sampleLibraryInstance.clear();
  }
  sampleLibraryInstance = null;
}
