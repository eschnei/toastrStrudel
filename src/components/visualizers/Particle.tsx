/**
 * Particle Visualizer Component
 *
 * Frequency-reactive particle system with Canvas-based rendering.
 * Particles react to different frequency bands with optimized performance.
 *
 * @references Section 7.6 Visualizer Options
 */

import { useEffect, useRef, useCallback } from 'react'
import styles from './Particle.module.css'

export interface ParticleProps {
  /** Web Audio AnalyserNode to read frequency data from */
  analyserNode: AnalyserNode | null
  /** Whether the visualizer is active (playing) */
  isActive?: boolean
  /** Base particle count (actual count scales with energy) */
  baseParticleCount?: number
  /** Maximum particle count */
  maxParticles?: number
  /** Particle base size */
  particleSize?: number
  /** Enable particle trails */
  enableTrails?: boolean
  /** Trail length (0-1) */
  trailLength?: number
  /** Color scheme */
  colorScheme?: 'frequency' | 'energy' | 'rainbow' | 'monochrome'
  /** Glow intensity (0-1) */
  glowIntensity?: number
}

/** Particle state */
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  color: string
  alpha: number
  frequencyBand: 'bass' | 'mid' | 'high'
}

/** Frequency band colors */
const BAND_COLORS = {
  bass: '#ef4444',    // Red
  mid: '#f59e0b',     // Orange
  high: '#6366f1',    // Indigo
}

/**
 * Create a new particle
 */
function createParticle(
  width: number,
  height: number,
  frequencyBand: Particle['frequencyBand'],
  energy: number
): Particle {
  const centerX = width / 2
  const centerY = height / 2

  // Spawn from center with random direction
  const angle = Math.random() * Math.PI * 2
  const speed = (0.5 + Math.random() * 2) * (1 + energy * 2)

  return {
    x: centerX + (Math.random() - 0.5) * 50,
    y: centerY + (Math.random() - 0.5) * 50,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 2 + Math.random() * 4 * (1 + energy),
    life: 1,
    maxLife: 60 + Math.random() * 120, // Frames
    color: BAND_COLORS[frequencyBand],
    alpha: 0.6 + Math.random() * 0.4,
    frequencyBand,
  }
}

/**
 * Update a particle's position and state
 */
function updateParticle(particle: Particle, energy: number): boolean {
  // Apply velocity
  particle.x += particle.vx * (1 + energy * 0.5)
  particle.y += particle.vy * (1 + energy * 0.5)

  // Apply subtle gravity toward center (creates swirl effect)
  const centerForce = 0.002
  particle.vx -= particle.x < 0 ? -centerForce : centerForce
  particle.vy -= particle.y < 0 ? -centerForce : centerForce

  // Apply friction
  particle.vx *= 0.99
  particle.vy *= 0.99

  // Decrease life
  particle.life -= 1 / particle.maxLife

  // Update alpha based on life
  particle.alpha = particle.life * 0.8

  // Return false if particle should be removed
  return particle.life > 0
}

/**
 * Particle visualizer - frequency-reactive particle system
 */
