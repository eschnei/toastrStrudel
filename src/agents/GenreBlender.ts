/**
 * GenreBlender - Handles genre blending and hybrid pattern generation
 *
 * Parses prompts like "tropical house that goes DnB" and creates
 * hybrid patterns blending characteristics from multiple genres.
 *
 * @references FR-030
 */

import type { GenreType, GenreConfig } from './GenreManager'
import { GENRE_CONFIGS, detectGenre } from './GenreManager'

export interface BlendedGenre {
  /** Primary genre (main characteristics) */
  primary: GenreType
  /** Secondary genre (blended characteristics) */
  secondary: GenreType
  /** Blend ratio (0-1, where 0 = all primary, 1 = all secondary) */
  ratio: number
  /** Calculated BPM for the blend */
  bpm: number
  /** Description of the blend */
  description: string
  /** Transition type if any */
  transitionType?: 'starts_as' | 'goes_to' | 'mixed' | 'influenced_by'
}

/**
 * Patterns that indicate genre blending
 */
const BLEND_PATTERNS = {
  starts_as: [
    /starts?\s+(?:as\s+)?(\w+(?:\s+\w+)?)\s+(?:and\s+)?(?:then\s+)?(?:goes?\s+to|transitions?\s+to|becomes?)\s+(\w+(?:\s+\w+)?)/i,
    /(\w+(?:\s+\w+)?)\s+that\s+(?:goes?|turns?|transitions?)\s+(?:to\s+)?(\w+(?:\s+\w+)?)/i,
  ],
  goes_to: [
    /(?:go(?:es)?|transition)\s+(?:from\s+)?(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)/i,
  ],
  mixed: [
    /(?:mix|blend|combine)\s+(\w+(?:\s+\w+)?)\s+(?:and|with)\s+(\w+(?:\s+\w+)?)/i,
    /(\w+(?:\s+\w+)?)\s+(?:meets?|x|\+)\s+(\w+(?:\s+\w+)?)/i,
  ],
  influenced_by: [
    /(\w+(?:\s+\w+)?)\s+(?:with|influenced\s+by|inspired\s+by)\s+(\w+(?:\s+\w+)?)\s+(?:elements?|vibes?|feel)/i,
    /(\w+(?:\s+\w+)?)\s+with\s+a\s+(\w+(?:\s+\w+)?)\s+(?:touch|edge|twist)/i,
  ],
}

/**
 * Map text to genre type
 */
function textToGenre(text: string): GenreType {
  const lowered = text.toLowerCase().trim()

  // Check for direct matches
  for (const [genreId, config] of Object.entries(GENRE_CONFIGS)) {
    if (genreId === 'unknown') continue

    // Check name
    if (config.name.toLowerCase() === lowered) {
      return genreId as GenreType
    }

    // Check keywords
    for (const keyword of config.keywords) {
      if (lowered === keyword || lowered.includes(keyword)) {
        return genreId as GenreType
      }
    }
  }

  // Special cases
  if (lowered === 'dnb' || lowered === 'd&b' || lowered === 'd n b') {
    return 'drum_and_bass'
  }

  return 'unknown'
}

/**
 * Parse a blended genre prompt
 */
export function parseBlendedGenre(prompt: string): BlendedGenre | null {
  const lowered = prompt.toLowerCase().trim()

  // Try each blend pattern type
  for (const [transitionType, patterns] of Object.entries(BLEND_PATTERNS)) {
    for (const pattern of patterns) {
      const match = lowered.match(pattern)
      if (match) {
        const primaryText = match[1]
        const secondaryText = match[2]

        const primary = textToGenre(primaryText)
        const secondary = textToGenre(secondaryText)

        if (primary !== 'unknown' || secondary !== 'unknown') {
          // Calculate blended BPM
          const primaryConfig = GENRE_CONFIGS[primary !== 'unknown' ? primary : secondary]
          const secondaryConfig = GENRE_CONFIGS[secondary !== 'unknown' ? secondary : primary]

          // Blend ratio based on transition type
          let ratio = 0.5
          if (transitionType === 'influenced_by') ratio = 0.25
          if (transitionType === 'starts_as') ratio = 0.3
          if (transitionType === 'goes_to') ratio = 0.7

          // Calculate BPM - lean toward primary for "influenced_by", more toward secondary for "goes_to"
          const bpm = Math.round(
            primaryConfig.defaultBpm * (1 - ratio) + secondaryConfig.defaultBpm * ratio
          )

          return {
            primary: primary !== 'unknown' ? primary : secondary,
            secondary: secondary !== 'unknown' ? secondary : primary,
            ratio,
            bpm,
            description: `${primaryConfig.name} blended with ${secondaryConfig.name}`,
            transitionType: transitionType as BlendedGenre['transitionType'],
          }
        }
      }
    }
  }

  // Check for simple two-genre mention without explicit blend words
  const genres: GenreType[] = []
  for (const [genreId, config] of Object.entries(GENRE_CONFIGS)) {
    if (genreId === 'unknown') continue
    for (const keyword of config.keywords) {
      if (lowered.includes(keyword)) {
        if (!genres.includes(genreId as GenreType)) {
          genres.push(genreId as GenreType)
        }
        break
      }
    }
  }

  if (genres.length >= 2) {
    const primary = genres[0]
    const secondary = genres[1]
    const primaryConfig = GENRE_CONFIGS[primary]
    const secondaryConfig = GENRE_CONFIGS[secondary]

    return {
      primary,
      secondary,
      ratio: 0.4,
      bpm: Math.round((primaryConfig.defaultBpm + secondaryConfig.defaultBpm) / 2),
      description: `${primaryConfig.name} with ${secondaryConfig.name} elements`,
      transitionType: 'mixed',
    }
  }

  return null
}

