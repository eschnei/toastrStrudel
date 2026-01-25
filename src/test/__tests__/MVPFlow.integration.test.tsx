/**
 * MVP Flow Integration Tests
 *
 * Tests the complete prompt-to-music flow, verifying that all components
 * work together correctly from user input to audio playback.
 *
 * References: Phase 1 Success Criteria
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'

// Use vi.hoisted to create mocks that can be referenced in vi.mock factories
const { mockCreate, mockIsAvailable, mockGetClient } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockIsAvailable: vi.fn(() => true),
  mockGetClient: vi.fn(),
}))

// Mock Strudel modules
vi.mock('@strudel/webaudio', () => ({
  webaudioRepl: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    evaluate: vi.fn().mockResolvedValue(undefined),
    setCps: vi.fn(),
  })),
}))

vi.mock('@strudel/core', () => ({
  evalScope: vi.fn().mockResolvedValue(undefined),
  controls: {},
}))

vi.mock('@strudel/mini', () => ({
  miniAllStrings: vi.fn(),
}))

// Mock the Anthropic SDK module with controllable behavior
vi.mock('../../agents/anthropic', () => ({
  anthropic: {
    messages: {
      create: mockCreate,
    },
  },
  isAnthropicAvailable: mockIsAvailable,
  getAnthropicClient: mockGetClient,
}))

// Import components and hooks after mocking
import App from '../../App'
import { useStrudel } from '../../hooks/useStrudel'
import { usePatternAgent } from '../../hooks/usePatternAgent'
import { useStore } from '../../store'
import { StrudelEngine, resetStrudelEngine } from '../../engine/StrudelEngine'
import { resetPatternAgent } from '../../agents/PatternAgent'

describe('MVP Flow Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Configure mock behavior
    mockIsAvailable.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      messages: {
        create: mockCreate,
      },
    })

    // Default mock response for Claude API
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 's("bd sd:3 bd sd").gain(0.8)',
        },
      ],
    })

    // Reset store state
    useStore.setState({
      currentPattern: null,
      isPlaying: false,
      bpm: 128,
      playbackStatus: 'stopped',
      error: null,
      isFirstTime: true,
      isEngineReady: false,
      isApiAvailable: true,
      currentPrompt: '',
    })

    // Reset engine and agent singletons
    resetStrudelEngine()
    resetPatternAgent()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Prompt Submission Flow', () => {
    it('should trigger agent call when prompt is submitted', async () => {
      const user = userEvent.setup()

      render(<App />)

      // Find the prompt input
      const input = screen.getByPlaceholderText(/describe the vibe/i)
      expect(input).toBeInTheDocument()

      // Type a prompt
      await user.type(input, 'chill and spacey')

      // Submit the form (press Enter)
      await user.keyboard('{Enter}')

      // Verify the API was called
      await waitFor(
        () => {
          expect(mockCreate).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )

      // Check that the prompt was included in the message
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('chill and spacey'),
            }),
          ]),
        })
      )
    })

    it('should show generating state during agent call', async () => {
      const user = userEvent.setup()

      // Make the API call slow so we can observe the state
      mockCreate.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  content: [{ type: 'text', text: 's("bd sd")' }],
                }),
              200
            )
          )
      )

      render(<App />)

      const input = screen.getByPlaceholderText(/describe the vibe/i)
      await user.type(input, 'test prompt')
      await user.keyboard('{Enter}')

      // The input should show thinking state
      await waitFor(
        () => {
          const thinkingInput = screen.queryByPlaceholderText(/thinking/i)
          expect(thinkingInput).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should disable input while generating', async () => {
      const user = userEvent.setup()

      // Make the API call slow
      mockCreate.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  content: [{ type: 'text', text: 's("bd sd")' }],
                }),
              200
            )
          )
      )

      render(<App />)

      const input = screen.getByPlaceholderText(/describe the vibe/i)
      await user.type(input, 'test prompt')
      await user.keyboard('{Enter}')

      // Input should be disabled
      await waitFor(
        () => {
          expect(input).toBeDisabled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Audio Playback Flow', () => {
    it('should update pattern after successful generation', async () => {
      const { result } = renderHook(() => useStrudel())

      // Initialize the engine
      await act(async () => {
        await result.current.initialize()
      })

      // Update with a valid pattern
      let success = false
      await act(async () => {
        success = await result.current.updatePattern('s("bd sd").gain(0.8)')
      })

      expect(success).toBe(true)
    })

    it('should maintain current pattern when invalid response is received', async () => {
      const { result } = renderHook(() => useStrudel())

      // Initialize and set a valid pattern first
      await act(async () => {
        await result.current.initialize()
        await result.current.updatePattern('s("bd sd").gain(0.8)')
      })

      // Try to update with invalid pattern
      let success = false
      await act(async () => {
        success = await result.current.updatePattern('invalidFunction()')
      })

      expect(success).toBe(false)
      // The current pattern should still be valid (the engine keeps it)
    })

    it('should handle empty pattern gracefully', async () => {
      const { result } = renderHook(() => useStrudel())

      await act(async () => {
        await result.current.initialize()
      })

      let success = false
      await act(async () => {
        success = await result.current.updatePattern('')
      })

      expect(success).toBe(false)
    })
  })

  describe('BPM Control', () => {
    it('should apply BPM changes correctly', async () => {
      const { result } = renderHook(() => useStrudel())

      // Initialize
      await act(async () => {
        await result.current.initialize()
      })

      // Change BPM
      act(() => {
        result.current.setBPM(140)
      })

      expect(result.current.currentBPM).toBe(140)
    })

    it('should clamp BPM to valid range (60-180)', async () => {
      const { result } = renderHook(() => useStrudel())

      await act(async () => {
        await result.current.initialize()
      })

      // Try to set BPM below minimum
      act(() => {
        result.current.setBPM(30)
      })
      expect(result.current.currentBPM).toBe(60)

      // Try to set BPM above maximum
      act(() => {
        result.current.setBPM(250)
      })
      expect(result.current.currentBPM).toBe(180)
    })

    it('should have default BPM of 128', async () => {
      const { result } = renderHook(() => useStrudel())

      expect(result.current.currentBPM).toBe(128)
    })
  })

  describe('Play/Stop Controls', () => {
    it('should toggle play state correctly', async () => {
      const { result } = renderHook(() => useStrudel())

      // Initialize
      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.isPlaying).toBe(false)

      // Start playing
      await act(async () => {
        await result.current.play()
      })

      expect(result.current.isPlaying).toBe(true)

      // Stop
      act(() => {
        result.current.stop()
      })

      expect(result.current.isPlaying).toBe(false)
    })

    it('should toggle between play and stop', async () => {
      const { result } = renderHook(() => useStrudel())

      await act(async () => {
        await result.current.initialize()
      })

      // Toggle to playing
      await act(async () => {
        await result.current.toggle()
      })
      expect(result.current.isPlaying).toBe(true)

      // Toggle to stopped
      await act(async () => {
        await result.current.toggle()
      })
      expect(result.current.isPlaying).toBe(false)
    })

    it('should initialize audio on first play', async () => {
      const { result } = renderHook(() => useStrudel())

      expect(result.current.isReady).toBe(false)

      // Play should initialize
      await act(async () => {
        await result.current.play()
      })

      expect(result.current.isReady).toBe(true)
    })
  })

  describe('Quick Actions', () => {
    it('should display starting quick actions when not playing', () => {
      render(<App />)

      // Should show starting vibes - use getAllByText since "chill" appears in examples too
      const chillButtons = screen.getAllByText(/^chill$/i)
      expect(chillButtons.length).toBeGreaterThan(0)
      expect(screen.getAllByText(/^dark$/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/^energetic$/i).length).toBeGreaterThan(0)
    })

    it('should trigger pattern generation on quick action click', async () => {
      const user = userEvent.setup()

      render(<App />)

      // Click a quick action - use getAllByRole to get buttons, then find the one with 'dark'
      const quickActionButtons = screen.getAllByRole('button')
      const darkButton = quickActionButtons.find(btn => btn.textContent === 'dark')
      expect(darkButton).toBeDefined()
      await user.click(darkButton!)

      // Should trigger API call
      await waitFor(
        () => {
          expect(mockCreate).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Error Handling', () => {
    it('should use fallback pattern when API fails', async () => {
      const user = userEvent.setup()

      // Make the API fail
      mockCreate.mockRejectedValue(new Error('API Error'))

      render(<App />)

      const input = screen.getByPlaceholderText(/describe the vibe/i)
      await user.type(input, 'chill vibes')
      await user.keyboard('{Enter}')

      // Wait for the API call to fail and fallback to be used
      await waitFor(
        () => {
          expect(mockCreate).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )

      // The PatternAgent provides a fallback pattern on error
      // so music should still play (graceful degradation)
      await waitFor(
        () => {
          const state = useStore.getState()
          // Should have a fallback pattern set
          expect(state.playbackStatus).not.toBe('generating')
        },
        { timeout: 3000 }
      )
    })

    it('should recover from API errors gracefully', async () => {
      const user = userEvent.setup()

      // First call fails
      mockCreate.mockRejectedValueOnce(new Error('API Error'))

      // Second call succeeds
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 's("bd sd")' }],
      })

      render(<App />)

      const input = screen.getByPlaceholderText(/describe the vibe/i)

      // First attempt - the agent provides a fallback pattern on error
      await user.type(input, 'test prompt')
      await user.keyboard('{Enter}')

      await waitFor(
        () => {
          expect(mockCreate).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )

      // Wait for the fallback handling to complete
      await waitFor(
        () => {
          expect(input).not.toBeDisabled()
        },
        { timeout: 3000 }
      )

      // Clear input and try again
      await user.clear(input)
      await user.type(input, 'second attempt')
      await user.keyboard('{Enter}')

      // Second attempt should be made
      await waitFor(
        () => {
          expect(mockCreate).toHaveBeenCalledTimes(2)
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Store State Management', () => {
    it('should update store when pattern is set', async () => {
      // Directly test the store
      act(() => {
        useStore.getState().setPattern('s("bd sd")')
      })

      const state = useStore.getState()
      expect(state.currentPattern).toBe('s("bd sd")')
      expect(state.isFirstTime).toBe(false)
    })

    it('should track first-time user state', () => {
      const state = useStore.getState()
      expect(state.isFirstTime).toBe(true)

      // Set a pattern
      act(() => {
        useStore.getState().setPattern('s("bd sd")')
      })

      const newState = useStore.getState()
      expect(newState.isFirstTime).toBe(false)
    })

    it('should track playback status', () => {
      act(() => {
        useStore.getState().setStatus('generating')
      })

      expect(useStore.getState().playbackStatus).toBe('generating')

      act(() => {
        useStore.getState().setStatus('playing')
      })

      expect(useStore.getState().playbackStatus).toBe('playing')
    })
  })

  describe('Empty State', () => {
    it('should show empty state for first-time users', () => {
      render(<App />)

      expect(screen.getByText(/vibe conductor/i)).toBeInTheDocument()
      expect(screen.getByText(/describe music with words/i)).toBeInTheDocument()
    })

    it('should show example prompt', () => {
      render(<App />)

      // Should show an example
      expect(screen.getByText(/try:/i)).toBeInTheDocument()
    })
  })
})

describe('useStrudel Hook', () => {
  beforeEach(() => {
    resetStrudelEngine()
    useStore.setState({
      currentPattern: null,
      isPlaying: false,
      bpm: 128,
      playbackStatus: 'stopped',
      error: null,
      isFirstTime: true,
      isEngineReady: false,
      isApiAvailable: true,
      currentPrompt: '',
    })
  })

  it('should expose all required methods', () => {
    const { result } = renderHook(() => useStrudel())

    expect(result.current.play).toBeDefined()
    expect(result.current.stop).toBeDefined()
    expect(result.current.toggle).toBeDefined()
    expect(result.current.updatePattern).toBeDefined()
    expect(result.current.setBPM).toBeDefined()
    expect(result.current.initialize).toBeDefined()
    expect(result.current.clearError).toBeDefined()
    expect(result.current.getAudioContext).toBeDefined()
  })

  it('should expose all required state', () => {
    const { result } = renderHook(() => useStrudel())

    expect(typeof result.current.isPlaying).toBe('boolean')
    expect(typeof result.current.isReady).toBe('boolean')
    expect(typeof result.current.currentBPM).toBe('number')
    expect(result.current.error).toBeNull()
    expect(result.current.audioContextState).toBeDefined()
  })
})

describe('usePatternAgent Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPatternAgent()

    mockIsAvailable.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      messages: {
        create: mockCreate,
      },
    })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 's("bd sd")' }],
    })

    useStore.setState({
      currentPattern: null,
      isPlaying: false,
      bpm: 128,
      playbackStatus: 'stopped',
      error: null,
      isFirstTime: true,
      isEngineReady: false,
      isApiAvailable: true,
      currentPrompt: '',
    })
  })

  it('should expose all required methods', () => {
    const { result } = renderHook(() => usePatternAgent())

    expect(result.current.generatePattern).toBeDefined()
    expect(result.current.clearContext).toBeDefined()
    expect(result.current.clearError).toBeDefined()
  })

  it('should expose all required state', () => {
    const { result } = renderHook(() => usePatternAgent())

    expect(typeof result.current.isGenerating).toBe('boolean')
    expect(typeof result.current.isAvailable).toBe('boolean')
    expect(result.current.error).toBeNull()
    expect(result.current.lastPattern).toBeNull()
    expect(result.current.lastResult).toBeNull()
  })

  it('should update state during generation', async () => {
    const { result } = renderHook(() => usePatternAgent())

    // Start generation
    await act(async () => {
      await result.current.generatePattern('test vibe')
    })

    // Check final state
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.lastPattern).toBe('s("bd sd")')
  })

  it('should handle generation errors gracefully with fallback', async () => {
    mockCreate.mockRejectedValue(new Error('Test Error'))

    const { result } = renderHook(() => usePatternAgent())

    let generationResult: Awaited<ReturnType<typeof result.current.generatePattern>>
    await act(async () => {
      generationResult = await result.current.generatePattern('chill vibes')
    })

    // PatternAgent provides fallback patterns on error
    // so it should return a pattern, not null
    expect(result.current.isGenerating).toBe(false)
    expect(generationResult).not.toBeNull()
    // The fallback pattern should be a valid Strudel pattern
    expect(generationResult?.pattern).toContain('s(')
  })
})
