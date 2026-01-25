/**
 * Default Sample Index - Pre-populated sample library with 100+ samples
 *
 * Contains samples organized by category with rich metadata for
 * intelligent searching and matching. Uses Strudel's built-in
 * sample banks (Roland TR-808, TR-909, etc.) for maximum compatibility.
 *
 * @references FR-033
 */

import type { Sample, SampleLibraryIndex, SampleCategory, MoodTag } from './SampleLibrary';

/**
 * Helper to create sample entries
 */
function createSample(
  id: string,
  name: string,
  path: string,
  type: SampleCategory,
  moodTags: MoodTag[],
  options?: {
    bpm?: number | null;
    key?: Sample['key'];
    duration?: number;
    pack?: string;
    genre?: string;
    isLoop?: boolean;
    isOneShot?: boolean;
    description?: string;
  }
): Sample {
  return {
    id,
    name,
    path,
    type,
    bpm: options?.bpm ?? null,
    key: options?.key ?? null,
    moodTags,
    duration: options?.duration ?? 0.5,
    metadata: {
      pack: options?.pack,
      genre: options?.genre,
      isLoop: options?.isLoop ?? false,
      isOneShot: options?.isOneShot ?? true,
      description: options?.description,
    },
  };
}

// ============================================================================
// KICKS (20 samples)
// ============================================================================
const kicks: Sample[] = [
  // TR-808 Kicks
  createSample('kick-808-deep', 'Deep 808 Kick', 'bd:0', 'kicks', ['deep', 'warm', 'punchy'], {
    pack: 'TR-808',
    genre: 'hip-hop',
    description: 'Classic deep 808 kick with long decay',
  }),
  createSample('kick-808-punchy', 'Punchy 808 Kick', 'bd:1', 'kicks', ['punchy', 'clean', 'modern'], {
    pack: 'TR-808',
    genre: 'trap',
  }),
  createSample('kick-808-sub', 'Sub 808 Kick', 'bd:2', 'kicks', ['deep', 'dark', 'soft'], {
    pack: 'TR-808',
    genre: 'dubstep',
  }),
  createSample('kick-808-hard', 'Hard 808 Kick', 'bd:3', 'kicks', ['aggressive', 'punchy', 'bright'], {
    pack: 'TR-808',
    genre: 'trap',
  }),

  // TR-909 Kicks
  createSample('kick-909-classic', 'Classic 909 Kick', 'bd:4', 'kicks', ['punchy', 'clean', 'energetic'], {
    pack: 'TR-909',
    genre: 'techno',
    description: 'The iconic 909 kick for house and techno',
  }),
  createSample('kick-909-hard', 'Hard 909 Kick', 'bd:5', 'kicks', ['aggressive', 'sharp', 'energetic'], {
    pack: 'TR-909',
    genre: 'techno',
  }),
  createSample('kick-909-soft', 'Soft 909 Kick', 'bd:6', 'kicks', ['soft', 'warm', 'chill'], {
    pack: 'TR-909',
    genre: 'house',
  }),

  // CR-78 Kicks
  createSample('kick-cr78-vintage', 'Vintage CR-78 Kick', 'bd:7', 'kicks', ['vintage', 'warm', 'organic'], {
    pack: 'CR-78',
    genre: 'disco',
  }),

  // Electronic kicks
  createSample('kick-electro-1', 'Electro Kick 1', 'kick:0', 'kicks', ['synthetic', 'modern', 'punchy'], {
    genre: 'electro',
  }),
  createSample('kick-electro-2', 'Electro Kick 2', 'kick:1', 'kicks', ['synthetic', 'sharp', 'clean'], {
    genre: 'electro',
  }),
  createSample('kick-dnb', 'DnB Kick', 'kick:2', 'kicks', ['punchy', 'aggressive', 'sharp'], {
    genre: 'dnb',
  }),
  createSample('kick-house', 'House Kick', 'kick:3', 'kicks', ['warm', 'punchy', 'clean'], {
    genre: 'house',
  }),
  createSample('kick-techno-dark', 'Dark Techno Kick', 'kick:4', 'kicks', ['dark', 'aggressive', 'deep'], {
    genre: 'techno',
  }),
  createSample('kick-minimal', 'Minimal Kick', 'kick:5', 'kicks', ['minimal', 'clean', 'modern'], {
    genre: 'minimal',
  }),
  createSample('kick-acoustic', 'Acoustic Kick', 'kick:6', 'kicks', ['organic', 'warm', 'woody'], {
    genre: 'acoustic',
  }),
  createSample('kick-lo-fi', 'Lo-Fi Kick', 'kick:7', 'kicks', ['lo-fi', 'vintage', 'soft'], {
    genre: 'lo-fi',
  }),
  createSample('kick-gabber', 'Gabber Kick', 'kick:8', 'kicks', ['aggressive', 'gritty', 'energetic'], {
    genre: 'gabber',
  }),
  createSample('kick-dubstep', 'Dubstep Kick', 'kick:9', 'kicks', ['deep', 'aggressive', 'dark'], {
    genre: 'dubstep',
  }),
  createSample('kick-ambient', 'Ambient Kick', 'kick:10', 'kicks', ['soft', 'dreamy', 'atmospheric'], {
    genre: 'ambient',
  }),
  createSample('kick-distorted', 'Distorted Kick', 'kick:11', 'kicks', ['gritty', 'aggressive', 'dirty'], {
    genre: 'industrial',
  }),
];

