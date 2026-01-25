/**
 * Type declarations for Strudel packages
 *
 * These packages don't ship with TypeScript definitions,
 * so we declare them here to satisfy the TypeScript compiler.
 */

declare module '@strudel/core' {
  export function evalScope(...args: unknown[]): Promise<unknown[]>

  export const controls: Record<string, unknown>

  export interface Pattern {
    fast(amount: number): Pattern
    slow(amount: number): Pattern
    gain(amount: number): Pattern
    s(name: string): Pattern
  }
}

declare module '@strudel/mini' {
  export function miniAllStrings(): void
  export function mini(...strings: string[]): unknown
}

declare module '@strudel/webaudio' {
  export interface WebAudioReplOptions {
    audioContext?: AudioContext
    onToggle?: (started: boolean) => void
    onEvalError?: (error: Error) => void
    beforeEval?: (options: { code: string }) => void
    afterEval?: (options: { code: string; pattern: unknown }) => void
    getTime?: () => number
    defaultOutput?: unknown
  }

  export interface WebAudioRepl {
    evaluate: (code: string, autostart?: boolean) => Promise<unknown>
    start: () => void
    stop: () => void
    pause: () => void
    toggle: () => void
    setCps: (cps: number) => void
    setPattern: (pattern: unknown, autostart?: boolean) => Promise<unknown>
    state: {
      started: boolean
      code: string
      pattern: unknown
      error?: Error
    }
    scheduler: {
      cps: number
      now: () => number
    }
  }

  export function webaudioRepl(options?: WebAudioReplOptions): WebAudioRepl
  export function webaudioOutput(
    hap: unknown,
    deadline: number,
    hapDuration: number,
    cps: number,
    t: number
  ): Promise<void>
}
