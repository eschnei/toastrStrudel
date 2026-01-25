/**
 * Vitest Test Setup
 *
 * Global test setup and configuration for the Vibe Conductor test suite.
 */

import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Web Audio API
class MockAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'suspended'
  destination = {}
  sampleRate = 44100

  constructor() {
    this.state = 'suspended'
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async close(): Promise<void> {
    this.state = 'closed'
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
  }

  createOscillator() {
    return {
      frequency: { value: 440 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
    }
  }

  // Event handler
  onstatechange: (() => void) | null = null
}

// Global AudioContext mock
global.AudioContext = MockAudioContext as unknown as typeof AudioContext

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