// ============================================================================
// SNARES (18 samples)
// ============================================================================
const snares: Sample[] = [
  // TR-808 Snares
  createSample('snare-808-classic', 'Classic 808 Snare', 'sd:0', 'snares', ['punchy', 'clean', 'bright'], {
    pack: 'TR-808',
    genre: 'hip-hop',
  }),
  createSample('snare-808-tight', 'Tight 808 Snare', 'sd:1', 'snares', ['sharp', 'punchy', 'clean'], {
    pack: 'TR-808',
    genre: 'trap',
  }),
  createSample('snare-808-rim', 'Rimshot 808', 'sd:2', 'snares', ['sharp', 'metallic', 'clean'], {
    pack: 'TR-808',
    genre: 'hip-hop',
  }),

  // TR-909 Snares
  createSample('snare-909-classic', 'Classic 909 Snare', 'sd:3', 'snares', ['punchy', 'sharp', 'energetic'], {
    pack: 'TR-909',
    genre: 'techno',
    description: 'The classic 909 snare for dance music',
  }),
  createSample('snare-909-high', 'High 909 Snare', 'sd:4', 'snares', ['bright', 'sharp', 'energetic'], {
    pack: 'TR-909',
    genre: 'house',
  }),

  // CR-78 Snares
  createSample('snare-cr78', 'CR-78 Snare', 'sd:5', 'snares', ['vintage', 'organic', 'warm'], {
    pack: 'CR-78',
    genre: 'disco',
  }),

  // Electronic snares
  createSample('snare-electro', 'Electro Snare', 'sd:6', 'snares', ['synthetic', 'modern', 'sharp'], {
    genre: 'electro',
  }),
  createSample('snare-trap', 'Trap Snare', 'sd:7', 'snares', ['sharp', 'modern', 'energetic'], {
    genre: 'trap',
  }),
  createSample('snare-dnb', 'DnB Snare', 'sd:8', 'snares', ['punchy', 'sharp', 'aggressive'], {
    genre: 'dnb',
  }),
  createSample('snare-lo-fi', 'Lo-Fi Snare', 'sd:9', 'snares', ['lo-fi', 'vintage', 'warm'], {
    genre: 'lo-fi',
  }),

  // Claps
  createSample('clap-808', '808 Clap', 'cp:0', 'snares', ['punchy', 'bright', 'clean'], {
    pack: 'TR-808',
    genre: 'house',
  }),
  createSample('clap-909', '909 Clap', 'cp:1', 'snares', ['sharp', 'energetic', 'punchy'], {
    pack: 'TR-909',
    genre: 'techno',
  }),
  createSample('clap-tight', 'Tight Clap', 'cp:2', 'snares', ['sharp', 'minimal', 'clean'], {
    genre: 'minimal',
  }),
  createSample('clap-big', 'Big Clap', 'cp:3', 'snares', ['punchy', 'atmospheric', 'bright'], {
    genre: 'edm',
  }),

  // Rim shots
  createSample('rim-808', '808 Rimshot', 'rim:0', 'snares', ['sharp', 'metallic', 'clean'], {
    pack: 'TR-808',
  }),
  createSample('rim-909', '909 Rimshot', 'rim:1', 'snares', ['bright', 'sharp', 'punchy'], {
    pack: 'TR-909',
  }),
  createSample('rim-wood', 'Wood Rimshot', 'rim:2', 'snares', ['woody', 'organic', 'warm'], {}),
  createSample('rim-tight', 'Tight Rimshot', 'rim:3', 'snares', ['minimal', 'sharp', 'clean'], {}),
];

