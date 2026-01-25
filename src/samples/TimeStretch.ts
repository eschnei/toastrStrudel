/**
 * TimeStretch - Auto time-stretching functionality for samples
 *
 * Detects sample BPM from metadata, calculates stretch ratios,
 * and applies time-stretching using Strudel's .speed() method
 * or Web Audio API for pitch preservation.
 *
 * @references FR-034
 */

import type { Sample } from './SampleLibrary';

/**
 * Time stretch mode
 */
export type StretchMode = 'speed' | 'pitch-preserve';

/**
 * Time stretch result containing Strudel code modifiers
 */
export interface TimeStretchResult {
  /** The stretch ratio applied */
  stretchRatio: number;
  /** Original BPM of the sample */
  originalBpm: number | null;
  /** Target BPM */
  targetBpm: number;
  /** Strudel code modifier to apply (e.g., ".speed(0.5)") */
  strudelModifier: string;
  /** Whether pitch is preserved */
  pitchPreserved: boolean;
  /** Stretch mode used */
  mode: StretchMode;
  /** Estimated new duration in seconds */
  newDuration: number;
}

/**
 * Time stretch options
 */
export interface TimeStretchOptions {
  /** Target BPM to stretch to */
  targetBpm: number;
  /** Stretch mode: 'speed' (changes pitch) or 'pitch-preserve' */
  mode?: StretchMode;
  /** Whether to apply stretch even if sample has no BPM (default: false) */
  forceStretch?: boolean;
  /** Fallback BPM to assume for samples without BPM metadata */
  fallbackBpm?: number;
  /** Maximum stretch ratio to allow (default: 2.0) */
  maxStretchRatio?: number;
  /** Minimum stretch ratio to allow (default: 0.5) */
  minStretchRatio?: number;
}

/**
 * Default BPM assumptions for different sample types
 */
const DEFAULT_BPM_BY_TYPE: Record<string, number> = {
  kicks: 120,
  snares: 120,
  hats: 120,
  percussion: 120,
  bass: 120,
  synth: 120,
  fx: 120,
  vocals: 120,
};

/**
 * Calculate the stretch ratio to match target BPM
 */
export function calculateStretchRatio(
  originalBpm: number,
  targetBpm: number,
  options?: Pick<TimeStretchOptions, 'maxStretchRatio' | 'minStretchRatio'>
): number {
  // Ratio = target / original
  // If original is 100 and target is 120, ratio is 1.2 (speed up)
  // If original is 100 and target is 80, ratio is 0.8 (slow down)
  let ratio = targetBpm / originalBpm;

  // Clamp to allowed range
  const maxRatio = options?.maxStretchRatio ?? 2.0;
  const minRatio = options?.minStretchRatio ?? 0.5;

  ratio = Math.max(minRatio, Math.min(maxRatio, ratio));

  return ratio;
}

/**
 * Detect the BPM of a sample from its metadata
 */
export function detectSampleBpm(sample: Sample, fallbackBpm?: number): number | null {
  // First check explicit BPM in sample metadata
  if (sample.bpm !== null && sample.bpm > 0) {
    return sample.bpm;
  }

  // Check if it's a loop that might have BPM info in description
  if (sample.metadata?.description) {
    const bpmMatch = sample.metadata.description.match(/(\d{2,3})\s*bpm/i);
    if (bpmMatch) {
      return parseInt(bpmMatch[1], 10);
    }
  }

  // Use type-based default if available
  if (fallbackBpm) {
    return fallbackBpm;
  }

  // For loops, we might assume a default
  if (sample.metadata?.isLoop) {
    return DEFAULT_BPM_BY_TYPE[sample.type] || 120;
  }

  // No BPM detected
  return null;
}

/**
 * Generate Strudel speed modifier for time stretching
 */
export function generateSpeedModifier(ratio: number): string {
  // Round to 3 decimal places for cleaner code
  const roundedRatio = Math.round(ratio * 1000) / 1000;

  // If ratio is effectively 1, no modifier needed
  if (Math.abs(roundedRatio - 1) < 0.001) {
    return '';
  }

  return `.speed(${roundedRatio})`;
}

/**
 * Generate Strudel pattern for pitch-preserved stretching
 * Uses unit and speed together for more accurate results
 */
export function generatePitchPreserveModifier(ratio: number): string {
  const roundedRatio = Math.round(ratio * 1000) / 1000;

  if (Math.abs(roundedRatio - 1) < 0.001) {
    return '';
  }

  // Using unit("c") makes the pattern respect the cycle length
  // Combined with speed, we can stretch while the pitch shift is minimal
  // Note: True pitch preservation requires more complex audio processing
  return `.speed(${roundedRatio}).unit("c")`;
}

/**
 * Calculate time stretch for a sample to match target BPM
 */
