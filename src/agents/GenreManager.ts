/**
 * GenreManager - Handles genre detection, settings, and pattern generation
 *
 * Supports multiple genres with characteristic patterns, BPM ranges,
 * and genre-specific Strudel code examples.
 *
 * @references FR-024 through FR-030
 */

export type GenreType =
  | 'house'
  | 'techno'
  | 'drum_and_bass'
  | 'dubstep'
  | 'tropical_house'
  | 'ambient'
  | 'downtempo'
  | 'unknown'

export interface GenreConfig {
  id: GenreType
  name: string
  /** BPM range [min, max] */
  bpmRange: [number, number]
  /** Default BPM for genre */
  defaultBpm: number
  /** Key characteristics */
  characteristics: string[]
  /** Example pattern for this genre */
  examplePattern: string
  /** Drum pattern description */
  drumPattern: string
  /** Bass pattern description */
  bassPattern: string
  /** Common sounds/instruments */
  commonSounds: string[]
  /** Keywords that indicate this genre */
  keywords: string[]
}

// Genre configurations
export const GENRE_CONFIGS: Record<GenreType, GenreConfig> = {
  house: {
    id: 'house',
    name: 'House',
    bpmRange: [118, 130],
    defaultBpm: 124,
    characteristics: [
      'Four-on-the-floor kick',
      'Off-beat hi-hats',
      'Driving but groovy',
      'Disco and soul influences',
    ],
    examplePattern: `stack(
  s("bd*4").gain(0.9),
  s("~ hh ~ hh").gain(0.5),
  s("~ cp ~ ~").room(0.3).gain(0.7),
  note("<c3 ~ c3 f3 ~ f3 g3 ~>").s("sawtooth").lpf(800).gain(0.6)
)`,
    drumPattern: 'bd*4, off-beat hats, claps on 2 and 4',
    bassPattern: 'Groovy bass line following chord roots',
    commonSounds: ['bd', 'hh', 'oh', 'cp', 'sawtooth', 'piano'],
    keywords: ['house', 'disco', 'groovy', 'funky', 'soulful', 'deep house'],
  },

  techno: {
    id: 'techno',
    name: 'Techno',
    bpmRange: [125, 145],
    defaultBpm: 130,
    characteristics: [
      'Driving four-on-the-floor',
      'Industrial and mechanical feel',
      'Minimal melodic elements',
      'Heavy use of synthesizers',
    ],
    examplePattern: `stack(
  s("bd:3*4").gain(0.95),
  s("~ sd:5 ~ sd:5").room(0.2).gain(0.7),
  s("hh*16").gain(0.4).lpf(3000),
  s("~ ~ ~ rim").gain(0.5),
  note("<c2 c2 c2 d#2>").s("sawtooth").lpf(300).gain(0.7)
)`,
    drumPattern: 'Hard kick*4, industrial snare, relentless hats',
    bassPattern: 'Pulsing, hypnotic bass on root notes',
    commonSounds: ['bd:3', 'sd:5', 'hh', 'rim', 'sawtooth', 'noise'],
    keywords: ['techno', 'industrial', 'dark', 'pulsing', 'driving', 'berlin'],
  },

  drum_and_bass: {
    id: 'drum_and_bass',
    name: 'Drum and Bass',
    bpmRange: [165, 185],
    defaultBpm: 174,
    characteristics: [
      'Fast breakbeat patterns',
      'Heavy sub bass (Reese bass)',
      'Syncopated rhythms',
      'High energy',
      'Two-step patterns',
    ],
    examplePattern: `stack(
  s("bd ~ ~ bd ~ ~ bd ~").gain(0.9),
  s("~ ~ sd ~ ~ [sd ~] ~ sd").room(0.2).gain(0.85),
  s("hh*8").gain(0.4).lpf(6000),
  s("[~ oh] ~ [~ oh] ~").gain(0.3),
  note("<c1 ~ c1 d#1 ~ f1 ~ c1>").s("sawtooth").lpf(200).gain(0.8).room(0.3)
)`,
    drumPattern: 'Syncopated kicks, two-step snare, fast hats, amen break variations',
    bassPattern: 'Reese bass, rolling sub, following syncopated rhythm',
    commonSounds: ['bd', 'sd', 'hh', 'oh', 'sawtooth', 'amen'],
    keywords: ['drum and bass', 'dnb', 'd&b', 'jungle', 'breakbeat', 'amen', 'reese', 'liquid'],
  },

  dubstep: {
    id: 'dubstep',
    name: 'Dubstep',
    bpmRange: [138, 142],
    defaultBpm: 140,
    characteristics: [
      'Half-time feel',
      'Heavy wobble bass',
      'Syncopated snares',
      'Dark and aggressive',
      'Heavy drops',
    ],
    examplePattern: `stack(
  s("bd ~ ~ ~ bd ~ ~ ~").gain(0.95),
  s("~ ~ ~ sd ~ ~ ~ sd").room(0.3).gain(0.9),
  s("hh*4").gain(0.3).lpf(4000),
  note("<c1 ~ ~ ~ d#1 ~ ~ ~>").s("sawtooth").lpf(sine.range(200, 800).fast(4)).gain(0.85)
).slow(2)`,
    drumPattern: 'Half-time kick-snare, sparse hats, heavy snare on 3',
    bassPattern: 'Wobble bass with LFO modulation, growling',
    commonSounds: ['bd', 'sd', 'hh', 'sawtooth', 'square'],
    keywords: ['dubstep', 'wobble', 'heavy', 'growl', 'brostep', 'filthy', 'riddim'],
  },

  tropical_house: {
    id: 'tropical_house',
    name: 'Tropical House',
    bpmRange: [100, 118],
    defaultBpm: 108,
    characteristics: [
      'Relaxed, summery vibe',
      'Steel drums and marimbas',
      'Light percussion',
      'Bright and uplifting',
      'Beach/island feel',
    ],
    examplePattern: `stack(
  s("bd ~ bd ~").gain(0.7),
  s("~ ~ sd ~").room(0.5).gain(0.6),
  s("hh*4").gain(0.3).lpf(5000),
  s("[rim ~] ~ [rim rim] ~").gain(0.4),
  note("<c4 e4 g4 c5 e5 c5 g4 e4>").s("pluck").room(0.6).gain(0.5),
  note("<c3 ~ g3 ~ e3 ~ g3 ~>").s("triangle").lpf(1500).gain(0.4)
).slow(1.2)`,
    drumPattern: 'Light kick, soft snare with reverb, subtle hats',
    bassPattern: 'Melodic, playful bass lines',
    commonSounds: ['bd', 'sd', 'hh', 'rim', 'pluck', 'marimba', 'steel'],
    keywords: ['tropical', 'summer', 'beach', 'island', 'kygo', 'marimba', 'steel drum'],
  },

  ambient: {
    id: 'ambient',
    name: 'Ambient',
    bpmRange: [60, 100],
    defaultBpm: 80,
    characteristics: [
      'Atmospheric and spacious',
      'Minimal or no drums',
      'Long evolving pads',
      'Heavy reverb and delay',
      'Meditative',
    ],
    examplePattern: `stack(
  note("<c3 e3 g3 b3>").s("pad").room(0.95).lpf(2000).gain(0.4).slow(4),
  note("<c4 ~ ~ g4 ~ ~ e4 ~>").s("sine").room(0.9).delay(0.5).gain(0.3).slow(2),
  s("~ ~ ~ bd").room(0.8).gain(0.3).lpf(500)
).slow(2)`,
    drumPattern: 'Minimal or none, occasional deep kick',
    bassPattern: 'Drone-like, sustained notes',
    commonSounds: ['pad', 'sine', 'atmosphere', 'noise'],
    keywords: ['ambient', 'atmospheric', 'chill', 'meditation', 'spacey', 'ethereal', 'floating'],
  },

  downtempo: {
    id: 'downtempo',
    name: 'Downtempo',
    bpmRange: [70, 100],
    defaultBpm: 85,
    characteristics: [
      'Relaxed groove',
      'Trip-hop influences',
      'Lush textures',
      'Organic and electronic blend',
    ],
    examplePattern: `stack(
  s("bd ~ ~ bd ~ ~ bd ~").gain(0.7).room(0.4),
  s("~ ~ sd ~ ~ ~ sd ~").room(0.5).gain(0.6),
  s("hh*4").gain(0.25).lpf(3000),
  note("<c3 eb3 g3 bb3>").s("sawtooth").lpf(1200).room(0.6).gain(0.4),
  note("<c4 ~ g4 ~ eb5 ~ g4 ~>").s("triangle").delay(0.4).gain(0.3)
).slow(1.5)`,
    drumPattern: 'Hip-hop influenced, laid back, sparse',
    bassPattern: 'Warm, deep, following slow groove',
    commonSounds: ['bd', 'sd', 'hh', 'sawtooth', 'pad', 'piano'],
    keywords: ['downtempo', 'chill', 'trip-hop', 'lounge', 'relaxed', 'mellow'],
  },

  unknown: {
    id: 'unknown',
    name: 'Unknown',
    bpmRange: [80, 140],
    defaultBpm: 120,
    characteristics: ['Mixed or unspecified genre'],
    examplePattern: `stack(
  s("bd sd bd sd").gain(0.8),
  s("hh*8").gain(0.4)
)`,
    drumPattern: 'Generic 4/4 pattern',
    bassPattern: 'Simple bass line',
    commonSounds: ['bd', 'sd', 'hh'],
    keywords: [],
  },
}

