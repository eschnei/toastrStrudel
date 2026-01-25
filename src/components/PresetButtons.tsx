/**
 * PresetButtons Component
 *
 * User-configurable quick action presets.
 * Provides 4-6 customizable slots saved to localStorage.
 *
 * @references Phase 6 Deliverables
 */

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import styles from './PresetButtons.module.css'

/** Preset configuration */
export interface Preset {
  id: string
  label: string
  prompt: string
  color?: string
}

export interface PresetButtonsProps {
  /** Handler for preset action */
  onAction: (prompt: string) => void
  /** Whether actions are disabled */
  disabled?: boolean
  /** Number of preset slots */
  slotCount?: number
  /** Storage key for localStorage */
  storageKey?: string
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Layout orientation */
  layout?: 'horizontal' | 'vertical' | 'grid'
}

/** Default presets */
const DEFAULT_PRESETS: Preset[] = [
  { id: 'preset-1', label: 'CHILL', prompt: 'make it chill and relaxed' },
  { id: 'preset-2', label: 'DARK', prompt: 'darker and moodier' },
  { id: 'preset-3', label: 'ENERGY', prompt: 'more energy, more intensity' },
  { id: 'preset-4', label: 'WEIRD', prompt: 'make it weirder and experimental' },
  { id: 'preset-5', label: 'GROOVE', prompt: 'stronger groove, more rhythm' },
  { id: 'preset-6', label: 'SPACE', prompt: 'more spacey and atmospheric' },
]

/** Color palette for presets */
const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
]

/**
 * Load presets from localStorage
 */
function loadPresets(storageKey: string, slotCount: number): Preset[] {
  if (typeof window === 'undefined') {
    return DEFAULT_PRESETS.slice(0, slotCount)
  }

  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure we have the right number of slots
        return parsed.slice(0, slotCount).map((p: Partial<Preset>, i: number) => ({
          id: p.id || `preset-${i + 1}`,
          label: p.label || `SLOT ${i + 1}`,
          prompt: p.prompt || '',
          color: p.color || PRESET_COLORS[i % PRESET_COLORS.length],
        }))
      }
    }
  } catch {
    console.warn('[PresetButtons] Failed to load presets from localStorage')
  }

  return DEFAULT_PRESETS.slice(0, slotCount).map((p, i) => ({
    ...p,
    color: PRESET_COLORS[i % PRESET_COLORS.length],
  }))
}

/**
 * Save presets to localStorage
 */
function savePresets(storageKey: string, presets: Preset[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(storageKey, JSON.stringify(presets))
  } catch {
    console.warn('[PresetButtons] Failed to save presets to localStorage')
  }
}

/**
 * Individual preset button
 */
function PresetButton({
  preset,
  onAction,
  onEdit,
  disabled,
  size,
  isEditing,
}: {
  preset: Preset
  onAction: (prompt: string) => void
  onEdit: (preset: Preset) => void
  disabled?: boolean
  size: 'small' | 'medium' | 'large'
  isEditing: boolean
}) {
  const [isPressing, setIsPressing] = useState(false)

  const handleClick = useCallback(() => {
    if (isEditing) {
      onEdit(preset)
    } else if (!disabled && preset.prompt) {
      onAction(preset.prompt)
    }
  }, [preset, onAction, onEdit, disabled, isEditing])

  const isEmpty = !preset.prompt

  return (
    <button
      className={`
        ${styles.presetButton}
        ${styles[size]}
        ${isPressing ? styles.pressing : ''}
        ${isEmpty ? styles.empty : ''}
        ${isEditing ? styles.editMode : ''}
      `}
      onClick={handleClick}
      onPointerDown={() => setIsPressing(true)}
      onPointerUp={() => setIsPressing(false)}
      onPointerLeave={() => setIsPressing(false)}
      disabled={disabled && !isEditing}
      title={isEmpty ? 'Click to set preset' : preset.prompt}
      style={{
        '--preset-color': preset.color || 'var(--color-accent)',
      } as React.CSSProperties}
    >
      <span className={styles.label}>
        {isEmpty ? '+' : preset.label}
      </span>
    </button>
  )
}

