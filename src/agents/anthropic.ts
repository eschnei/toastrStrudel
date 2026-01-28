/**
 * OpenAI SDK Integration
 *
 * Initializes and exports the OpenAI client for GPT API access.
 * NOTE: Uses dangerouslyAllowBrowser for demo/development.
 * Production deployments should use a backend proxy.
 */

import OpenAI from 'openai'

// Get API key from environment variable
const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

if (!apiKey) {
  console.warn(
    '[OpenAI] No API key found. Set VITE_OPENAI_API_KEY in .env file.'
  )
}

/**
 * OpenAI client instance
 * Using dangerouslyAllowBrowser for demo - production should use backend proxy
 */
const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  : null

/**
 * Check if the OpenAI client is available
 */
export function isAnthropicAvailable(): boolean {
  return openaiClient !== null
}

/**
 * Helper to create a chat completion and return just the text response.
 * Wraps the OpenAI API to provide a consistent interface for all agents.
 */
export async function createChatCompletion(options: {
  model: string
  maxTokens: number
  temperature: number
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  if (!openaiClient) {
    throw new Error(
      'OpenAI client not initialized. Set VITE_OPENAI_API_KEY environment variable.'
    )
  }

  const response = await openaiClient.chat.completions.create({
    model: options.model,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    messages: [
      { role: 'system' as const, content: options.system },
      ...options.messages,
    ],
  })

  return response.choices[0]?.message?.content || ''
}
