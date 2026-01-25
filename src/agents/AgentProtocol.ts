/**
 * AgentProtocol - Inter-Agent Communication Protocol
 *
 * Manages message passing, context sharing, error handling, and timeout
 * management between the Conductor and specialist agents.
 *
 * @references Phase 4 Task 4.2.1
 */

import type {
  AgentMessage,
  AgentContext,
  AgentResponse,
  SpecialistAgent,
} from './specialists/types'
import { createDefaultContext } from './specialists/types'

/**
 * Protocol configuration
 */
export interface ProtocolConfig {
  /** Default timeout for agent calls in ms */
  defaultTimeout: number
  /** Maximum retries for failed calls */
  maxRetries: number
  /** Delay between retries in ms */
  retryDelay: number
  /** Enable logging */
  verbose: boolean
}

const DEFAULT_PROTOCOL_CONFIG: ProtocolConfig = {
  defaultTimeout: 30000, // 30 seconds
  maxRetries: 2,
  retryDelay: 1000,
  verbose: true,
}

/**
 * Message queue entry
 */
interface QueuedMessage {
  id: string
  message: AgentMessage
  targetAgent: string
  timestamp: number
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  response?: AgentResponse
  error?: string
  retryCount: number
}

/**
 * Protocol event types
 */
export type ProtocolEventType =
  | 'message_sent'
  | 'message_received'
  | 'response_received'
  | 'timeout'
  | 'error'
  | 'retry'

/**
 * Protocol event
 */
export interface ProtocolEvent {
  type: ProtocolEventType
  agentName: string
  messageId: string
  timestamp: number
  data?: unknown
}

/**
 * Protocol event listener
 */
type ProtocolEventListener = (event: ProtocolEvent) => void

/**
 * AgentProtocol class - manages inter-agent communication
 */
export class AgentProtocol {
  private config: ProtocolConfig
  private agents: Map<string, SpecialistAgent> = new Map()
  private messageQueue: Map<string, QueuedMessage> = new Map()
  private eventListeners: Set<ProtocolEventListener> = new Set()
  private currentContext: AgentContext

  constructor(config: Partial<ProtocolConfig> = {}) {
    this.config = { ...DEFAULT_PROTOCOL_CONFIG, ...config }
    this.currentContext = createDefaultContext()
  }

  /**
   * Register a specialist agent
   */
  registerAgent(agent: SpecialistAgent): void {
    this.agents.set(agent.name, agent)
    this.log(`Registered agent: ${agent.name}`)
  }

  /**
   * Unregister a specialist agent
   */
  unregisterAgent(name: string): void {
    this.agents.delete(name)
    this.log(`Unregistered agent: ${name}`)
  }

  /**
   * Get a registered agent
   */
  getAgent(name: string): SpecialistAgent | undefined {
    return this.agents.get(name)
  }

  /**
   * Check if an agent is registered
   */
  hasAgent(name: string): boolean {
    return this.agents.has(name)
  }

  /**
   * Get all registered agent names
   */
  getAgentNames(): string[] {
    return Array.from(this.agents.keys())
  }

  /**
   * Update shared context
   */
  updateContext(updates: Partial<AgentContext>): void {
    this.currentContext = { ...this.currentContext, ...updates }
    this.log(`Context updated: ${JSON.stringify(updates)}`)
  }

  /**
   * Get current shared context
   */
  getContext(): AgentContext {
    return { ...this.currentContext }
  }

