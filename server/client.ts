/**
 * API Proxy Client
 *
 * Client-side utility for communicating with the backend API proxy.
 * Use this in production instead of direct Anthropic SDK calls.
 *
 * @references SEC-001, NFR-017
 */

export interface ProxyMessageRequest {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  system?: string
  max_tokens?: number
  temperature?: number
  model?: string
}

export interface ProxyMessageResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: string
    text: string
  }>
  model: string
  stop_reason: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface ProxyError {
  error: string
  message: string
  details?: string[]
}

export interface ProxyClientConfig {
  /** API server base URL */
  baseUrl: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Custom headers */
  headers?: Record<string, string>
}

const DEFAULT_CONFIG: Required<ProxyClientConfig> = {
  baseUrl: 'http://localhost:3001',
  timeout: 30000,
  headers: {},
}

/**
 * Create an API proxy client
 */
export function createProxyClient(config: Partial<ProxyClientConfig> = {}) {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config }

  /**
   * Make a request to the API proxy
   */
  async function request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${effectiveConfig.baseUrl}${path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), effectiveConfig.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...effectiveConfig.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'include',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json() as ProxyError
        throw new ProxyApiError(
          error.message || 'Request failed',
          response.status,
          error
        )
      }

      return response.json() as Promise<T>
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ProxyApiError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProxyApiError('Request timeout', 408)
      }

      throw new ProxyApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      )
    }
  }

  return {
    /**
     * Check if the API is healthy
     */
    async health(): Promise<{ status: string; timestamp: string; version: string }> {
      return request('GET', '/api/health')
    },

    /**
     * Check if Claude API is available
     */
    async checkStatus(): Promise<{ status: string; model?: string; error?: string }> {
      return request('GET', '/api/claude/status')
    },

    /**
     * Generate a message using Claude
     */
    async createMessage(params: ProxyMessageRequest): Promise<ProxyMessageResponse> {
      return request('POST', '/api/claude/messages', params)
    },

    /**
     * Check if the proxy server is reachable
     */
    async isAvailable(): Promise<boolean> {
      try {
        await this.health()
        return true
      } catch {
        return false
      }
    },
  }
}

/**
 * Custom error class for proxy API errors
 */
export class ProxyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: ProxyError
  ) {
    super(message)
    this.name = 'ProxyApiError'
  }
}

/**
 * Default client instance
 * Configure baseUrl for your environment
 */
export const proxyClient = createProxyClient({
  baseUrl: import.meta.env?.VITE_API_URL || 'http://localhost:3001',
})

/**
 * Drop-in replacement for direct Anthropic calls
 * Use this to switch from client-side to proxy-based API calls
 *
 * @example
 * // Before (client-side, insecure)
 * const anthropic = new Anthropic({ apiKey: VITE_ANTHROPIC_API_KEY })
 * const response = await anthropic.messages.create({ ... })
 *
 * // After (proxy, secure)
 * const response = await createProxyMessage({ ... })
 */
export async function createProxyMessage(
  params: ProxyMessageRequest
): Promise<ProxyMessageResponse> {
  return proxyClient.createMessage(params)
}
