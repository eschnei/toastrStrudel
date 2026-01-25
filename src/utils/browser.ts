/**
 * Browser Compatibility Utilities
 *
 * Feature detection, polyfills, and browser-specific handling
 * for cross-browser compatibility.
 *
 * References: NFR-014
 */

/**
 * Browser detection and feature flags
 */
export interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown'
  version: number
  isChromium: boolean
  isMobile: boolean
  supportsAudioWorklet: boolean
  supportsBackdropFilter: boolean
  supportsWebAudio: boolean
}

/**
 * Detect browser information
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent.toLowerCase()

  let name: BrowserInfo['name'] = 'unknown'
  let version = 0

  // Detect browser name and version
  if (ua.includes('edg/')) {
    name = 'edge'
    const match = ua.match(/edg\/(\d+)/)
    version = match ? parseInt(match[1], 10) : 0
  } else if (ua.includes('chrome')) {
    name = 'chrome'
    const match = ua.match(/chrome\/(\d+)/)
    version = match ? parseInt(match[1], 10) : 0
  } else if (ua.includes('firefox')) {
    name = 'firefox'
    const match = ua.match(/firefox\/(\d+)/)
    version = match ? parseInt(match[1], 10) : 0
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    name = 'safari'
    const match = ua.match(/version\/(\d+)/)
    version = match ? parseInt(match[1], 10) : 0
  }

  const isChromium = name === 'chrome' || name === 'edge'
  const isMobile =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)

  return {
    name,
    version,
    isChromium,
    isMobile,
    supportsAudioWorklet: 'AudioWorklet' in window,
    supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
    supportsWebAudio:
      'AudioContext' in window || 'webkitAudioContext' in window,
  }
}

/**
 * Get AudioContext constructor with fallback for older Safari
 */
export function getAudioContextClass(): typeof AudioContext {
  // @ts-expect-error - webkitAudioContext exists in older Safari
  return window.AudioContext || window.webkitAudioContext
}

/**
 * Create a cross-browser compatible AudioContext
 */
export function createAudioContext(): AudioContext {
  const AudioContextClass = getAudioContextClass()
  return new AudioContextClass()
}

/**
 * Handle Safari's strict audio context suspension
 * Call this to set up visibility change handlers
 */
export function setupAudioContextRecovery(audioContext: AudioContext): () => void {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(console.warn)
      }
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

/**
 * Ensure ResizeObserver is available (polyfill if needed)
 * Modern browsers all support this, but this provides safety
 */
export function ensureResizeObserver(): boolean {
  if ('ResizeObserver' in window) {
    return true
  }

  // For extremely old browsers, provide a basic fallback
  // that uses window resize events
  // @ts-expect-error - polyfilling global
  window.ResizeObserver = class ResizeObserverPolyfill {
    private callback: ResizeObserverCallback
    private elements: Set<Element>

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
      this.elements = new Set()
      window.addEventListener('resize', this.handleResize)
    }

    private handleResize = () => {
      const entries: ResizeObserverEntry[] = []
      this.elements.forEach(element => {
        const rect = element.getBoundingClientRect()
        entries.push({
          target: element,
          contentRect: rect,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as ResizeObserverEntry)
      })
      if (entries.length > 0) {
        this.callback(entries, this as unknown as ResizeObserver)
      }
    }

    observe(element: Element) {
      this.elements.add(element)
    }

    unobserve(element: Element) {
      this.elements.delete(element)
    }

    disconnect() {
      this.elements.clear()
      window.removeEventListener('resize', this.handleResize)
    }
  }

  return false
}

/**
 * RequestAnimationFrame polyfill for consistency
 */
export const raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (callback: FrameRequestCallback) => setTimeout(callback, 16) as unknown as number

export const cancelRaf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id)

/**
 * Check if running in a secure context (required for some APIs)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext ?? window.location.protocol === 'https:'
}

/**
 * Prefix-free CSS property application
 */
export function applyPrefixedStyle(
  element: HTMLElement,
  property: string,
  value: string
): void {
  // Standard property
  element.style.setProperty(property, value)

  // Webkit prefix (Safari)
  if (property.startsWith('-webkit-') === false) {
    element.style.setProperty(`-webkit-${property}`, value)
  }

  // Mozilla prefix (Firefox, though rarely needed nowadays)
  if (property.startsWith('-moz-') === false) {
    element.style.setProperty(`-moz-${property}`, value)
  }
}

/**
 * Check if backdrop-filter is supported and apply fallback if not
 */
export function applyGlassEffect(element: HTMLElement): void {
  if (CSS.supports('backdrop-filter', 'blur(10px)')) {
    element.style.backdropFilter = 'blur(10px) saturate(180%)'
    element.style.background = 'rgba(0, 0, 0, 0.5)'
  } else {
    // Fallback: solid background without blur
    element.style.background = 'rgba(0, 0, 0, 0.85)'
  }
}

/**
 * Browser capability check for minimum requirements
 */
export interface CompatibilityCheck {
  compatible: boolean
  missingFeatures: string[]
  warnings: string[]
}

export function checkBrowserCompatibility(): CompatibilityCheck {
  const missingFeatures: string[] = []
  const warnings: string[] = []

  // Required features
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) {
    missingFeatures.push('Web Audio API')
  }

  if (!('Promise' in window)) {
    missingFeatures.push('Promises')
  }

  if (!('fetch' in window)) {
    missingFeatures.push('Fetch API')
  }

  // Optional features (warnings only)
  if (!('AudioWorklet' in window)) {
    warnings.push('AudioWorklet not supported - using fallback')
  }

  if (!CSS.supports('backdrop-filter', 'blur(10px)')) {
    warnings.push('backdrop-filter not supported - using solid backgrounds')
  }

  if (!('ResizeObserver' in window)) {
    warnings.push('ResizeObserver polyfill will be used')
  }

  return {
    compatible: missingFeatures.length === 0,
    missingFeatures,
    warnings,
  }
}

/**
 * Log compatibility check results
 */
export function logCompatibilityCheck(): void {
  const browser = detectBrowser()
  const compat = checkBrowserCompatibility()

  console.group('[Browser Compatibility]')
  console.log(`Browser: ${browser.name} ${browser.version}`)
  console.log(`Mobile: ${browser.isMobile}`)
  console.log(`Compatible: ${compat.compatible}`)

  if (compat.missingFeatures.length > 0) {
    console.error('Missing features:', compat.missingFeatures)
  }

  if (compat.warnings.length > 0) {
    console.warn('Warnings:', compat.warnings)
  }

  console.groupEnd()
}

// Export browser info for use elsewhere
export const browserInfo = detectBrowser()