/**
 * Detect genre from a prompt string
 */
export function detectGenre(prompt: string): GenreType {
  const lowered = prompt.toLowerCase()

  // Check each genre's keywords
  for (const [genreId, config] of Object.entries(GENRE_CONFIGS)) {
    if (genreId === 'unknown') continue

    for (const keyword of config.keywords) {
      if (lowered.includes(keyword)) {
        return genreId as GenreType
      }
    }
  }

  // Check for BPM hints
  const bpmMatch = lowered.match(/(\d{2,3})\s*bpm/)
  if (bpmMatch) {
    const bpm = parseInt(bpmMatch[1])
    return detectGenreFromBpm(bpm)
  }

  return 'unknown'
}

/**
 * Detect genre from BPM value
 */
export function detectGenreFromBpm(bpm: number): GenreType {
  // Find genre with matching BPM range
  const candidates: { genre: GenreType; distance: number }[] = []

  for (const [genreId, config] of Object.entries(GENRE_CONFIGS)) {
    if (genreId === 'unknown') continue

    const [min, max] = config.bpmRange
    if (bpm >= min && bpm <= max) {
      // Calculate distance from center of range
      const center = (min + max) / 2
      candidates.push({
        genre: genreId as GenreType,
        distance: Math.abs(bpm - center),
      })
    }
  }

  if (candidates.length > 0) {
    // Return genre with closest center
    candidates.sort((a, b) => a.distance - b.distance)
    return candidates[0].genre
  }

  return 'unknown'
}

