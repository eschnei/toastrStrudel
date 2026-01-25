/**
 * ConversationManager - Manages conversation history for contextual AI responses
 *
 * Stores conversation history between user and assistant, enabling the PatternAgent
 * to maintain context across prompts and generate more coherent modifications.
 *
 * @references FR-007, ARCH-004
 */

export interface ConversationEntry {
  /** Role of the message sender */
  role: 'user' | 'assistant'
  /** The message content */
  content: string
  /** When the message was created */
  timestamp: Date
  /** The pattern that was generated (for assistant messages) */
  resultingPattern?: string
  /** Associated metadata */
  metadata?: {
    bpm?: number
    energyLevel?: number
    mood?: string
    isModification?: boolean
  }
}

export interface ConversationSummary {
  /** Total number of messages in history */
  messageCount: number
  /** Number of user prompts */
  promptCount: number
  /** Number of generated patterns */
  patternCount: number
  /** Recent topics/vibes mentioned */
  recentVibes: string[]
  /** Current session duration in minutes */
  sessionDurationMinutes: number
}

export interface ConversationManagerConfig {
  /** Maximum number of messages to store */
  maxHistoryLength: number
  /** Maximum token estimate for context window */
  maxTokenEstimate: number
}

const DEFAULT_CONFIG: ConversationManagerConfig = {
  maxHistoryLength: 20,
  maxTokenEstimate: 4000, // Rough estimate for context window management
}

/**
 * Extracts key vibes/topics from a message
 */
function extractVibes(content: string): string[] {
  const vibeKeywords = [
    'chill', 'dark', 'heavy', 'dreamy', 'energetic', 'aggressive',
    'minimal', 'dense', 'spacey', 'bright', 'moody', 'weird',
    'glitchy', 'smooth', 'building', 'dropping', 'ambient',
    'house', 'techno', 'dnb', 'dubstep', 'tropical'
  ]

  const lowered = content.toLowerCase()
  return vibeKeywords.filter(vibe => lowered.includes(vibe))
}

/**
 * Estimates token count for a message (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token per 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * ConversationManager class - stores and manages conversation history
 */
export class ConversationManager {
  private history: ConversationEntry[] = []
  private config: ConversationManagerConfig
  private sessionStartTime: Date

  constructor(config: Partial<ConversationManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionStartTime = new Date()
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(entry: Omit<ConversationEntry, 'timestamp'> & { timestamp?: Date }): void {
    const fullEntry: ConversationEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
    }

    this.history.push(fullEntry)
    console.log('[ConversationManager] Added message:', fullEntry.role, fullEntry.content.slice(0, 50) + '...')

    // Prune history if needed
    this.pruneHistory()
  }

  /**
   * Add a user prompt to the history
   */
  addUserPrompt(content: string, metadata?: ConversationEntry['metadata']): void {
    this.addMessage({
      role: 'user',
      content,
      metadata,
    })
  }

  /**
   * Add an assistant response with the generated pattern
   */
  addAssistantResponse(
    content: string,
    resultingPattern: string,
    metadata?: ConversationEntry['metadata']
  ): void {
    this.addMessage({
      role: 'assistant',
      content,
      resultingPattern,
      metadata,
    })
  }

  /**
   * Get the full conversation history
   */
  getHistory(): ConversationEntry[] {
    return [...this.history]
  }

  /**
   * Get recent history (last N entries)
   */
  getRecentHistory(count: number): ConversationEntry[] {
    return this.history.slice(-count)
  }

  /**
   * Get history formatted for API context
   * Returns messages in the format expected by Claude API
   */
  getContextMessages(maxMessages?: number): Array<{ role: 'user' | 'assistant'; content: string }> {
    const entries = maxMessages
      ? this.getRecentHistory(maxMessages)
      : this.history

    return entries.map(entry => ({
      role: entry.role,
      content: entry.role === 'assistant' && entry.resultingPattern
        ? `Generated pattern: ${entry.resultingPattern.slice(0, 200)}${entry.resultingPattern.length > 200 ? '...' : ''}`
        : entry.content,
    }))
  }

