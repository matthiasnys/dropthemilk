# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-based audio/video visualizer and VJ tool inspired by Milkdrop/Winamp. Captures audio from microphone, audio files, or video files, analyzes frequency bands, and renders reactive visuals using WebGL shaders. Supports video overlay blending with shader effects.

## Build Commands

```bash
pnpm dev      # Start development server (Vite HMR)
pnpm build    # TypeScript compile + Vite production build
pnpm preview  # Preview production build locally
```

No lint or test commands are configured.

## Architecture

**Stack:** React 18 + Three.js + Web Audio API + TypeScript + Tailwind CSS + Vite

**Data Flow:**
1. `useAudioAnalyzer` hook captures audio input (mic/file) and performs FFT analysis
2. Audio split into 3 frequency bands: bass, mid, treble (each normalized 0-1)
3. Beat detection runs on bass energy with adaptive threshold and cooldown
4. `AudioVisualizer` component runs Three.js fullscreen quad with fragment shaders
5. Shader uniforms updated each frame: `u_time`, `u_bass`, `u_mid`, `u_treble`, `u_beat`, `u_resolution`

**Key Files:**
- `src/App.tsx` - Root component: audio mode selection, controls UI, state management
- `src/components/AudioVisualizer.tsx` - Three.js renderer, preset switching, keyboard controls
- `src/hooks/useAudioAnalyzer.ts` - Web Audio API abstraction, frequency band calculation
- `src/shaders/` - 13 preset fragment shaders + dynamic text shader generator

## Shader System

All presets use consistent uniform naming (`u_*` prefix) and coordinate normalization:
```glsl
vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
```

Common techniques: simplex noise, radial patterns, audio-reactive color mixing, glow/bloom via exponential falloff, edge vignette.

`textPresetGenerator.ts` generates custom text overlay shaders using SDF (Signed Distance Field) rendering.

## Keyboard Controls

**Presets:**
- `1-9, 0`: Switch to preset (0 = preset 10)
- `← →` or `[ ]`: Cycle presets
- `Space`: Random preset
- `A`: Toggle auto-play (switches preset every 15s)

**Video Library (VJ Mode):**
- `B`: Toggle video library panel
- `Shift+1-9`: Trigger video from slot
- `Shift+0`: Stop video
- `V`: Toggle video overlay on/off

**Video Playback (when video file loaded):**
- `J`: Seek back 10s
- `K`: Pause/Play
- `L`: Seek forward 10s

**Other:**
- `T`: Edit custom text overlay
- `H`: Show help overlay
- `F11`: Browser fullscreen

## Audio Analysis Settings

- FFT Size: 256 (fast response, less frequency detail)
- FFT Smoothing: 0.5 (lower = sharper transients for beat detection)
- Additional lerp smoothing (0.15) applied in render loop for visual smoothness

**Beat Detection:**
- Dual detection: threshold-based AND derivative-based (sharp rise)
- Adaptive threshold: current bass must exceed rolling average by 1.2x
- Derivative trigger: bass increase > 0.15 in single frame
- Minimum bass threshold: 0.08 to avoid noise triggers
- Cooldown: 100ms between beats (allows fast rhythms)
- History window: 20 frames for rolling average
- FFT smoothing: 0.5 (lower = sharper transients)
- `u_beat` uniform: 0-1 value that pulses to 1.0 on beat, then decays (0.88 per frame)

## Video Library System

The video library (`useVideoLibrary.ts`) uses the File System Access API (Chrome/Edge) to persistently access a folder of video files:

- **Folder persistence**: Selected folder is remembered across sessions via IndexedDB
- **9 video slots**: Load videos into slots, trigger with Shift+1-9
- **Video blending**: All shader presets include `u_video` uniform for screen-blend with video

All shaders blend video using:
```glsl
vec3 video = texture2D(u_video, screenUV).rgb;
float videoPresence = step(0.01, dot(video, vec3(1.0)));
color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);
```

## Beat-Reactive Effects

Use `u_beat` uniform for flash effects on detected beats:
```glsl
// Simple flash overlay
color += vec3(1.0, 0.95, 0.9) * u_beat * 0.5;

// Center-focused pulse
color += vec3(0.8, 0.9, 1.0) * u_beat * exp(-dist * 2.0);

// Combined with existing elements (e.g., make lightning brighter)
color += totalLightning * u_beat * 2.0;
```