// ============================================================================
// HATS (18 samples)
// ============================================================================
const hats: Sample[] = [
  // Closed hats
  createSample('hat-808-closed', 'Closed 808 Hat', 'hh:0', 'hats', ['sharp', 'clean', 'bright'], {
    pack: 'TR-808',
    genre: 'hip-hop',
  }),
  createSample('hat-909-closed', 'Closed 909 Hat', 'hh:1', 'hats', ['sharp', 'metallic', 'energetic'], {
    pack: 'TR-909',
    genre: 'techno',
  }),
  createSample('hat-cr78-closed', 'Closed CR-78 Hat', 'hh:2', 'hats', ['vintage', 'warm', 'organic'], {
    pack: 'CR-78',
    genre: 'disco',
  }),
  createSample('hat-tight', 'Tight Closed Hat', 'hh:3', 'hats', ['sharp', 'minimal', 'clean'], {
    genre: 'minimal',
  }),
  createSample('hat-soft', 'Soft Closed Hat', 'hh:4', 'hats', ['soft', 'warm', 'chill'], {
    genre: 'lo-fi',
  }),

  // Open hats
  createSample('hat-808-open', 'Open 808 Hat', 'oh:0', 'hats', ['bright', 'clean', 'warm'], {
    pack: 'TR-808',
    genre: 'hip-hop',
  }),
  createSample('hat-909-open', 'Open 909 Hat', 'oh:1', 'hats', ['sharp', 'metallic', 'energetic'], {
    pack: 'TR-909',
    genre: 'techno',
  }),
  createSample('hat-cr78-open', 'Open CR-78 Hat', 'oh:2', 'hats', ['vintage', 'organic', 'warm'], {
    pack: 'CR-78',
    genre: 'disco',
  }),
  createSample('hat-sizzle', 'Sizzle Open Hat', 'oh:3', 'hats', ['bright', 'atmospheric', 'smooth'], {
    genre: 'house',
  }),
  createSample('hat-crash', 'Crash Hat', 'oh:4', 'hats', ['aggressive', 'bright', 'energetic'], {
    genre: 'rock',
  }),

  // Ride cymbals
  createSample('ride-ping', 'Ping Ride', 'hh:5', 'hats', ['metallic', 'bright', 'clean'], {
    genre: 'jazz',
  }),
  createSample('ride-bell', 'Bell Ride', 'hh:6', 'hats', ['bright', 'metallic', 'energetic'], {
    genre: 'rock',
  }),

  // Special hats
  createSample('hat-glitchy', 'Glitchy Hat', 'hh:7', 'hats', ['glitchy', 'modern', 'wonky'], {
    genre: 'glitch',
  }),
  createSample('hat-filtered', 'Filtered Hat', 'hh:8', 'hats', ['dark', 'smooth', 'chill'], {
    genre: 'lo-fi',
  }),
  createSample('hat-acoustic', 'Acoustic Hat', 'hh:9', 'hats', ['organic', 'warm', 'woody'], {
    genre: 'acoustic',
  }),
  createSample('hat-electronic', 'Electronic Hat', 'hh:10', 'hats', ['synthetic', 'modern', 'sharp'], {
    genre: 'electro',
  }),
  createSample('hat-shuffled', 'Shuffled Hat', 'hh:11', 'hats', ['organic', 'wonky', 'warm'], {
    genre: 'house',
  }),
  createSample('hat-lo-fi', 'Lo-Fi Hat', 'hh:12', 'hats', ['lo-fi', 'vintage', 'soft'], {
    genre: 'lo-fi',
  }),
];

