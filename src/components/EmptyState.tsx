/**
 * EmptyState Component
 *
 * Welcoming first-time user experience.
 * Shows title, tagline, and example prompts.
 */

import styles from './EmptyState.module.css'

interface EmptyStateProps {
  onExampleClick?: (prompt: string) => void
}

const EXAMPLE_PROMPTS = [
  'chill and spacey, like floating in water',
  'dark warehouse techno vibes',
  'upbeat and happy, summer energy',
  'mysterious and atmospheric',
]

export function EmptyState({ onExampleClick }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>VIBE CONDUCTOR</h1>
      <p className={styles.tagline}>describe music with words, no skills required</p>

      <div className={styles.examples}>
        <p className={styles.tryLabel}>try:</p>
        <div className={styles.exampleList}>
          {EXAMPLE_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              className={styles.exampleButton}
              onClick={() => onExampleClick?.(prompt)}
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