/**
 * Get suggested BPM for a genre
 */
export function getGenreBpm(genre: GenreType): number {
  return GENRE_CONFIGS[genre].defaultBpm
}

/**
 * Get BPM range for a genre
 */
export function getGenreBpmRange(genre: GenreType): [number, number] {
  return GENRE_CONFIGS[genre].bpmRange
}

/**
 * Check if BPM is valid for a genre
 */
export function isValidBpmForGenre(bpm: number, genre: GenreType): boolean {
  const [min, max] = GENRE_CONFIGS[genre].bpmRange
  return bpm >= min && bpm <= max
}

/**
 * Get genre-specific example pattern
 */
export function getGenrePattern(genre: GenreType): string {
  return GENRE_CONFIGS[genre].examplePattern
}

/**
 * Get genre configuration
 */
export function getGenreConfig(genre: GenreType): GenreConfig {
  return GENRE_CONFIGS[genre]
}

/**
 * Create genre context for the AI agent
 */
export function createGenreContext(genre: GenreType): string {
  const config = GENRE_CONFIGS[genre]

  return `Genre: ${config.name}
BPM Range: ${config.bpmRange[0]}-${config.bpmRange[1]} (default: ${config.defaultBpm})
Characteristics: ${config.characteristics.join(', ')}
Drum Pattern: ${config.drumPattern}
Bass Pattern: ${config.bassPattern}
Common Sounds: ${config.commonSounds.join(', ')}

Example Pattern:
${config.examplePattern}`
}

/**
 * GenreManager class for managing genre state
 */
export class GenreManager {
  private currentGenre: GenreType = 'unknown'
  private listeners: Set<(genre: GenreType) => void> = new Set()

  /**
   * Get current genre
   */
  getGenre(): GenreType {
    return this.currentGenre
  }

  /**
   * Set current genre
   */
  setGenre(genre: GenreType): void {
    if (this.currentGenre !== genre) {
      this.currentGenre = genre
      this.notifyListeners()
    }
  }

  /**
   * Detect and set genre from prompt
   */
  detectAndSetGenre(prompt: string): GenreType {
    const detected = detectGenre(prompt)
    if (detected !== 'unknown') {
      this.setGenre(detected)
    }
    return detected
  }

  /**
   * Get current genre config
   */
  getConfig(): GenreConfig {
    return getGenreConfig(this.currentGenre)
  }

  /**
   * Get recommended BPM for current genre
   */
  getRecommendedBpm(): number {
    return getGenreBpm(this.currentGenre)
  }

  /**
   * Check if current BPM is valid for genre
   */
  isValidBpm(bpm: number): boolean {
    return isValidBpmForGenre(bpm, this.currentGenre)
  }

  /**
   * Subscribe to genre changes
   */
  subscribe(listener: (genre: GenreType) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify listeners of genre change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentGenre)
      } catch (err) {
        console.error('[GenreManager] Error in listener:', err)
      }
    }
  }

  /**
   * Reset to unknown genre
   */
  reset(): void {
    this.currentGenre = 'unknown'
    this.notifyListeners()
  }
}

// Singleton instance
let genreManagerInstance: GenreManager | null = null

export function getGenreManager(): GenreManager {
  if (!genreManagerInstance) {
    genreManagerInstance = new GenreManager()
  }
  return genreManagerInstance
}

export function resetGenreManager(): void {
  if (genreManagerInstance) {
    genreManagerInstance.reset()
  }
  genreManagerInstance = null
}