// ============================================================================
// PERCUSSION (15 samples)
// ============================================================================
const percussion: Sample[] = [
  // Toms
  createSample('tom-808-low', 'Low 808 Tom', 'tom:0', 'percussion', ['deep', 'warm', 'punchy'], {
    pack: 'TR-808',
  }),
  createSample('tom-808-mid', 'Mid 808 Tom', 'tom:1', 'percussion', ['warm', 'punchy', 'clean'], {
    pack: 'TR-808',
  }),
  createSample('tom-808-high', 'High 808 Tom', 'tom:2', 'percussion', ['bright', 'punchy', 'clean'], {
    pack: 'TR-808',
  }),
  createSample('tom-acoustic', 'Acoustic Tom', 'tom:3', 'percussion', ['organic', 'warm', 'woody'], {}),

  // Congas/Bongos
  createSample('conga-808', '808 Conga', 'perc:0', 'percussion', ['warm', 'organic', 'punchy'], {
    pack: 'TR-808',
  }),
  createSample('bongo-high', 'High Bongo', 'perc:1', 'percussion', ['bright', 'organic', 'sharp'], {}),
  createSample('bongo-low', 'Low Bongo', 'perc:2', 'percussion', ['warm', 'organic', 'deep'], {}),

  // Shakers/Tambourines
  createSample('shaker', 'Shaker', 'perc:3', 'percussion', ['organic', 'bright', 'minimal'], {}),
  createSample('tambourine', 'Tambourine', 'perc:4', 'percussion', ['bright', 'metallic', 'energetic'], {}),
  createSample('cabasa', 'Cabasa', 'perc:5', 'percussion', ['organic', 'soft', 'smooth'], {}),

  // Cowbell
  createSample('cowbell-808', '808 Cowbell', 'cb:0', 'percussion', ['metallic', 'bright', 'punchy'], {
    pack: 'TR-808',
    description: 'The famous 808 cowbell',
  }),
  createSample('cowbell-909', '909 Cowbell', 'cb:1', 'percussion', ['metallic', 'sharp', 'bright'], {
    pack: 'TR-909',
  }),

  // Other
  createSample('triangle', 'Triangle', 'perc:6', 'percussion', ['metallic', 'bright', 'minimal'], {}),
  createSample('woodblock', 'Woodblock', 'perc:7', 'percussion', ['woody', 'organic', 'sharp'], {}),
  createSample('clave', 'Clave', 'perc:8', 'percussion', ['woody', 'sharp', 'clean'], {}),
];