  /**
   * Send a message to an agent
   */
  async sendMessage(
    agentName: string,
    message: AgentMessage,
    options?: {
      timeout?: number
      priority?: 'high' | 'normal' | 'low'
    }
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentName)

    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`)
    }

    if (!agent.isAvailable()) {
      throw new Error(`Agent not available: ${agentName}`)
    }

    const messageId = this.generateMessageId()
    const timeout = options?.timeout ?? this.config.defaultTimeout

    // Create queue entry
    const queueEntry: QueuedMessage = {
      id: messageId,
      message,
      targetAgent: agentName,
      timestamp: Date.now(),
      priority: options?.priority ?? 'normal',
      status: 'pending',
      retryCount: 0,
    }

    this.messageQueue.set(messageId, queueEntry)
    this.emitEvent('message_sent', agentName, messageId, { message })

    try {
      queueEntry.status = 'processing'

      // Execute with timeout
      const response = await this.executeWithTimeout(
        () => agent.generate(message, message.context),
        timeout
      )

      queueEntry.status = 'completed'
      queueEntry.response = response

      this.emitEvent('response_received', agentName, messageId, { response })

      return response
    } catch (error) {
      const err = error as Error

      // Check if we should retry
      if (queueEntry.retryCount < this.config.maxRetries) {
        queueEntry.retryCount++
        this.emitEvent('retry', agentName, messageId, {
          attempt: queueEntry.retryCount,
          error: err.message,
        })

        await this.delay(this.config.retryDelay)
        return this.sendMessage(agentName, message, options)
      }

      queueEntry.status = 'failed'
      queueEntry.error = err.message

      this.emitEvent('error', agentName, messageId, { error: err.message })

      // Return fallback pattern
      return {
        pattern: agent.getDefaultPattern(message.context),
        success: false,
        error: err.message,
        layerType: agent.name,
        warnings: ['Used fallback pattern due to error'],
      }
    }
  }

  /**
   * Send messages to multiple agents in parallel
   */
  async sendParallel(
    messages: Array<{ agentName: string; message: AgentMessage }>,
    options?: {
      timeout?: number
      priority?: 'high' | 'normal' | 'low'
    }
  ): Promise<Map<string, AgentResponse>> {
    const results = new Map<string, AgentResponse>()

    const promises = messages.map(async ({ agentName, message }) => {
      try {
        const response = await this.sendMessage(agentName, message, options)
        results.set(agentName, response)
      } catch (error) {
        const err = error as Error
        const agent = this.agents.get(agentName)

        results.set(agentName, {
          pattern: agent?.getDefaultPattern(message.context) || '',
          success: false,
          error: err.message,
          layerType: agentName as 'drums' | 'bass' | 'synth' | 'fx',
        })
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Send messages sequentially (for dependencies)
   */
  async sendSequential(
    messages: Array<{ agentName: string; message: AgentMessage }>,
    options?: {
      timeout?: number
      /** Function to modify next message based on previous response */
      chainContext?: (
        prevResponse: AgentResponse,
        nextMessage: AgentMessage
      ) => AgentMessage
    }
  ): Promise<Map<string, AgentResponse>> {
    const results = new Map<string, AgentResponse>()
    let previousResponse: AgentResponse | null = null

    for (const { agentName, message } of messages) {
      let messageToSend = message

      // Apply chain context if available
      if (options?.chainContext && previousResponse) {
        messageToSend = options.chainContext(previousResponse, message)
      }

      try {
        const response = await this.sendMessage(agentName, messageToSend, {
          timeout: options?.timeout,
        })
        results.set(agentName, response)
        previousResponse = response
      } catch (error) {
        const err = error as Error
        const agent = this.agents.get(agentName)

        const failedResponse: AgentResponse = {
          pattern: agent?.getDefaultPattern(message.context) || '',
          success: false,
          error: err.message,
          layerType: agentName as 'drums' | 'bass' | 'synth' | 'fx',
        }

        results.set(agentName, failedResponse)
        previousResponse = failedResponse
      }
    }

    return results
  }

  /**
   * Add event listener
   */
  addEventListener(listener: ProtocolEventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /**
   * Get message history
   */
  getMessageHistory(limit: number = 50): QueuedMessage[] {
    return Array.from(this.messageQueue.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageQueue.clear()
  }

  /**
   * Get protocol statistics
   */
  getStats(): {
    totalMessages: number
    successful: number
    failed: number
    pending: number
    averageResponseTime: number
  } {
    const messages = Array.from(this.messageQueue.values())

    const completed = messages.filter(m => m.status === 'completed')
    const failed = messages.filter(m => m.status === 'failed')
    const pending = messages.filter(
      m => m.status === 'pending' || m.status === 'processing'
    )

    // Calculate average response time for completed messages
    const responseTimes = completed
      .filter(m => m.response)
      .map(m => Date.now() - m.timestamp)

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0

    return {
      totalMessages: messages.length,
      successful: completed.length,
      failed: failed.length,
      pending: pending.length,
      averageResponseTime,
    }
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ])
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Emit a protocol event
   */
  private emitEvent(
    type: ProtocolEventType,
    agentName: string,
    messageId: string,
    data?: unknown
  ): void {
    const event: ProtocolEvent = {
      type,
      agentName,
      messageId,
      timestamp: Date.now(),
      data,
    }

    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[AgentProtocol] Event listener error:', error)
      }
    })
  }

  /**
   * Log a message (if verbose mode enabled)
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[AgentProtocol] ${message}`)
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ProtocolConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Get configuration
   */
  getConfig(): ProtocolConfig {
    return { ...this.config }
  }
}

// Singleton instance
let protocolInstance: AgentProtocol | null = null

export function getAgentProtocol(): AgentProtocol {
  if (!protocolInstance) {
    protocolInstance = new AgentProtocol()
  }
  return protocolInstance
}

export function resetAgentProtocol(): void {
  protocolInstance = null
}