/**
 * Preset edit modal
 */
function PresetEditModal({
  preset,
  onSave,
  onCancel,
  colorOptions,
}: {
  preset: Preset
  onSave: (preset: Preset) => void
  onCancel: () => void
  colorOptions: string[]
}) {
  const [label, setLabel] = useState(preset.label)
  const [prompt, setPrompt] = useState(preset.prompt)
  const [color, setColor] = useState(preset.color || colorOptions[0])

  const handleSave = useCallback(() => {
    onSave({
      ...preset,
      label: label.trim() || 'PRESET',
      prompt: prompt.trim(),
      color,
    })
  }, [preset, label, prompt, color, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }, [handleSave, onCancel])

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h3 className={styles.modalTitle}>Edit Preset</h3>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Label</label>
          <input
            type="text"
            className={styles.input}
            value={label}
            onChange={e => setLabel(e.target.value)}
            maxLength={10}
            placeholder="LABEL"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Prompt</label>
          <textarea
            className={styles.textarea}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            placeholder="Enter the prompt to send..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Color</label>
          <div className={styles.colorPicker}>
            {colorOptions.map(c => (
              <button
                key={c}
                className={`${styles.colorOption} ${color === c ? styles.selected : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * PresetButtons - customizable quick action presets
 */
export function PresetButtons({
  onAction,
  disabled = false,
  slotCount = 6,
  storageKey = 'vibe-conductor-presets',
  size = 'medium',
  layout = 'horizontal',
}: PresetButtonsProps) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)

  const isPlaying = useStore(state => state.isPlaying)
  const playbackStatus = useStore(state => state.playbackStatus)
  const isGenerating = playbackStatus === 'generating'
  const isDisabled = disabled || isGenerating

  // Load presets from localStorage on mount
  useEffect(() => {
    setPresets(loadPresets(storageKey, slotCount))
  }, [storageKey, slotCount])

  // Handle preset edit
  const handleEdit = useCallback((preset: Preset) => {
    setEditingPreset(preset)
  }, [])

  // Handle preset save
  const handleSave = useCallback((updatedPreset: Preset) => {
    setPresets(current => {
      const newPresets = current.map(p =>
        p.id === updatedPreset.id ? updatedPreset : p
      )
      savePresets(storageKey, newPresets)
      return newPresets
    })
    setEditingPreset(null)
  }, [storageKey])

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode(current => !current)
  }, [])

  return (
    <div className={styles.container}>
      {/* Edit mode toggle */}
      <button
        className={`${styles.editToggle} ${isEditMode ? styles.active : ''}`}
        onClick={toggleEditMode}
        title={isEditMode ? 'Done editing' : 'Edit presets'}
      >
        {isEditMode ? 'Done' : 'Edit'}
      </button>

      {/* Preset buttons */}
      <div className={`${styles.presets} ${styles[layout]}`}>
        {presets.map(preset => (
          <PresetButton
            key={preset.id}
            preset={preset}
            onAction={onAction}
            onEdit={handleEdit}
            disabled={isDisabled || !isPlaying}
            size={size}
            isEditing={isEditMode}
          />
        ))}
      </div>

      {/* Edit modal */}
      {editingPreset && (
        <PresetEditModal
          preset={editingPreset}
          onSave={handleSave}
          onCancel={() => setEditingPreset(null)}
          colorOptions={PRESET_COLORS}
        />
      )}
    </div>
  )
}

/**
 * Compact preset bar for inline use
 */
export function CompactPresetBar({
  onAction,
  disabled = false,
}: {
  onAction: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <PresetButtons
      onAction={onAction}
      disabled={disabled}
      slotCount={4}
      size="small"
      layout="horizontal"
    />
  )
}
