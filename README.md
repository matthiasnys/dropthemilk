# Drop the Milk

A web-based audio/video visualizer and VJ tool inspired by **[Milkdrop](https://en.wikipedia.org/wiki/MilkDrop)**, the legendary music visualization plugin for **[Winamp](https://en.wikipedia.org/wiki/Winamp)**. Captures audio from microphone, audio files, or video files, analyzes frequency bands, and renders reactive visuals using WebGL shaders.

Milkdrop, created by Ryan Geiss, was one of the most beloved music visualizers of the early 2000s, known for its psychedelic, beat-reactive visuals. This project brings that spirit to the modern web with additional VJing capabilities.

![React](https://img.shields.io/badge/React-18-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.160-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)

## Features

- **Multiple Audio Sources**: Microphone input, audio file playback, or video file playback with audio analysis
- **15 Visual Presets**: Milkdrop-style reactive shaders including kaleidoscope, plasma, fractals, aurora, and more
- **Beat Detection**: Dual-method detection (threshold + derivative) for responsive flash effects
- **Video Library (VJ Mode)**: Load a folder of videos, trigger clips with hotkeys for live VJing
- **AI Shader Generator**: Generate custom shaders using natural language prompts via OpenRouter API
- **Custom Text Overlay**: SDF-rendered text that reacts to audio
- **Auto-Play Mode**: Automatically cycles through presets

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Modern browser with WebGL support (Chrome, Firefox, Edge, Safari)
- Microphone access (for mic input mode)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dropthemilk.git
cd dropthemilk

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Build for Production

```bash
pnpm build
pnpm preview
```

## Usage

1. Open the app in your browser (default: http://localhost:5173)
2. Choose an audio source:
   - **Microphone**: Visualize live audio input
   - **Audio File**: Load MP3/WAV files
   - **Video File**: Load video with audio analysis
3. Use keyboard controls to switch presets and adjust settings
4. Press **F11** for fullscreen experience

## Keyboard Controls

### Presets
| Key | Action |
|-----|--------|
| `1-9, 0` | Switch to preset (0 = preset 10) |
| `← →` or `[ ]` | Cycle through presets |
| `Space` | Random preset |
| `A` | Toggle auto-play (15s intervals) |

### Video Library (VJ Mode)
| Key | Action |
|-----|--------|
| `B` | Toggle video library panel |
| `Shift+1-9` | Trigger video from slot |
| `Shift+0` | Stop video |
| `V` | Toggle video overlay on/off |

### Video Playback (when video file loaded)
| Key | Action |
|-----|--------|
| `J` | Seek back 10s |
| `K` | Pause/Play |
| `L` | Seek forward 10s |

### Other
| Key | Action |
|-----|--------|
| `T` | Edit custom text overlay |
| `G` | Open AI Shader Generator |
| `H` | Show/hide help overlay |
| `F11` | Browser fullscreen |

## Visual Presets

1. **Milkdrop** - Classic layered noise with radial rings
2. **Neon Tunnel** - Infinite tunnel with neon rings
3. **Kaleidoscope** - Symmetric patterns with rotating mirrors
4. **Retro Plasma** - Old-school plasma effect
5. **Star Field** - Particle starfield with depth
6. **Sacred Geometry** - Geometric patterns
7. **Vortex** - Swirling spiral patterns
8. **Inferno** - Fire simulation
9. **Deep Ocean** - Underwater caustics
10. **Electric Storm** - Lightning and electrical effects
11. **Aurora** - Northern lights simulation
12. **Fractal Zoom** - Infinite fractal patterns
13. **Equalizer** - Bar-style frequency visualization
14. **Custom Text** - Your text rendered with SDF
15. **Video Reactive** - Blend video with shader effects

## Architecture

```
src/
├── App.tsx                    # Root component, state management
├── components/
│   ├── AudioVisualizer.tsx    # Three.js renderer, preset system
│   ├── VideoLibrary.tsx       # VJ video slot management
│   └── ShaderGenerator.tsx    # AI shader generation UI
├── hooks/
│   ├── useAudioAnalyzer.ts    # Web Audio API, FFT analysis
│   └── useVideoLibrary.ts     # File System Access API
├── services/
│   └── shaderGenerator.ts     # OpenRouter API integration
└── shaders/
    ├── vertex.glsl            # Shared vertex shader
    ├── preset*.glsl           # Fragment shader presets
    └── textPresetGenerator.ts # Dynamic SDF text shader
```

### Data Flow

1. `useAudioAnalyzer` captures audio and performs FFT analysis
2. Audio split into 3 frequency bands: bass, mid, treble (normalized 0-1)
3. Beat detection runs on bass energy with adaptive threshold
4. `AudioVisualizer` updates shader uniforms each frame
5. Fragment shaders render audio-reactive visuals

### Shader Uniforms

All presets receive these uniforms:
- `u_time` - Elapsed time in seconds
- `u_bass` - Bass frequency energy (0-1)
- `u_mid` - Mid frequency energy (0-1)
- `u_treble` - Treble frequency energy (0-1)
- `u_beat` - Beat pulse value (0-1, decays after beat)
- `u_resolution` - Viewport dimensions
- `u_video` - Video texture (when available)

## AI Shader Generator

Press `G` to open the AI Shader Generator. Enter a natural language description of the visual effect you want, and the system will generate a custom GLSL fragment shader.

**Requirements**: An OpenRouter API key (stored locally in your browser)

**Example prompts**:
- "A swirling galaxy with stars that pulse to the beat"
- "Neon grid with waves that respond to bass"
- "Psychedelic melting colors"

## Video Library (VJ Mode)

The video library uses the File System Access API to persistently access a folder of video files:

1. Press `B` to open the library panel
2. Select a folder containing video files
3. Assign videos to slots (1-9)
4. Trigger videos with `Shift+1-9` during performances
5. Videos blend with the current shader preset

**Note**: Folder access is remembered across sessions (Chrome/Edge only)

## Tech Stack

- **React 18** - UI framework with hooks
- **Three.js** - WebGL rendering
- **Web Audio API** - Audio capture and FFT analysis
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tooling with HMR
- **vite-plugin-glsl** - GLSL shader imports

## Performance Tips

- Use a modern GPU for best performance
- Lower browser window size for higher frame rates
- The FFT size (256) is optimized for fast response
- Beat detection cooldown allows up to 10 beats/second

## License

MIT - This code is provided **as is**, publicly available for anyone to use, modify, and distribute. No warranty is provided.

## Acknowledgments

- Inspired by [Milkdrop](https://en.wikipedia.org/wiki/MilkDrop) and [Butterchurn](https://github.com/jberg/butterchurn)
- Shader techniques from [The Book of Shaders](https://thebookofshaders.com) and [Shadertoy](https://shadertoy.com)
