# Toastr Strudel

An AI-powered live music generation app that translates natural language prompts into playable electronic music using [Strudel](https://strudel.cc/).

## Features

- **Natural Language to Music**: Describe the vibe you want ("deep house groove", "dark ambient textures", "energetic techno") and AI generates playable Strudel patterns
- **Evolution Mode**: After your first prompt sets the vibe, all subsequent prompts evolve the current pattern rather than replacing it
- **Live Visualizers**: Four visualization modes - Waveform, Spectrum, Particle, and Code view
- **Real-time Audio**: Patterns play immediately with Web Audio API
- **Music Theory Aware**: AI understands voice leading, harmonic progressions, groove, and dynamics

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/eschnei/toastrStrudel.git
   cd toastrStrudel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Add your Anthropic API key to `.env`:
   ```
   VITE_ANTHROPIC_API_KEY=your_api_key_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:5173 in your browser

### Usage

1. Click anywhere on the visualizer to initialize audio
2. Type a prompt describing the music you want (e.g., "chill lo-fi beats")
3. Press Enter or click the play button
4. Use follow-up prompts to evolve the pattern ("add hi-hats", "make it darker", "more energy")

### Visualizer Modes

Hover over the visualizer area to see the mode selector (top-right corner):
- **Wave**: Oscilloscope waveform display
- **Spectrum**: Frequency spectrum bars
- **Particle**: Audio-reactive particle system
- **Code**: Live Strudel code view with syntax highlighting

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Audio**: Strudel.js (live coding music library)
- **AI**: Claude API (Anthropic)
- **State**: Zustand
- **Styling**: CSS Modules

## Project Structure

```
src/
├── agents/           # AI agents for pattern generation
│   ├── PatternAgent.ts       # Main pattern generation
│   ├── prompts/              # System prompts with music theory
│   └── specialists/          # Drums, Bass, Synth, FX agents
├── components/       # React components
│   └── visualizers/          # Audio visualization modes
├── engine/           # Strudel audio engine wrapper
├── hooks/            # React hooks
├── store/            # Zustand state management
└── utils/            # Utility functions
```

## Architecture

### Evolution Mode

The app uses an "evolution-based" architecture:
1. **First prompt**: Creates a fresh pattern that sets the initial vibe
2. **Subsequent prompts**: Always evolve the current pattern, preserving the core identity while adding/modifying elements

This ensures you never lose your vibe - every change builds on what's already playing.

### AI Pattern Generation

The PatternAgent uses Claude with comprehensive music theory knowledge:
- Voice leading for smooth note transitions
- Harmonic progressions for emotional journeys
- Groove and micro-timing for human feel
- Genre-specific patterns and conventions

## Development

```bash
# Run development server
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Run tests
npm test
```

## License

MIT

## Acknowledgments

- [Strudel](https://strudel.cc/) - The amazing live coding music library
- [Anthropic](https://anthropic.com/) - Claude AI for pattern generation
