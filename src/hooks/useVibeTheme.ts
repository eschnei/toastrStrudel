/**
 * useVibeTheme Hook
 *
 * Dynamic color theming based on current vibe.
 * Detects vibe from pattern/prompt and applies smooth color transitions.
 *
 * @references Section 7.7 Color System
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useStore } from '@/store'

/** Available vibe types */
export type VibeType =
  | 'neutral'
  | 'dark'
  | 'bright'
  | 'dreamy'
  | 'aggressive'
  | 'chill'

/** Color scheme for a vibe */
export interface VibeColors {
  /** Primary background color */
  bgPrimary: string
  /** Secondary background color */
  bgSecondary: string
  /** Tertiary background color */
  bgTertiary: string
  /** Accent color */
  accent: string
  /** Accent hover color */
  accentHover: string
  /** Accent glow color */
  accentGlow: string
  /** Text primary color */
  textPrimary: string
  /** Text secondary color */
  textSecondary: string
}

/** Vibe color schemes as specified in Section 7.7 */
const VIBE_SCHEMES: Record<VibeType, VibeColors> = {
  neutral: {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgTertiary: '#1a1a24',
    accent: '#6366f1',
    accentHover: '#818cf8',
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0b0',
  },
  dark: {
    // Deep purple, red accent, near black bg
    bgPrimary: '#050508',
    bgSecondary: '#0c0810',
    bgTertiary: '#140f18',
    accent: '#dc2626',
    accentHover: '#ef4444',
    accentGlow: 'rgba(220, 38, 38, 0.3)',
    textPrimary: '#f0e8f0',
    textSecondary: '#9080a0',
  },
  bright: {
    // Cyan, yellow accent, dark blue bg
    bgPrimary: '#040810',
    bgSecondary: '#081018',
    bgTertiary: '#0c1820',
    accent: '#06b6d4',
    accentHover: '#22d3ee',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    textPrimary: '#f0f8ff',
    textSecondary: '#80b0c0',
  },
  dreamy: {
    // Lavender, pink accent, deep indigo bg
    bgPrimary: '#080610',
    bgSecondary: '#100c18',
    bgTertiary: '#181420',
    accent: '#c084fc',
    accentHover: '#d8b4fe',
    accentGlow: 'rgba(192, 132, 252, 0.3)',
    textPrimary: '#f8f0ff',
    textSecondary: '#b0a0c0',
  },
  aggressive: {
    // Red, orange accent, black bg
    bgPrimary: '#050000',
    bgSecondary: '#0a0505',
    bgTertiary: '#100808',
    accent: '#ef4444',
    accentHover: '#f97316',
    accentGlow: 'rgba(239, 68, 68, 0.4)',
    textPrimary: '#fff0f0',
    textSecondary: '#c0a0a0',
  },
  chill: {
    // Teal, soft green accent, dark gray bg
    bgPrimary: '#050808',
    bgSecondary: '#0a1010',
    bgTertiary: '#101818',
    accent: '#14b8a6',
    accentHover: '#2dd4bf',
    accentGlow: 'rgba(20, 184, 166, 0.3)',
    textPrimary: '#f0fff8',
    textSecondary: '#80b0a0',
  },
}

/** Keywords that indicate different vibes */
const VIBE_KEYWORDS: Record<VibeType, string[]> = {
  dark: ['dark', 'moody', 'gloomy', 'noir', 'shadow', 'deep', 'menacing', 'sinister', 'brooding'],
  bright: ['bright', 'happy', 'joyful', 'uplifting', 'sunny', 'cheerful', 'light', 'positive', 'euphoric'],
  dreamy: ['dreamy', 'spacey', 'ethereal', 'floating', 'ambient', 'atmospheric', 'cosmic', 'celestial', 'mystic'],
  aggressive: ['aggressive', 'heavy', 'hard', 'intense', 'angry', 'powerful', 'brutal', 'distorted', 'harsh'],
  chill: ['chill', 'relax', 'calm', 'mellow', 'lounge', 'smooth', 'easy', 'laid back', 'peaceful'],
  neutral: [],
}

/**
 * Detect vibe from text (prompt or pattern context)
 */
export function detectVibe(text: string): VibeType {
  const lowered = text.toLowerCase()

  // Check each vibe's keywords
  for (const [vibe, keywords] of Object.entries(VIBE_KEYWORDS)) {
    if (vibe === 'neutral') continue

    for (const keyword of keywords) {
      if (lowered.includes(keyword)) {
        return vibe as VibeType
      }
    }
  }

  return 'neutral'
}