// ============================================================================
// BASS (12 samples)
// ============================================================================
const bass: Sample[] = [
  // 808 Bass
  createSample('bass-808-sub', '808 Sub Bass', 'bass:0', 'bass', ['deep', 'warm', 'clean'], {
    pack: 'TR-808',
    genre: 'trap',
    isOneShot: false,
    description: 'Classic 808 sub bass for trap and hip-hop',
    key: 'C',
  }),
  createSample('bass-808-distorted', 'Distorted 808 Bass', 'bass:1', 'bass', ['gritty', 'aggressive', 'deep'], {
    pack: 'TR-808',
    genre: 'trap',
    key: 'C',
  }),

  // Synth bass
  createSample('bass-reese', 'Reese Bass', 'bass:2', 'bass', ['dark', 'aggressive', 'gritty'], {
    genre: 'dnb',
    description: 'Classic Reese bass for DnB and dubstep',
    key: 'C',
  }),
  createSample('bass-square', 'Square Bass', 'bass:3', 'bass', ['punchy', 'synthetic', 'clean'], {
    genre: 'electro',
    key: 'C',
  }),
  createSample('bass-saw', 'Saw Bass', 'bass:4', 'bass', ['aggressive', 'bright', 'energetic'], {
    genre: 'house',
    key: 'C',
  }),
  createSample('bass-wobble', 'Wobble Bass', 'bass:5', 'bass', ['aggressive', 'wonky', 'dark'], {
    genre: 'dubstep',
    description: 'Wobble bass for dubstep drops',
    key: 'C',
  }),

  // Acoustic bass
  createSample('bass-upright', 'Upright Bass', 'bass:6', 'bass', ['organic', 'warm', 'vintage'], {
    genre: 'jazz',
    key: 'C',
  }),
  createSample('bass-electric', 'Electric Bass', 'bass:7', 'bass', ['warm', 'punchy', 'organic'], {
    genre: 'funk',
    key: 'C',
  }),

  // Special
  createSample('bass-acid', 'Acid Bass', 'bass:8', 'bass', ['aggressive', 'synthetic', 'sharp'], {
    genre: 'acid',
    description: 'TB-303 style acid bass',
    key: 'C',
  }),
  createSample('bass-deep', 'Deep Bass', 'bass:9', 'bass', ['deep', 'minimal', 'warm'], {
    genre: 'deep-house',
    key: 'C',
  }),
  createSample('bass-growl', 'Growl Bass', 'bass:10', 'bass', ['aggressive', 'gritty', 'dark'], {
    genre: 'dubstep',
    key: 'C',
  }),
  createSample('bass-pluck', 'Pluck Bass', 'bass:11', 'bass', ['punchy', 'bright', 'clean'], {
    genre: 'house',
    key: 'C',
  }),
];