  /**
   * Get a summary of the conversation
   */
  getSummary(): ConversationSummary {
    const userMessages = this.history.filter(e => e.role === 'user')
    const assistantMessages = this.history.filter(e => e.role === 'assistant')

    const allVibes: string[] = []
    this.history.forEach(entry => {
      allVibes.push(...extractVibes(entry.content))
    })

    // Get unique recent vibes (last 5)
    const uniqueVibes = [...new Set(allVibes)].slice(-5)

    const sessionDurationMinutes = Math.round(
      (Date.now() - this.sessionStartTime.getTime()) / (1000 * 60)
    )

    return {
      messageCount: this.history.length,
      promptCount: userMessages.length,
      patternCount: assistantMessages.filter(m => m.resultingPattern).length,
      recentVibes: uniqueVibes,
      sessionDurationMinutes,
    }
  }

  /**
   * Get the last generated pattern
   */
  getLastPattern(): string | null {
    const lastAssistant = [...this.history]
      .reverse()
      .find(e => e.role === 'assistant' && e.resultingPattern)

    return lastAssistant?.resultingPattern || null
  }

  /**
   * Get the last user prompt
   */
  getLastUserPrompt(): string | null {
    const lastUser = [...this.history]
      .reverse()
      .find(e => e.role === 'user')

    return lastUser?.content || null
  }

  /**
   * Get conversation context as a formatted string
   * Useful for including in system prompts
   */
  getContextString(): string {
    if (this.history.length === 0) {
      return 'No previous conversation.'
    }

    const recentEntries = this.getRecentHistory(6) // Last 3 exchanges
    const parts: string[] = []

    recentEntries.forEach(entry => {
      if (entry.role === 'user') {
        parts.push(`User requested: "${entry.content}"`)
      } else if (entry.resultingPattern) {
        // Summarize the pattern instead of including full code
        parts.push(`Assistant generated a pattern.`)
      }
    })

    const summary = this.getSummary()
    if (summary.recentVibes.length > 0) {
      parts.push(`Recent vibes: ${summary.recentVibes.join(', ')}`)
    }

    return parts.join('\n')
  }

  /**
   * Clear all conversation history
   */
  clear(): void {
    this.history = []
    this.sessionStartTime = new Date()
    console.log('[ConversationManager] History cleared')
  }

  /**
   * Get estimated token count for current history
   */
  getEstimatedTokenCount(): number {
    return this.history.reduce((total, entry) => {
      let tokens = estimateTokens(entry.content)
      if (entry.resultingPattern) {
        tokens += estimateTokens(entry.resultingPattern)
      }
      return total + tokens
    }, 0)
  }

  /**
   * Check if a prompt appears to be a modification request
   */
  isModificationRequest(prompt: string): boolean {
    const modificationPatterns = [
      /^make it/i,
      /^add (more|some)/i,
      /^remove/i,
      /^less/i,
      /^more/i,
      /^(darker|brighter|faster|slower)/i,
      /^strip/i,
      /^build/i,
      /^drop/i,
      /keep .* but/i,
      /change the/i,
      /increase/i,
      /decrease/i,
    ]

    return modificationPatterns.some(pattern => pattern.test(prompt.trim()))
  }

  /**
   * Prune old messages to stay within limits
   */
  private pruneHistory(): void {
    // Check message count limit
    if (this.history.length > this.config.maxHistoryLength) {
      const excess = this.history.length - this.config.maxHistoryLength
      this.history = this.history.slice(excess)
      console.log(`[ConversationManager] Pruned ${excess} old messages`)
    }

    // Check token estimate limit
    while (this.getEstimatedTokenCount() > this.config.maxTokenEstimate && this.history.length > 2) {
      this.history.shift()
      console.log('[ConversationManager] Pruned message due to token limit')
    }
  }

  /**
   * Export history for persistence
   */
  export(): string {
    return JSON.stringify({
      history: this.history,
      sessionStartTime: this.sessionStartTime.toISOString(),
    })
  }

  /**
   * Import history from persistence
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (parsed.history && Array.isArray(parsed.history)) {
        this.history = parsed.history.map((entry: ConversationEntry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }))
      }
      if (parsed.sessionStartTime) {
        this.sessionStartTime = new Date(parsed.sessionStartTime)
      }
      console.log('[ConversationManager] Imported', this.history.length, 'messages')
    } catch (error) {
      console.error('[ConversationManager] Failed to import history:', error)
    }
  }
}

// Singleton instance
let managerInstance: ConversationManager | null = null

export function getConversationManager(): ConversationManager {
  if (!managerInstance) {
    managerInstance = new ConversationManager()
  }
  return managerInstance
}

export function resetConversationManager(): void {
  if (managerInstance) {
    managerInstance.clear()
  }
  managerInstance = null
}
