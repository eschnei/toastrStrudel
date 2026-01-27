/**
 * VoiceRecorder Component
 *
 * Main component for recording voice snippets with effects.
 * Includes record button, waveform preview, effect selector, and instruction input.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { RecordButton } from './RecordButton'
import { WaveformPreview } from './WaveformPreview'
import { EffectSelector } from './EffectSelector'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import type { VoiceEffectType, VoiceSnippet } from '@/voice/types'
import styles from './VoiceRecorder.module.css'

export interface VoiceRecorderProps {
  /** Called when a snippet is added */
  onSnippetAdd?: (snippet: VoiceSnippet) => void
  /** Whether the recorder is disabled */
  disabled?: boolean
  /** Whether to show in compact mode */
  compact?: boolean
}

/**
 * Recording state machine
 */
type RecorderState = 'idle' | 'recording' | 'preview' | 'processing'

/**
 * VoiceRecorder - main recording component
 */
export function VoiceRecorder({
  onSnippetAdd,
  disabled = false,
  compact = false,
}: VoiceRecorderProps) {
  // Voice recorder hook
  const {
    isSupported,
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevel,
    lastRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    processAndRegister,
  } = useVoiceRecorder()

  // Local state
  const [state, setState] = useState<RecorderState>('idle')
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffectType>('raw')
  const [instruction, setInstruction] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Update state based on recording/processing status
  useEffect(() => {
    if (isRecording) {
      setState('recording')
    } else if (isProcessing) {
      setState('processing')
    } else if (lastRecording) {
      setState('preview')
    } else {
      setState('idle')
    }
  }, [isRecording, isProcessing, lastRecording])

  /**
   * Handle record start (mouse/touch down)
   */
  const handleRecordStart = useCallback(async () => {
    if (disabled) return
    setInstruction('')
    setSelectedEffect('raw')
    await startRecording()
  }, [disabled, startRecording])

  /**
   * Handle record end (mouse/touch up)
   */
  const handleRecordEnd = useCallback(async () => {
    await stopRecording()
  }, [stopRecording])

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    cancelRecording()
    stopPlayback()
    setState('idle')
  }, [cancelRecording])

  /**
   * Handle add snippet
   */
  const handleAddSnippet = useCallback(async () => {
    if (!lastRecording) return

    const snippet = await processAndRegister(selectedEffect, instruction)
    if (snippet && onSnippetAdd) {
      onSnippetAdd(snippet)
    }

    // Reset state
    setInstruction('')
    setSelectedEffect('raw')
    setState('idle')
  }, [lastRecording, selectedEffect, instruction, processAndRegister, onSnippetAdd])

  /**
   * Handle play/stop preview
   */
  const handlePlayToggle = useCallback(() => {
    if (!lastRecording) return

    if (isPlaying) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }, [lastRecording, isPlaying])

  /**
   * Start playback
   */
  const startPlayback = useCallback(() => {
    if (!lastRecording) return

    // Create audio element
    const audio = new Audio(URL.createObjectURL(lastRecording.blob))
    audioRef.current = audio

    audio.onended = () => {
      stopPlayback()
    }

    audio.play()
    setIsPlaying(true)
    setPlaybackPosition(0)

    // Update playback position
    playbackIntervalRef.current = setInterval(() => {
      if (audio.duration) {
        setPlaybackPosition(audio.currentTime / audio.duration)
      }
    }, 50)
  }, [lastRecording])

  /**
   * Stop playback
   */
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
    setIsPlaying(false)
    setPlaybackPosition(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [stopPlayback])

  // Not supported
  if (!isSupported) {
    return (
      <div className={`${styles.container} ${styles.unsupported}`}>
        <div className={styles.unsupportedMessage}>
          Voice recording not supported in this browser
        </div>
      </div>
    )
  }

  // Idle state - just show record button
  if (state === 'idle') {
    return (
      <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
        <RecordButton
          isRecording={false}
          duration={0}
          audioLevel={0}
          isSupported={true}
          disabled={disabled}
          onRecordStart={handleRecordStart}
          onRecordEnd={handleRecordEnd}
        />
      </div>
    )
  }

  // Recording state
  if (state === 'recording') {
    return (
      <div className={`${styles.container} ${styles.recording} ${compact ? styles.compact : ''}`}>
        <RecordButton
          isRecording={true}
          duration={recordingDuration}
          audioLevel={audioLevel}
          isSupported={true}
          disabled={disabled}
          onRecordStart={handleRecordStart}
          onRecordEnd={handleRecordEnd}
        />
      </div>
    )
  }

  // Preview/Processing state
  return (
    <div className={`${styles.container} ${styles.preview} ${compact ? styles.compact : ''}`}>
      {/* Waveform preview */}
      {lastRecording && (
        <WaveformPreview
          waveformData={lastRecording.waveformData}
          duration={lastRecording.duration}
          isPlaying={isPlaying}
          playbackPosition={playbackPosition}
          onPlay={handlePlayToggle}
        />
      )}

      {/* Effect selector */}
      <EffectSelector
        selectedEffect={selectedEffect}
        disabled={state === 'processing'}
        isProcessing={state === 'processing'}
        onSelectEffect={setSelectedEffect}
      />

      {/* Instruction input */}
      <div className={styles.instructionRow}>
        <input
          type="text"
          className={styles.instructionInput}
          placeholder="how should I use this?"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={state === 'processing'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAddSnippet()
            }
          }}
        />

        <button
          className={styles.addButton}
          onClick={handleAddSnippet}
          disabled={state === 'processing'}
        >
          {state === 'processing' ? 'Adding...' : 'ADD'}
        </button>
      </div>

      {/* Cancel button */}
      <button
        className={styles.cancelButton}
        onClick={handleCancel}
        disabled={state === 'processing'}
      >
        Cancel
      </button>
    </div>
  )
}

export default VoiceRecorder