/**
 * Check if a prompt contains genre blending
 */
export function isBlendedGenrePrompt(prompt: string): boolean {
  return parseBlendedGenre(prompt) !== null
}

/**
 * Get blend-aware BPM suggestion
 */
export function getBlendedBpm(blend: BlendedGenre): number {
  return blend.bpm
}

/**
 * Create context for AI about the genre blend
 */
export function createBlendContext(blend: BlendedGenre): string {
  const primary = GENRE_CONFIGS[blend.primary]
  const secondary = GENRE_CONFIGS[blend.secondary]

  let context = `Genre Blend: ${blend.description}
Target BPM: ${blend.bpm}

PRIMARY GENRE (${primary.name}):
- Characteristics: ${primary.characteristics.slice(0, 3).join(', ')}
- Drum Pattern: ${primary.drumPattern}
- Bass Pattern: ${primary.bassPattern}

SECONDARY GENRE (${secondary.name}):
- Characteristics: ${secondary.characteristics.slice(0, 3).join(', ')}
- Blend elements: ${secondary.commonSounds.slice(0, 4).join(', ')}
`

  switch (blend.transitionType) {
    case 'starts_as':
      context += `\nBLENDING APPROACH: Start with ${primary.name} foundation, incorporate ${secondary.name} elements progressively.`
      break
    case 'goes_to':
      context += `\nBLENDING APPROACH: Structure should evolve from ${primary.name} toward ${secondary.name} characteristics.`
      break
    case 'mixed':
      context += `\nBLENDING APPROACH: Equal blend of both genres - take rhythm from ${primary.name}, textures from ${secondary.name}.`
      break
    case 'influenced_by':
      context += `\nBLENDING APPROACH: Primarily ${primary.name} with subtle ${secondary.name} influences in sounds/textures.`
      break
  }

  return context
}

/**
 * Create a blended example pattern
 */
export function createBlendedPattern(blend: BlendedGenre): string {
  const primary = GENRE_CONFIGS[blend.primary]
  const secondary = GENRE_CONFIGS[blend.secondary]

  // This is a simplified example - the AI will generate the actual pattern
  // But this gives a starting template

  // For now, return a prompt description rather than code
  return `Create a pattern that blends ${primary.name} (${primary.characteristics[0]}) with ${secondary.name} (${secondary.characteristics[0]}) at ${blend.bpm} BPM`
}

/**
 * Handle BPM transition between genres
 */
export function calculateTransitionBpm(
  fromGenre: GenreType,
  toGenre: GenreType,
  progress: number // 0-1
): number {
  const fromBpm = GENRE_CONFIGS[fromGenre].defaultBpm
  const toBpm = GENRE_CONFIGS[toGenre].defaultBpm

  // Ease the transition
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2

  return Math.round(fromBpm + (toBpm - fromBpm) * eased)
}

/**
 * Get valid BPM range for a blend
 */
export function getBlendedBpmRange(blend: BlendedGenre): [number, number] {
  const primaryRange = GENRE_CONFIGS[blend.primary].bpmRange
  const secondaryRange = GENRE_CONFIGS[blend.secondary].bpmRange

  // Find overlap or extended range
  const minBpm = Math.min(primaryRange[0], secondaryRange[0])
  const maxBpm = Math.max(primaryRange[1], secondaryRange[1])

  return [minBpm, maxBpm]
}
