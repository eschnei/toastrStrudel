/**
 * CodeDisplay Visualizer Component
 *
 * Displays the current Strudel pattern code as a "visualizer" mode.
 * Shows the live code with subtle animations to feel alive.
 *
 * @references UI-002, Section 7.6 Visualizer Options
 */

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store'
import styles from './CodeDisplay.module.css'

export interface CodeDisplayProps {
  /** Web Audio AnalyserNode for audio-reactive effects */
  analyserNode: AnalyserNode | null
  /** Whether the visualizer is active (playing) */
  isActive?: boolean
  /** Font size in pixels */
  fontSize?: number
  /** Whether to show line numbers */
  showLineNumbers?: boolean
}

/**
 * Simple syntax highlighting for Strudel code
 */
function highlightCode(code: string): string {
  if (!code) return ''

  // Escape HTML first
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Strudel functions (highlighted in accent color)
  const functions = [
    'stack', 'sequence', 's', 'sound', 'note', 'n', 'freq',
    'gain', 'room', 'delay', 'lpf', 'hpf', 'bpf', 'resonance',
    'attack', 'decay', 'sustain', 'release', 'pan', 'speed',
    'slow', 'fast', 'every', 'rev', 'jux', 'chunk', 'swing',
    'late', 'early', 'distort', 'crush', 'shape', 'vowel',
    'cut', 'orbit', 'begin', 'end', 'loop', 'legato',
    'scale', 'struct', 'mask', 'euclid', 'palindrome',
    'ply', 'striate', 'chop', 'slice', 'splice',
    'sine', 'saw', 'square', 'tri', 'rand', 'range',
  ]

  // Highlight functions
  functions.forEach(fn => {
    const regex = new RegExp(`\\b(${fn})(?=\\s*\\()`, 'g')
    highlighted = highlighted.replace(regex, `<span class="${styles.function}">$1</span>`)
  })

  // Highlight strings (samples, notes)
  highlighted = highlighted.replace(
    /(&quot;|"|')([^"']+)(&quot;|"|')/g,
    `<span class="${styles.string}">$1$2$3</span>`
  )

  // Highlight numbers
  highlighted = highlighted.replace(
    /\b(\d+\.?\d*)\b/g,
    `<span class="${styles.number}">$1</span>`
  )

  // Highlight operators
  highlighted = highlighted.replace(
    /(\*|\/|\+|-|~|\|)/g,
    `<span class="${styles.operator}">$1</span>`
  )

  return highlighted
}

/**
 * CodeDisplay visualizer - shows live Strudel code
 */
export function CodeDisplay({
  analyserNode,
  isActive = false,
  fontSize = 14,
  showLineNumbers = true,
}: CodeDisplayProps) {
  const currentPattern = useStore(state => state.currentPattern)
  const [glowIntensity, setGlowIntensity] = useState(0.3)
  const animationRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  // Audio-reactive glow effect
  useEffect(() => {
    if (!analyserNode || !isActive) {
      setGlowIntensity(0.3)
      return
    }

    // Initialize data array
    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount)
    }

    const animate = () => {
      if (!analyserNode || !dataArrayRef.current) return

      analyserNode.getByteFrequencyData(dataArrayRef.current)

      // Calculate average volume
      let sum = 0
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i]
      }
      const average = sum / dataArrayRef.current.length / 255

      // Map to glow intensity (0.3 to 0.8)
      setGlowIntensity(0.3 + average * 0.5)

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [analyserNode, isActive])

  // Format code with line numbers
  const formatCode = () => {
    if (!currentPattern) {
      return {
        lines: ['// No pattern yet', '// Type a prompt to generate music'],
        highlighted: ['<span class="comment">// No pattern yet</span>', '<span class="comment">// Type a prompt to generate music</span>'],
      }
    }

    const lines = currentPattern.split('\n')
    const highlighted = lines.map(line => highlightCode(line))

    return { lines, highlighted }
  }

  const { lines, highlighted } = formatCode()

  return (
    <div className={styles.container}>
      <div
        className={`${styles.codeWrapper} ${isActive ? styles.active : ''}`}
        style={{
          '--glow-intensity': glowIntensity,
          '--font-size': `${fontSize}px`,
        } as React.CSSProperties}
      >
        <pre className={styles.code}>
          {highlighted.map((line, index) => (
            <div key={index} className={styles.line}>
              {showLineNumbers && (
                <span className={styles.lineNumber}>{index + 1}</span>
              )}
              <span
                className={styles.lineContent}
                dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
              />
            </div>
          ))}
        </pre>
      </div>

      {/* Subtle scan line effect */}
      {isActive && <div className={styles.scanLine} />}
    </div>
  )
}
