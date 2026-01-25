/**
 * MobileLayout Component
 *
 * Mobile-optimized layout for portrait orientation.
 * Provides compact prompt history, touch-friendly sizing, and grid quick actions.
 *
 * @references Phase 6 Deliverables
 */

import { useState, useCallback } from 'react'
import { useStore } from '@/store'
import { Visualizer } from './Visualizer'
import { PromptInput } from './PromptInput'
import { PlayButton } from './PlayButton'
import { EmergencyStop } from './EmergencyStop'
import { BeatIndicator } from './BeatIndicator'
import { EnergyMeter } from './EnergyMeter'
import { SectionIndicator } from './SectionIndicator'
import { ArrangementActions } from './ArrangementActions'
import styles from './MobileLayout.module.css'

export interface MobileLayoutProps {
  /** Handler for prompt submission */
  onPromptSubmit: (prompt: string) => void
  /** Handler for arrangement actions */
  onArrangementAction: (action: string, prompt: string) => void
  /** Handler for visualizer click */
  onVisualizerClick?: () => void
}

/** Quick action items for mobile grid */
interface QuickAction {
  label: string
  prompt: string
  color: string
}

const MOBILE_QUICK_ACTIONS: QuickAction[] = [
  { label: 'DARKER', prompt: 'make it darker and moodier', color: '#8b5cf6' },
  { label: 'BRIGHTER', prompt: 'make it brighter and uplifting', color: '#f59e0b' },
  { label: 'WEIRDER', prompt: 'make it weirder and experimental', color: '#ec4899' },
  { label: 'HEAVIER', prompt: 'heavier and more aggressive', color: '#ef4444' },
  { label: 'MINIMAL', prompt: 'more minimal and sparse', color: '#22c55e' },
  { label: 'GROOVY', prompt: 'stronger groove and rhythm', color: '#6366f1' },
]

/**
 * Compact prompt history for mobile
 */
function CompactHistory() {
  const conversationHistory = useStore(state => state.conversationHistory)
  const lastPrompts = conversationHistory
    .filter(entry => entry.role === 'user')
    .slice(-3)

  if (lastPrompts.length === 0) return null

  return (
    <div className={styles.history}>
      {lastPrompts.map((entry, index) => (
        <div key={index} className={styles.historyItem}>
          <span className={styles.historyPrompt}>
            {entry.content.length > 30
              ? entry.content.slice(0, 30) + '...'
              : entry.content}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * 2x3 Quick Actions Grid
 */
function QuickActionsGrid({
  onAction,
  disabled,
}: {
  onAction: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <div className={styles.quickActionsGrid}>
      {MOBILE_QUICK_ACTIONS.map(action => (
        <button
          key={action.label}
          className={styles.quickActionButton}
          onClick={() => onAction(action.prompt)}
          disabled={disabled}
          style={{ '--action-color': action.color } as React.CSSProperties}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

/**
 * MobileLayout - optimized for portrait mobile
 */
export function MobileLayout({
  onPromptSubmit,
  onArrangementAction,
  onVisualizerClick,
}: MobileLayoutProps) {
  const isPlaying = useStore(state => state.isPlaying)
  const playbackStatus = useStore(state => state.playbackStatus)
  const isGenerating = playbackStatus === 'generating'

  const [showQuickActions, setShowQuickActions] = useState(true)

  // Handle quick action
  const handleQuickAction = useCallback(
    (prompt: string) => {
      onPromptSubmit(prompt)
    },
    [onPromptSubmit]
  )

  // Toggle between quick actions and prompt input
  const toggleInputMode = useCallback(() => {
    setShowQuickActions(prev => !prev)
  }, [])

  return (
    <div className={styles.container}>
      {/* Top bar with status */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <BeatIndicator size="small" style="dots" />
          <SectionIndicator size="small" />
        </div>
        <div className={styles.headerRight}>
          <EnergyMeter style="bar" size="small" showValue={true} showTrend={false} />
        </div>
      </header>

      {/* Visualizer section */}
      <section className={styles.visualizerSection} onClick={onVisualizerClick}>
        <Visualizer onClick={onVisualizerClick} />
      </section>

      {/* Compact history */}
      <CompactHistory />

      {/* Arrangement actions */}
      <section className={styles.arrangementSection}>
        <ArrangementActions
          onAction={onArrangementAction}
          disabled={isGenerating}
          layout="horizontal"
          size="medium"
        />
      </section>

      {/* Bottom controls */}
      <footer className={styles.footer}>
        {/* Toggle button */}
        <button className={styles.toggleButton} onClick={toggleInputMode}>
          {showQuickActions ? 'Type' : 'Quick'}
        </button>

        {/* Quick actions grid or prompt input */}
        {showQuickActions ? (
          <QuickActionsGrid
            onAction={handleQuickAction}
            disabled={isGenerating || !isPlaying}
          />
        ) : (
          <div className={styles.inputSection}>
            <PromptInput
              onSubmit={onPromptSubmit}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Play/Stop controls */}
        <div className={styles.controls}>
          <PlayButton size="large" />
          <EmergencyStop size="medium" showHint={false} />
        </div>
      </footer>
    </div>
  )
}

/**
 * Hook to detect mobile viewport
 */
export function useMobileLayout(): boolean {
  if (typeof window === 'undefined') return false

  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 640 || window.matchMedia('(pointer: coarse)').matches
  )

  // Update on resize
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      setIsMobile(window.innerWidth <= 640)
    })
  }

  return isMobile
}