/**
 * Apply vibe colors to CSS custom properties
 */
function applyVibeColors(colors: VibeColors, transitionMs: number = 800): void {
  const root = document.documentElement

  // Set transition for smooth color changes
  root.style.setProperty('--vibe-transition', `${transitionMs}ms ease`)

  // Apply color variables
  root.style.setProperty('--vibe-bg-primary', colors.bgPrimary)
  root.style.setProperty('--vibe-bg-secondary', colors.bgSecondary)
  root.style.setProperty('--vibe-bg-tertiary', colors.bgTertiary)
  root.style.setProperty('--vibe-accent', colors.accent)
  root.style.setProperty('--vibe-accent-hover', colors.accentHover)
  root.style.setProperty('--vibe-accent-glow', colors.accentGlow)
  root.style.setProperty('--vibe-text-primary', colors.textPrimary)
  root.style.setProperty('--vibe-text-secondary', colors.textSecondary)
}

export interface UseVibeThemeResult {
  /** Current vibe */
  currentVibe: VibeType
  /** Current color scheme */
  colors: VibeColors
  /** Manually set vibe */
  setVibe: (vibe: VibeType) => void
  /** Detect vibe from text */
  detectAndSetVibe: (text: string) => VibeType
  /** Available vibes */
  availableVibes: VibeType[]
}

/**
 * Hook for vibe-based dynamic theming
 */
export function useVibeTheme(
  autoDetect: boolean = true,
  transitionMs: number = 800
): UseVibeThemeResult {
  const [currentVibe, setCurrentVibe] = useState<VibeType>('neutral')

  // Get current prompt from store for auto-detection
  const currentPrompt = useStore(state => state.currentPrompt)
  const conversationHistory = useStore(state => state.conversationHistory)

  // Current colors based on vibe
  const colors = useMemo(() => VIBE_SCHEMES[currentVibe], [currentVibe])

  // Available vibes
  const availableVibes = useMemo<VibeType[]>(
    () => ['neutral', 'dark', 'bright', 'dreamy', 'aggressive', 'chill'],
    []
  )

  // Apply colors when vibe changes
  useEffect(() => {
    applyVibeColors(colors, transitionMs)
  }, [colors, transitionMs])

  // Auto-detect vibe from recent prompts
  useEffect(() => {
    if (!autoDetect) return

    // Check current prompt first
    if (currentPrompt) {
      const detected = detectVibe(currentPrompt)
      if (detected !== 'neutral') {
        setCurrentVibe(detected)
        return
      }
    }

    // Check recent conversation history
    const recentPrompts = conversationHistory
      .filter(entry => entry.role === 'user')
      .slice(-3)
      .map(entry => entry.content)
      .join(' ')

    if (recentPrompts) {
      const detected = detectVibe(recentPrompts)
      setCurrentVibe(detected)
    }
  }, [autoDetect, currentPrompt, conversationHistory])

  // Manually set vibe
  const setVibe = useCallback((vibe: VibeType) => {
    setCurrentVibe(vibe)
  }, [])

  // Detect and set vibe from text
  const detectAndSetVibe = useCallback((text: string): VibeType => {
    const detected = detectVibe(text)
    setCurrentVibe(detected)
    return detected
  }, [])

  return {
    currentVibe,
    colors,
    setVibe,
    detectAndSetVibe,
    availableVibes,
  }
}

/**
 * Vibe selector component props helper
 */
export function getVibeDisplayInfo(vibe: VibeType): {
  label: string
  description: string
  previewColors: { bg: string; accent: string }
} {
  const scheme = VIBE_SCHEMES[vibe]

  const labels: Record<VibeType, { label: string; description: string }> = {
    neutral: { label: 'Neutral', description: 'Default balanced theme' },
    dark: { label: 'Dark', description: 'Deep purple with red accent' },
    bright: { label: 'Bright', description: 'Cyan with yellow accent' },
    dreamy: { label: 'Dreamy', description: 'Lavender with pink accent' },
    aggressive: { label: 'Aggressive', description: 'Red with orange accent' },
    chill: { label: 'Chill', description: 'Teal with soft green accent' },
  }

  return {
    ...labels[vibe],
    previewColors: {
      bg: scheme.bgPrimary,
      accent: scheme.accent,
    },
  }
}
