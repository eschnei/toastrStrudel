/**
 * Vibe Conductor - Backend API Proxy Server
 *
 * Provides secure API key handling for production deployment.
 * Features:
 * - Claude API proxy with server-side key storage
 * - Rate limiting to prevent abuse
 * - CORS configuration for frontend access
 * - Request validation and sanitization
 *
 * @references SEC-001, NFR-017
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'

// Load environment variables
config()

const app = express()
const PORT = process.env.PORT || 3001

// ============================================================================
// Configuration
// ============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is required')
  console.error('Set it in .env file or as an environment variable')
  process.exit(1)
}

// Initialize Anthropic client (server-side only)
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
})

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:5173',      // Vite dev server
  'http://localhost:4173',      // Vite preview
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  process.env.FRONTEND_URL,     // Production frontend URL
].filter(Boolean)

// ============================================================================
// Middleware
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Handled by frontend
  crossOriginEmbedderPolicy: false,
}))

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }

    console.warn(`CORS blocked origin: ${origin}`)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
}))

// Parse JSON bodies
app.use(express.json({ limit: '100kb' }))

// Rate limiting - 30 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again in a minute.',
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind a proxy
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip
  },
})

// Apply rate limiting to API routes
app.use('/api/', apiLimiter)

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
    next()
  })
}

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Validate message generation request
 */
function validateMessageRequest(body) {
  const errors = []

  // Check for required fields
  if (!body.messages || !Array.isArray(body.messages)) {
    errors.push('messages array is required')
  } else {
    // Validate message structure
    for (let i = 0; i < body.messages.length; i++) {
      const msg = body.messages[i]
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        errors.push(`messages[${i}].role must be 'user' or 'assistant'`)
      }
      if (!msg.content || typeof msg.content !== 'string') {
        errors.push(`messages[${i}].content must be a non-empty string`)
      }
      // Content length limit (prevent abuse)
      if (msg.content && msg.content.length > 10000) {
        errors.push(`messages[${i}].content exceeds maximum length of 10000 characters`)
      }
    }
  }

  // Validate optional fields
  if (body.system && typeof body.system !== 'string') {
    errors.push('system must be a string')
  }
  if (body.system && body.system.length > 20000) {
    errors.push('system prompt exceeds maximum length of 20000 characters')
  }

  if (body.max_tokens !== undefined) {
    if (typeof body.max_tokens !== 'number' || body.max_tokens < 1 || body.max_tokens > 4096) {
      errors.push('max_tokens must be a number between 1 and 4096')
    }
  }

  if (body.temperature !== undefined) {
    if (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 1) {
      errors.push('temperature must be a number between 0 and 1')
    }
  }

  return errors
}

// ============================================================================
// API Routes
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

/**
 * Claude API proxy endpoint
 * Accepts message generation requests and forwards to Anthropic API
 */
app.post('/api/claude/messages', async (req, res) => {
  try {
    // Validate request
    const validationErrors = validateMessageRequest(req.body)
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      })
    }

    const {
      messages,
      system,
      max_tokens = 1024,
      temperature = 0.8,
      model = 'claude-sonnet-4-20250514',
    } = req.body

    // Validate model is allowed (prevent cost abuse)
    const allowedModels = [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
    ]
    if (!allowedModels.includes(model)) {
      return res.status(400).json({
        error: 'Invalid model',
        message: `Model must be one of: ${allowedModels.join(', ')}`,
      })
    }

    console.log(`[API] Generating with model=${model}, messages=${messages.length}`)

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      system,
      messages,
    })

    // Return the response
    res.json({
      id: response.id,
      type: response.type,
      role: response.role,
      content: response.content,
      model: response.model,
      stop_reason: response.stop_reason,
      usage: response.usage,
    })

  } catch (error) {
    console.error('[API] Claude error:', error.message)

    // Handle specific Anthropic errors
    if (error.status === 401) {
      return res.status(500).json({
        error: 'API configuration error',
        message: 'Server API key is invalid or expired',
      })
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Anthropic API rate limit reached. Please try again later.',
      })
    }

    if (error.status === 400) {
      return res.status(400).json({
        error: 'Bad request',
        message: error.message,
      })
    }

    // Generic error
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred processing your request'
        : error.message,
    })
  }
})

/**
 * Check API availability
 */
app.get('/api/claude/status', async (req, res) => {
  try {
    // Simple test call to check API is working
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    })

    res.json({
      status: 'available',
      model: response.model,
    })
  } catch (error) {
    res.json({
      status: 'unavailable',
      error: error.message,
    })
  }
})

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Cross-origin request blocked',
    })
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  })
})

// ============================================================================
// Server Start
// ============================================================================

app.listen(PORT, () => {
  console.log(`
========================================
  Vibe Conductor API Server
========================================

  Server running at: http://localhost:${PORT}

  Endpoints:
    GET  /api/health         - Health check
    GET  /api/claude/status  - Check API availability
    POST /api/claude/messages - Generate Claude response

  Configuration:
    Allowed origins: ${ALLOWED_ORIGINS.join(', ')}
    Rate limit: 30 requests/minute per IP

  Environment:
    NODE_ENV: ${process.env.NODE_ENV || 'development'}
    API Key: ${ANTHROPIC_API_KEY ? 'Set (' + ANTHROPIC_API_KEY.slice(0, 10) + '...)' : 'NOT SET'}

========================================
`)
})

export default app
