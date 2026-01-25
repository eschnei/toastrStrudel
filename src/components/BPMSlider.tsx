/**
 * BPMSlider Component
 *
 * Slider control for adjusting BPM (60-180 range, default 128).
 * Shows current value while dragging.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useStrudel } from '@/hooks'
import styles from './BPMSlider.module.css'

interface BPMSliderProps {
  onClose?: () => void
}

export function BPMSlider({ onClose }: BPMSliderProps) {
  const { currentBPM, setBPM } = useStrudel()
  const sliderRef = useRef<HTMLDivElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      setBPM(value)
    },
    [setBPM]
  )

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div ref={sliderRef} className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Tempo</span>
        <span className={styles.value}>{currentBPM}</span>
      </div>

      <div className={styles.sliderWrapper}>
        <input
          type="range"
          min={60}
          max={180}
          value={currentBPM}
          onChange={handleChange}
          className={styles.slider}
        />
        <div className={styles.marks}>
          <span>60</span>
          <span>120</span>
          <span>180</span>
        </div>
      </div>

      <div className={styles.presets}>
        <button
          className={styles.preset}
          onClick={() => setBPM(80)}
          title="Slow"
        >
          80
        </button>
        <button
          className={styles.preset}
          onClick={() => setBPM(100)}
          title="Moderate"
        >
          100
        </button>
        <button
          className={styles.preset}
          onClick={() => setBPM(128)}
          title="House"
        >
          128
        </button>
        <button
          className={styles.preset}
          onClick={() => setBPM(140)}
          title="Fast"
        >
          140
        </button>
        <button
          className={styles.preset}
          onClick={() => setBPM(174)}
          title="Very fast"
        >
          174
        </button>
      </div>
    </div>
  )
}