// ============================================================================
// SYNTH (15 samples)
// ============================================================================
const synth: Sample[] = [
  // Pads
  createSample('synth-pad-warm', 'Warm Pad', 'pad:0', 'synth', ['warm', 'dreamy', 'atmospheric'], {
    genre: 'ambient',
    key: 'C',
    isLoop: true,
    duration: 4,
  }),
  createSample('synth-pad-dark', 'Dark Pad', 'pad:1', 'synth', ['dark', 'atmospheric', 'deep'], {
    genre: 'ambient',
    key: 'C',
    isLoop: true,
    duration: 4,
  }),
  createSample('synth-pad-bright', 'Bright Pad', 'pad:2', 'synth', ['bright', 'dreamy', 'clean'], {
    genre: 'trance',
    key: 'C',
    isLoop: true,
    duration: 4,
  }),

  // Leads
  createSample('synth-lead-saw', 'Saw Lead', 'lead:0', 'synth', ['bright', 'aggressive', 'energetic'], {
    genre: 'trance',
    key: 'C',
  }),
  createSample('synth-lead-square', 'Square Lead', 'lead:1', 'synth', ['punchy', 'synthetic', 'modern'], {
    genre: 'electro',
    key: 'C',
  }),
  createSample('synth-lead-acid', 'Acid Lead', 'lead:2', 'synth', ['aggressive', 'sharp', 'gritty'], {
    genre: 'acid',
    key: 'C',
    description: 'TB-303 style acid lead',
  }),

  // Stabs
  createSample('synth-stab-house', 'House Stab', 'stab:0', 'synth', ['punchy', 'bright', 'energetic'], {
    genre: 'house',
    key: 'C',
  }),
  createSample('synth-stab-chord', 'Chord Stab', 'stab:1', 'synth', ['warm', 'punchy', 'clean'], {
    genre: 'house',
    key: 'C',
  }),
  createSample('synth-stab-dark', 'Dark Stab', 'stab:2', 'synth', ['dark', 'aggressive', 'punchy'], {
    genre: 'techno',
    key: 'C',
  }),

  // Plucks
  createSample('synth-pluck-bright', 'Bright Pluck', 'pluck:0', 'synth', ['bright', 'clean', 'modern'], {
    genre: 'future-bass',
    key: 'C',
  }),
  createSample('synth-pluck-soft', 'Soft Pluck', 'pluck:1', 'synth', ['soft', 'warm', 'chill'], {
    genre: 'chillwave',
    key: 'C',
  }),

  // Keys
  createSample('synth-keys-rhodes', 'Rhodes Keys', 'keys:0', 'synth', ['warm', 'organic', 'vintage'], {
    genre: 'neo-soul',
    key: 'C',
  }),
  createSample('synth-keys-organ', 'Organ', 'keys:1', 'synth', ['warm', 'organic', 'deep'], {
    genre: 'gospel',
    key: 'C',
  }),

  // Arps
  createSample('synth-arp-trance', 'Trance Arp', 'arp:0', 'synth', ['bright', 'energetic', 'atmospheric'], {
    genre: 'trance',
    key: 'C',
    bpm: 138,
    isLoop: true,
  }),
  createSample('synth-arp-chill', 'Chill Arp', 'arp:1', 'synth', ['chill', 'dreamy', 'smooth'], {
    genre: 'chillwave',
    key: 'C',
    bpm: 100,
    isLoop: true,
  }),
];

// ============================================================================
// FX (12 samples)
// ============================================================================
const fx: Sample[] = [
  // Risers
  createSample('fx-riser-white', 'White Noise Riser', 'fx:0', 'fx', ['atmospheric', 'bright', 'energetic'], {
    genre: 'edm',
    duration: 4,
    description: 'Building tension before drops',
  }),
  createSample('fx-riser-sweep', 'Sweep Riser', 'fx:1', 'fx', ['atmospheric', 'smooth', 'energetic'], {
    genre: 'trance',
    duration: 4,
  }),
  createSample('fx-riser-dark', 'Dark Riser', 'fx:2', 'fx', ['dark', 'atmospheric', 'aggressive'], {
    genre: 'dubstep',
    duration: 4,
  }),

  // Impacts
  createSample('fx-impact-big', 'Big Impact', 'fx:3', 'fx', ['aggressive', 'punchy', 'deep'], {
    genre: 'edm',
    description: 'Heavy downbeat impact',
  }),
  createSample('fx-impact-sub', 'Sub Impact', 'fx:4', 'fx', ['deep', 'dark', 'punchy'], {
    genre: 'dubstep',
  }),
  createSample('fx-crash', 'Crash', 'fx:5', 'fx', ['bright', 'metallic', 'energetic'], {
    genre: 'edm',
  }),

  // Sweeps
  createSample('fx-sweep-down', 'Downward Sweep', 'fx:6', 'fx', ['smooth', 'atmospheric', 'dark'], {
    genre: 'techno',
  }),
  createSample('fx-sweep-up', 'Upward Sweep', 'fx:7', 'fx', ['smooth', 'atmospheric', 'bright'], {
    genre: 'house',
  }),

  // Atmosphere
  createSample('fx-atmos-dark', 'Dark Atmosphere', 'fx:8', 'fx', ['dark', 'atmospheric', 'deep'], {
    genre: 'ambient',
    isLoop: true,
    duration: 8,
  }),
  createSample('fx-atmos-space', 'Space Atmosphere', 'fx:9', 'fx', ['dreamy', 'atmospheric', 'cold'], {
    genre: 'ambient',
    isLoop: true,
    duration: 8,
  }),

  // Other
  createSample('fx-vinyl', 'Vinyl Crackle', 'fx:10', 'fx', ['lo-fi', 'vintage', 'organic'], {
    genre: 'lo-fi',
    isLoop: true,
  }),
  createSample('fx-glitch', 'Glitch FX', 'fx:11', 'fx', ['glitchy', 'wonky', 'modern'], {
    genre: 'glitch',
  }),
];

