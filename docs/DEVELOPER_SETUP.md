# Vibe Conductor - Developer Setup Guide

This guide walks you through setting up the Vibe Conductor development environment.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Notes |
|------------|---------|-------|
| **Node.js** | 18.x or higher | LTS version recommended |
| **npm** | 9.x or higher | Comes with Node.js |
| **Git** | 2.x or higher | For version control |
| **Modern Browser** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ | Web Audio API support required |

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Expected: v18.x.x or higher

# Check npm version
npm --version
# Expected: 9.x.x or higher

# Check Git version
git --version
```

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vibe-conductor
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- **@strudel/core**, **@strudel/mini**, **@strudel/webaudio** - Audio engine
- **@anthropic-ai/sdk** - AI pattern generation
- **React 19** - UI framework
- **Zustand** - State management
- **Vite** - Build tool and dev server
- **Vitest** - Testing framework

---

## Environment Setup

### API Key Configuration

Vibe Conductor requires an Anthropic API key for AI-powered pattern generation.

#### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

#### 2. Add Your API Key

Edit the `.env` file and add your Anthropic API key:

```env
VITE_ANTHROPIC_API_KEY=your-api-key-here
```

> **Important**: The `VITE_` prefix is required for Vite to expose the variable to the client-side code.

#### 3. Getting an API Key

If you do not have an Anthropic API key:

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

> **Security Note**: Never commit your `.env` file or share your API key. The `.env` file is already in `.gitignore`.

### Optional Environment Variables

```env
# Default model for pattern generation (optional)
VITE_DEFAULT_MODEL=claude-sonnet-4-20250514

# Enable debug logging (optional)
VITE_DEBUG=true
```

---

## Development Server

### Starting the Server

```bash
npm run dev
```

This starts the Vite development server with:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- Automatic TypeScript compilation

### Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

> **Note**: The first time you access the app, you must click or interact with the page to enable audio (browser autoplay policy).

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start development server |
| **build** | `npm run build` | Build for production |
| **preview** | `npm run preview` | Preview production build |
| **lint** | `npm run lint` | Run ESLint |
| **test** | `npm run test` | Run tests in watch mode |
| **test:run** | `npm run test:run` | Run tests once |
| **test:coverage** | `npm run test:coverage` | Run tests with coverage |

---

## Project Structure

```
vibe-conductor/
├── docs/                    # Documentation
├── public/                  # Static assets
├── src/
│   ├── agents/              # AI agents for pattern generation
│   │   ├── specialists/     # Specialized agents (drums, bass, synth, fx)
│   │   └── prompts/         # System prompts for agents
│   ├── components/          # React UI components
│   │   └── visualizers/     # Audio visualizer components
│   ├── engine/              # Strudel audio engine wrapper
│   ├── hooks/               # React hooks
│   ├── samples/             # Sample library and search
│   ├── store/               # Zustand state management
│   ├── test/                # Test utilities and setup
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main application component
│   ├── index.css            # Global styles
│   └── main.tsx             # Application entry point
├── .env.example             # Environment template
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite configuration
```

### Path Aliases

The project uses TypeScript path aliases for cleaner imports:

| Alias | Path |
|-------|------|
| `@/` | `src/` |
| `@/components` | `src/components/` |
| `@/agents` | `src/agents/` |
| `@/hooks` | `src/hooks/` |
| `@/utils` | `src/utils/` |
| `@/engine` | `src/engine/` |
| `@/samples` | `src/samples/` |
| `@/store` | `src/store/` |

Example:
```typescript
import { useStrudel } from '@/hooks'
import { PatternAgent } from '@/agents'
```

---

## Running Tests

### Unit Tests

```bash
# Run all tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run with coverage report
npm run test:coverage
```

### Test Configuration

Tests use Vitest with happy-dom environment. Configuration is in `vite.config.ts`:

```typescript
test: {
  globals: true,
  environment: 'happy-dom',
  setupFiles: ['./src/test/setup.ts'],
}
```

### Writing Tests

Test files should be placed alongside source files or in `__tests__` directories:

```
src/engine/StrudelEngine.ts
src/engine/__tests__/PatternValidator.test.ts
```

---

## Troubleshooting

### Common Issues

#### 1. Audio Not Playing

**Symptom**: No sound when clicking play or submitting prompts.

**Solutions**:
- Click anywhere on the page first (browser autoplay policy)
- Check browser audio permissions
- Ensure system audio is not muted
- Verify browser console for errors

#### 2. API Key Not Working

**Symptom**: "AI not available" or API errors.

**Solutions**:
- Verify `.env` file exists in project root
- Ensure variable uses `VITE_` prefix: `VITE_ANTHROPIC_API_KEY=...`
- Restart the dev server after changing `.env`
- Check API key is valid at console.anthropic.com

#### 3. Module Not Found Errors

**Symptom**: TypeScript or import errors.

**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### 4. TypeScript Errors

**Symptom**: Type errors in IDE or build.

**Solutions**:
- Ensure using TypeScript 5.x or higher
- Run `npm install` to ensure all types are installed
- Check path aliases are configured in `tsconfig.app.json`

#### 5. Development Server Issues

**Symptom**: Dev server crashes or does not start.

**Solutions**:
```bash
# Kill any existing processes on port 5173
lsof -i :5173 | awk 'NR!=1 {print $2}' | xargs kill -9

# Restart dev server
npm run dev
```

### Browser-Specific Issues

#### Safari
- Audio context may suspend when tab is backgrounded
- Ensure user interaction before playing audio

#### Firefox
- Slight audio latency is normal
- AudioWorklet timing may vary

See `docs/BROWSER_COMPATIBILITY.md` for detailed browser support information.

---

## Development Tips

### Hot Reload

Vite provides instant HMR. Save a file and see changes immediately without losing state.

### Console Logging

The application logs to browser console with prefixes:
- `[StrudelEngine]` - Audio engine events
- `[PatternAgent]` - AI generation events
- `[useStrudel]` - Hook lifecycle events

Enable verbose logging:
```typescript
// In browser console
localStorage.setItem('debug', 'true')
```

### Testing AI Generation

For faster iteration without API calls, you can use fallback patterns:

```typescript
// The PatternAgent automatically provides fallback patterns on error
// Prompts like "chill", "dark", "energy", "dream" have keyword-matched fallbacks
```

---

## Next Steps

- Read the [API Reference](./API_REFERENCE.md) for detailed documentation
- Review [Browser Compatibility](./BROWSER_COMPATIBILITY.md) for platform support
- Explore the codebase starting with `src/App.tsx`

---

## Getting Help

If you encounter issues not covered here:

1. Check the browser console for error messages
2. Review existing GitHub issues
3. Create a new issue with:
   - Node.js and npm versions
   - Browser and version
   - Error messages and console output
   - Steps to reproduce
