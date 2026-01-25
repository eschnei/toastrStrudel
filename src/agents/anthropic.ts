/**
 * Anthropic SDK Integration
 *
 * Initializes and exports the Anthropic client for Claude API access.
 * NOTE: Uses dangerouslyAllowBrowser for demo/development.
 * Production deployments should use a backend proxy.
 */

import Anthropic from '@anthropic-ai/sdk'

// Get API key from environment variable
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

if (!apiKey) {
  console.warn(
    '[Anthropic] No API key found. Set VITE_ANTHROPIC_API_KEY in .env file.'
  )
}

/**
 * Anthropic client instance
 * Using dangerouslyAllowBrowser for demo - production should use backend proxy
 */
export const anthropic = apiKey
  ? new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  : null

/**
 * Check if the Anthropic client is available
 */
export function isAnthropicAvailable(): boolean {
  return anthropic !== null
}

/**
 * Get the Anthropic client, throwing if not available
 */
export function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    throw new Error(
      'Anthropic client not initialized. Set VITE_ANTHROPIC_API_KEY environment variable.'
    )
  }
  return anthropic
}
