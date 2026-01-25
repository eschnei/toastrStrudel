/**
 * VoiceInput Component
 *
 * Voice input via browser Speech Recognition API.
 * Provides visual feedback during listening and graceful fallback.
 *
 * @references Phase 6 Deliverables (stretch goal)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import styles from './VoiceInput.module.css'

export interface VoiceInputProps {
  /** Callback when transcription is complete */
  onTranscript: (text: string) => void
  /** Whether input is disabled */
  disabled?: boolean
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Show label */
  showLabel?: boolean
  /** Language code */
  language?: string
}

/** Check if Speech Recognition is available */
function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

/** Get Speech Recognition constructor */
function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null

  const SpeechRecognitionConstructor =
    (window as Window & typeof globalThis & { webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
    (window as Window & typeof globalThis & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

  return SpeechRecognitionConstructor || null
}

/**
 * VoiceInput - speech recognition input
 */
export function VoiceInput({
  onTranscript,
  disabled = false,
  size = 'medium',
  showLabel = true,
  language = 'en-US',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [pulseLevel, setPulseLevel] = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const pulseIntervalRef = useRef<number | null>(null)

  // Check support on mount
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current)
      }
    }
  }, [])

  /**
   * Start listening
   */
  const startListening = useCallback(() => {
    if (!isSupported || disabled) return

    const SpeechRecognitionConstructor = getSpeechRecognition()
    if (!SpeechRecognitionConstructor) {
      setError('Speech recognition not available')
      return
    }

    setError(null)
    setInterimTranscript('')

    try {
      const recognition = new SpeechRecognitionConstructor()
      recognitionRef.current = recognition

      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = language

      recognition.onstart = () => {
        setIsListening(true)

        // Simulate audio level animation
        pulseIntervalRef.current = window.setInterval(() => {
          setPulseLevel(Math.random())
        }, 100)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript

          if (event.results[i].isFinal) {
            final += transcript
          } else {
            interim += transcript
          }
        }

        setInterimTranscript(interim)

        if (final) {
          onTranscript(final.trim())
          stopListening()
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[VoiceInput] Error:', event.error)

        switch (event.error) {
          case 'not-allowed':
            setError('Microphone access denied')
            break
          case 'no-speech':
            setError('No speech detected')
            break
          case 'network':
            setError('Network error')
            break
          default:
            setError(`Error: ${event.error}`)
        }

        stopListening()
      }

      recognition.onend = () => {
        stopListening()
      }

      recognition.start()
    } catch (err) {
      console.error('[VoiceInput] Failed to start:', err)
      setError('Failed to start voice input')
      setIsListening(false)
    }
  }, [isSupported, disabled, language, onTranscript])

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null
    }

    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current)
      pulseIntervalRef.current = null
    }

    setIsListening(false)
    setPulseLevel(0)
    setInterimTranscript('')
  }, [])

  /**
   * Toggle listening
   */
  const handleClick = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Not supported fallback
  if (!isSupported) {
    return (
      <div className={`${styles.container} ${styles.unsupported}`}>
        <button
          className={`${styles.button} ${styles[size]} ${styles.disabled}`}
          disabled
          title="Voice input not supported in this browser"
        >
          <svg viewBox="0 0 24 24" className={styles.icon}>
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        {showLabel && <span className={styles.label}>Not supported</span>}
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${isListening ? styles.listening : ''}`}>
      <button
        className={`
          ${styles.button}
          ${styles[size]}
          ${isListening ? styles.active : ''}
          ${disabled ? styles.disabled : ''}
        `}
        onClick={handleClick}
        disabled={disabled}
        title={isListening ? 'Click to stop' : 'Click to speak'}
        style={{
          '--pulse-level': pulseLevel,
        } as React.CSSProperties}
      >
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <span className={styles.pulseRing} style={{ animationDelay: '0ms' }} />
            <span className={styles.pulseRing} style={{ animationDelay: '300ms' }} />
          </>
        )}

        <svg viewBox="0 0 24 24" className={styles.icon}>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      </button>

      {/* Label / status */}
      {showLabel && (
        <span className={styles.label}>
          {isListening ? 'Listening...' : error || 'Voice'}
        </span>
      )}

      {/* Interim transcript preview */}
      {isListening && interimTranscript && (
        <div className={styles.transcript}>
          {interimTranscript}
        </div>
      )}
    </div>
  )
}

/**
 * Compact voice button for inline use
 */
export function VoiceButton({
  onTranscript,
  disabled = false,
}: {
  onTranscript: (text: string) => void
  disabled?: boolean
}) {
  return (
    <VoiceInput
      onTranscript={onTranscript}
      disabled={disabled}
      size="small"
      showLabel={false}
    />
  )
}

/**
 * Hook to check voice input support
 */
export function useVoiceInputSupport(): boolean {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported())
  }, [])

  return supported
}