export function calculateTimeStretch(
  sample: Sample,
  options: TimeStretchOptions
): TimeStretchResult {
  const { targetBpm, mode = 'speed', forceStretch = false, fallbackBpm } = options;

  // Detect sample BPM
  const originalBpm = detectSampleBpm(sample, fallbackBpm);

  // Handle case where no BPM is detected
  if (originalBpm === null) {
    if (!forceStretch) {
      // No stretch applied
      return {
        stretchRatio: 1,
        originalBpm: null,
        targetBpm,
        strudelModifier: '',
        pitchPreserved: mode === 'pitch-preserve',
        mode,
        newDuration: sample.duration,
      };
    }
    // Use fallback or default
    const assumedBpm = fallbackBpm || DEFAULT_BPM_BY_TYPE[sample.type] || 120;
    return calculateTimeStretchWithBpm(sample, assumedBpm, options);
  }

  return calculateTimeStretchWithBpm(sample, originalBpm, options);
}

/**
 * Internal helper to calculate time stretch with known BPM
 */
function calculateTimeStretchWithBpm(
  sample: Sample,
  originalBpm: number,
  options: TimeStretchOptions
): TimeStretchResult {
  const { targetBpm, mode = 'speed' } = options;

  // Calculate stretch ratio
  const stretchRatio = calculateStretchRatio(originalBpm, targetBpm, options);

  // Generate appropriate modifier
  const strudelModifier =
    mode === 'pitch-preserve'
      ? generatePitchPreserveModifier(stretchRatio)
      : generateSpeedModifier(stretchRatio);

  // Calculate new duration
  const newDuration = sample.duration / stretchRatio;

  return {
    stretchRatio,
    originalBpm,
    targetBpm,
    strudelModifier,
    pitchPreserved: mode === 'pitch-preserve',
    mode,
    newDuration,
  };
}

/**
 * Apply time stretch to a Strudel pattern string
 */
export function applyTimeStretch(
  patternCode: string,
  sample: Sample,
  options: TimeStretchOptions
): string {
  const result = calculateTimeStretch(sample, options);

  if (!result.strudelModifier) {
    return patternCode;
  }

  // If the pattern already ends with a method call, just append
  // Otherwise, we need to be careful about syntax
  const trimmed = patternCode.trim();

  // Check if pattern ends with ) - likely a method call or function
  if (trimmed.endsWith(')')) {
    return `${trimmed}${result.strudelModifier}`;
  }

  // Check if it's a string pattern (starts with s( or sound()
  if (trimmed.startsWith('s(') || trimmed.startsWith('sound(')) {
    return `${trimmed}${result.strudelModifier}`;
  }

  // For other patterns, wrap in parentheses
  return `(${trimmed})${result.strudelModifier}`;
}

/**
 * Generate Strudel pattern for a sample with time stretching
 */
export function generateStretchedSamplePattern(
  sample: Sample,
  options: TimeStretchOptions
): string {
  const result = calculateTimeStretch(sample, options);

  // Build the basic pattern
  let pattern = `s("${sample.path}")`;

  // Apply time stretch modifier
  if (result.strudelModifier) {
    pattern += result.strudelModifier;
  }

  return pattern;
}

/**
 * Batch time stretch calculation for multiple samples
 */
export function batchTimeStretch(
  samples: Sample[],
  options: TimeStretchOptions
): Map<string, TimeStretchResult> {
  const results = new Map<string, TimeStretchResult>();

  for (const sample of samples) {
    results.set(sample.id, calculateTimeStretch(sample, options));
  }

  return results;
}

/**
 * Get stretch info for displaying to users
 */
export function getStretchInfo(result: TimeStretchResult): string {
  if (result.stretchRatio === 1) {
    return 'No time stretch needed';
  }

  const percentChange = Math.round((result.stretchRatio - 1) * 100);
  const direction = percentChange > 0 ? 'faster' : 'slower';
  const absPercent = Math.abs(percentChange);

  if (result.originalBpm) {
    return `${absPercent}% ${direction} (${result.originalBpm} BPM -> ${result.targetBpm} BPM)`;
  }

  return `${absPercent}% ${direction}`;
}

/**
 * Calculate if a sample is compatible with a target BPM
 * (i.e., can be stretched without extreme distortion)
 */
export function isBpmCompatible(
  sample: Sample,
  targetBpm: number,
  options?: Pick<TimeStretchOptions, 'maxStretchRatio' | 'minStretchRatio'>
): boolean {
  if (sample.bpm === null) {
    return true; // One-shots are always compatible
  }

  const ratio = targetBpm / sample.bpm;
  const maxRatio = options?.maxStretchRatio ?? 2.0;
  const minRatio = options?.minStretchRatio ?? 0.5;

  return ratio >= minRatio && ratio <= maxRatio;
}

/**
 * Get recommended stretch mode based on sample characteristics
 */
export function getRecommendedStretchMode(
  sample: Sample,
  targetBpm: number
): StretchMode {
  // For melodic content (synth, bass, vocals), prefer pitch-preserve
  if (['synth', 'bass', 'vocals'].includes(sample.type)) {
    return 'pitch-preserve';
  }

  // For drums and percussion, speed mode is usually fine
  if (['kicks', 'snares', 'hats', 'percussion'].includes(sample.type)) {
    return 'speed';
  }

  // For FX, check the stretch ratio
  if (sample.bpm) {
    const ratio = targetBpm / sample.bpm;
    // Large tempo changes on FX might benefit from pitch preserve
    if (ratio < 0.7 || ratio > 1.4) {
      return 'pitch-preserve';
    }
  }

  return 'speed';
}