// ============================================================================
// VOCALS (10 samples)
// ============================================================================
const vocals: Sample[] = [
  createSample('vox-hey', 'Hey Vocal', 'vox:0', 'vocals', ['energetic', 'bright', 'punchy'], {
    genre: 'house',
  }),
  createSample('vox-yeah', 'Yeah Vocal', 'vox:1', 'vocals', ['energetic', 'warm', 'punchy'], {
    genre: 'house',
  }),
  createSample('vox-drop', 'Drop Vocal', 'vox:2', 'vocals', ['aggressive', 'dark', 'energetic'], {
    genre: 'dubstep',
  }),
  createSample('vox-breath', 'Breath Vocal', 'vox:3', 'vocals', ['soft', 'atmospheric', 'organic'], {
    genre: 'ambient',
  }),
  createSample('vox-chop', 'Chopped Vocal', 'vox:4', 'vocals', ['glitchy', 'modern', 'wonky'], {
    genre: 'future-bass',
  }),
  createSample('vox-ooh', 'Ooh Vocal', 'vox:5', 'vocals', ['dreamy', 'warm', 'smooth'], {
    genre: 'chillwave',
  }),
  createSample('vox-ahh', 'Ahh Vocal', 'vox:6', 'vocals', ['warm', 'atmospheric', 'soft'], {
    genre: 'ambient',
  }),
  createSample('vox-stutter', 'Stutter Vocal', 'vox:7', 'vocals', ['glitchy', 'modern', 'sharp'], {
    genre: 'glitch',
  }),
  createSample('vox-fx', 'FX Vocal', 'vox:8', 'vocals', ['synthetic', 'modern', 'cold'], {
    genre: 'electro',
  }),
  createSample('vox-whisper', 'Whisper Vocal', 'vox:9', 'vocals', ['soft', 'atmospheric', 'dark'], {
    genre: 'ambient',
  }),
];

// ============================================================================
// Build complete sample index
// ============================================================================
const allSamples: Sample[] = [
  ...kicks,
  ...snares,
  ...hats,
  ...percussion,
  ...bass,
  ...synth,
  ...fx,
  ...vocals,
];

// Build category map
const categories: Record<SampleCategory, string[]> = {
  kicks: kicks.map((s) => s.id),
  snares: snares.map((s) => s.id),
  hats: hats.map((s) => s.id),
  percussion: percussion.map((s) => s.id),
  bass: bass.map((s) => s.id),
  synth: synth.map((s) => s.id),
  fx: fx.map((s) => s.id),
  vocals: vocals.map((s) => s.id),
};

/**
 * Default sample library index with 120 samples
 */
export const DEFAULT_SAMPLE_INDEX: SampleLibraryIndex = {
  version: '1.0.0',
  samples: allSamples,
  categories,
  lastUpdated: new Date().toISOString(),
};

/**
 * Get the default sample index
 */
export function getDefaultSampleIndex(): SampleLibraryIndex {
  return DEFAULT_SAMPLE_INDEX;
}

/**
 * Get sample count by category
 */
export function getSampleCountByCategory(): Record<SampleCategory, number> {
  return {
    kicks: kicks.length,
    snares: snares.length,
    hats: hats.length,
    percussion: percussion.length,
    bass: bass.length,
    synth: synth.length,
    fx: fx.length,
    vocals: vocals.length,
  };
}