export function Particle({
  analyserNode,
  isActive = false,
  baseParticleCount = 50,
  maxParticles = 200,
  particleSize = 3,
  enableTrails = true,
  trailLength = 0.15,
  colorScheme = 'frequency',
  glowIntensity = 0.6,
}: ParticleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const lastFrameTimeRef = useRef<number>(0)

  /**
   * Get average energy for a frequency range
   */
  const getFrequencyEnergy = useCallback(
    (data: Uint8Array<ArrayBufferLike>, startPercent: number, endPercent: number): number => {
      const start = Math.floor(data.length * startPercent)
      const end = Math.floor(data.length * endPercent)
      let sum = 0
      for (let i = start; i < end; i++) {
        sum += data[i]
      }
      return sum / ((end - start) * 255)
    },
    []
  )

  /**
   * Draw the particles on the canvas
   */
  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      // Calculate delta time for consistent animation
      const deltaTime = timestamp - lastFrameTimeRef.current
      lastFrameTimeRef.current = timestamp

      // Apply trail effect or clear
      if (enableTrails && isActive) {
        ctx.fillStyle = `rgba(10, 10, 15, ${1 - trailLength})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      let bassEnergy = 0
      let midEnergy = 0
      let highEnergy = 0
      let totalEnergy = 0

      // Get frequency data
      if (analyserNode && dataArrayRef.current && isActive) {
        analyserNode.getByteFrequencyData(dataArrayRef.current)

        // Calculate energy for each band
        bassEnergy = getFrequencyEnergy(dataArrayRef.current, 0, 0.15)
        midEnergy = getFrequencyEnergy(dataArrayRef.current, 0.15, 0.5)
        highEnergy = getFrequencyEnergy(dataArrayRef.current, 0.5, 1.0)
        totalEnergy = (bassEnergy + midEnergy + highEnergy) / 3

        // Spawn new particles based on energy
        const targetCount = Math.floor(baseParticleCount + totalEnergy * maxParticles)
        const particlesToSpawn = Math.min(
          5, // Max spawn per frame
          targetCount - particlesRef.current.length
        )

        for (let i = 0; i < particlesToSpawn; i++) {
          // Determine which band to spawn for based on energy distribution
          const rand = Math.random()
          const totalBandEnergy = bassEnergy + midEnergy + highEnergy
          let band: Particle['frequencyBand']

          if (rand < bassEnergy / totalBandEnergy) {
            band = 'bass'
          } else if (rand < (bassEnergy + midEnergy) / totalBandEnergy) {
            band = 'mid'
          } else {
            band = 'high'
          }

          particlesRef.current.push(createParticle(width, height, band, totalEnergy))
        }
      }

      // Update and draw particles
      const particles = particlesRef.current

      // Set up glow effect
      if (glowIntensity > 0) {
        ctx.shadowBlur = 10 * glowIntensity
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]

        // Get energy for this particle's frequency band
        let bandEnergy = 0
        if (isActive) {
          switch (particle.frequencyBand) {
            case 'bass':
              bandEnergy = bassEnergy
              break
            case 'mid':
              bandEnergy = midEnergy
              break
            case 'high':
              bandEnergy = highEnergy
              break
          }
        }

        // Update particle
        const alive = updateParticle(particle, bandEnergy)

        if (!alive) {
          // Remove dead particle
          particles.splice(i, 1)
          continue
        }

        // Get color based on scheme
        let color = particle.color
        if (colorScheme === 'energy') {
          const hue = 200 - totalEnergy * 160 // Blue to red
          color = `hsl(${hue}, 70%, 60%)`
        } else if (colorScheme === 'rainbow') {
          const hue = ((particle.x + particle.y) % 360)
          color = `hsl(${hue}, 70%, 60%)`
        } else if (colorScheme === 'monochrome') {
          color = '#6366f1'
        }

        // Set shadow color for glow
        ctx.shadowColor = color

        // Draw particle
        const size = particle.size * particleSize * (0.5 + bandEnergy * 0.5)

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = particle.alpha
        ctx.fill()
      }

      // Reset context state
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // Draw idle state if not active
      if (!isActive) {
        // Ambient particles
        const time = Date.now() / 1000

        for (let i = 0; i < 20; i++) {
          const phase = (i / 20) * Math.PI * 2
          const x = width / 2 + Math.cos(time * 0.3 + phase) * (100 + i * 5)
          const y = height / 2 + Math.sin(time * 0.3 + phase) * (100 + i * 5)
          const size = 2 + Math.sin(time + i) * 1

          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(99, 102, 241, ${0.2 + Math.sin(time + i) * 0.1})`
          ctx.fill()
        }
      }

      // Continue animation loop
      animationRef.current = requestAnimationFrame(draw)
    },
    [
      analyserNode,
      isActive,
      baseParticleCount,
      maxParticles,
      particleSize,
      enableTrails,
      trailLength,
      colorScheme,
      glowIntensity,
      getFrequencyEnergy,
    ]
  )

  /**
   * Initialize canvas and analyser data array
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set up high-DPI canvas
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Set up analyser data array
    if (analyserNode) {
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount)
    }

    // Initialize some ambient particles
    const rect = canvas.getBoundingClientRect()
    particlesRef.current = []
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push(
        createParticle(rect.width, rect.height, 'mid', 0.2)
      )
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [analyserNode])

  /**
   * Start/stop animation loop
   */
  useEffect(() => {
    lastFrameTimeRef.current = performance.now()
    animationRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [draw])

  /**
   * Clear particles when becoming inactive
   */
  useEffect(() => {
    if (!isActive) {
      // Gradually fade out particles
      particlesRef.current.forEach(p => {
        p.maxLife = Math.min(p.maxLife, 30)
      })
    }
  }, [isActive])

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
