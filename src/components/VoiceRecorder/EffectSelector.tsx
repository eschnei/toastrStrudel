/**
 * EffectSelector Component
 *
 * Buttons for selecting voice processing effects.
 * Shows 5 effects: raw, tune, chop, vocode, stretch.
 */

import { useCallback } from 'react'
import type { VoiceEffectType } from '@/voice/types'
import styles from './VoiceRecorder.module.css'

export interface EffectSelectorProps {
  /** Currently selected effect */
  selectedEffect: VoiceEffectType
  /** Whether effects are disabled */
  disabled?: boolean
  /** Whether currently processing */
  isProcessing?: boolean
  /** Called when effect is selected */
  onSelectEffect: (effect: VoiceEffectType) => void
}

/**
 * Effect info with label and description
 */
interface EffectInfo {
  type: VoiceEffectType
  label: string
  description: string
  icon: string
}

const EFFECTS: EffectInfo[] = [
  {
    type: 'raw',
    label: 'raw',
    description: 'Original recording',
    icon: '~',
  },
  {
    type: 'tune',
    label: 'tune',
    description: 'Pitch to nearest note',
    icon: '♪',
  },
  {
    type: 'chop',
    label: 'chop',
    description: 'Slice into 8 parts',
    icon: '⊞',
  },
  {
    type: 'vocode',
    label: 'vocode',
    description: 'Robot voice effect',
    icon: '◈',
  },
  {
    type: 'stretch',
    label: 'stretch',
    description: 'Time stretch 2x',
    icon: '↔',
  },
]

/**
 * EffectSelector - choose processing effect
 */
export function EffectSelector({
  selectedEffect,
  disabled = false,
  isProcessing = false,
  onSelectEffect,
}: EffectSelectorProps) {
  const handleClick = useCallback(
    (effect: VoiceEffectType) => {
      if (disabled || isProcessing) return
      onSelectEffect(effect)
    },
    [disabled, isProcessing, onSelectEffect]
  )

  return (
    <div className={styles.effectSelector}>
      {EFFECTS.map((effect) => (
        <button
          key={effect.type}
          className={`
            ${styles.effectButton}
            ${selectedEffect === effect.type ? styles.selected : ''}
            ${disabled || isProcessing ? styles.disabled : ''}
          `}
          onClick={() => handleClick(effect.type)}
          disabled={disabled || isProcessing}
          title={effect.description}
        >
          <span className={styles.effectIcon}>{effect.icon}</span>
          <span className={styles.effectLabel}>{effect.label}</span>
        </button>
      ))}

      {isProcessing && (
        <div className={styles.processingIndicator}>
          <span className={styles.spinner} />
        </div>
      )}
    </div>
  )
}

/**
 * Compact effect selector for snippet cards
 */
export function CompactEffectSelector({
  selectedEffect,
  disabled = false,
  onSelectEffect,
}: Omit<EffectSelectorProps, 'isProcessing'>) {
  return (
    <div className={styles.compactEffectSelector}>
      {EFFECTS.map((effect) => (
        <button
          key={effect.type}
          className={`
            ${styles.compactEffectButton}
            ${selectedEffect === effect.type ? styles.selected : ''}
            ${disabled ? styles.disabled : ''}
          `}
          onClick={() => !disabled && onSelectEffect(effect.type)}
          disabled={disabled}
          title={`${effect.label}: ${effect.description}`}
        >
          {effect.icon}
        </button>
      ))}
    </div>
  )
}
