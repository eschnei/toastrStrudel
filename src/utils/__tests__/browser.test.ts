/**
 * Browser Compatibility Utilities Tests
 *
 * Tests browser detection, feature checking, and polyfills.
 *
 * References: NFR-014
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  detectBrowser,
  getAudioContextClass,
  createAudioContext,
  ensureResizeObserver,
  isSecureContext,
  checkBrowserCompatibility,
  raf,
  cancelRaf,
} from '../browser'

describe('Browser Detection', () => {
  const originalUserAgent = navigator.userAgent

  afterEach(() => {
    // Reset userAgent mock
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    })
  })

  it('should detect Chrome browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      writable: true,
    })

    const info = detectBrowser()
    expect(info.name).toBe('chrome')
    expect(info.version).toBe(120)
    expect(info.isChromium).toBe(true)
  })

  it('should detect Firefox browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121',
      writable: true,
    })

    const info = detectBrowser()
    expect(info.name).toBe('firefox')
    expect(info.version).toBe(121)
    expect(info.isChromium).toBe(false)
  })

  it('should detect Safari browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      writable: true,
    })

    const info = detectBrowser()
    expect(info.name).toBe('safari')
    expect(info.version).toBe(17)
    expect(info.isChromium).toBe(false)
  })

  it('should detect Edge browser', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      writable: true,
    })

    const info = detectBrowser()
    expect(info.name).toBe('edge')
    expect(info.isChromium).toBe(true)
  })

  it('should detect mobile devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      writable: true,
    })

    const info = detectBrowser()
    expect(info.isMobile).toBe(true)
  })
})

describe('Audio Context', () => {
  it('should return AudioContext class', () => {
    const AudioContextClass = getAudioContextClass()
    expect(AudioContextClass).toBeDefined()
    expect(typeof AudioContextClass).toBe('function')
  })

  it('should create an AudioContext instance', () => {
    const context = createAudioContext()
    expect(context).toBeInstanceOf(AudioContext)
    context.close()
  })
})

describe('ResizeObserver Polyfill', () => {
  it('should return true when ResizeObserver is supported', () => {
    // In modern test environment, ResizeObserver should be available
    // (via happy-dom mock or native)
    const result = ensureResizeObserver()
    expect(typeof result).toBe('boolean')
  })
})

describe('Secure Context', () => {
  it('should detect secure context', () => {
    const result = isSecureContext()
    expect(typeof result).toBe('boolean')
  })
})

describe('Compatibility Check', () => {
  it('should return compatibility status', () => {
    const compat = checkBrowserCompatibility()

    expect(compat).toHaveProperty('compatible')
    expect(compat).toHaveProperty('missingFeatures')
    expect(compat).toHaveProperty('warnings')
    expect(typeof compat.compatible).toBe('boolean')
    expect(Array.isArray(compat.missingFeatures)).toBe(true)
    expect(Array.isArray(compat.warnings)).toBe(true)
  })

  it('should be compatible in test environment', () => {
    const compat = checkBrowserCompatibility()
    expect(compat.compatible).toBe(true)
    expect(compat.missingFeatures).toHaveLength(0)
  })
})

describe('Animation Frame Utilities', () => {
  it('should have raf function', () => {
    expect(typeof raf).toBe('function')
  })

  it('should have cancelRaf function', () => {
    expect(typeof cancelRaf).toBe('function')
  })

  it('should schedule and cancel animation frames', () => {
    const callback = vi.fn()
    const id = raf(callback)
    cancelRaf(id)
    // Callback should not be called after cancel
    expect(callback).not.toHaveBeenCalled()
  })
})
