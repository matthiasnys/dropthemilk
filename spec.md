# Audio Visualizer Project Spec

Build a web-based audio visualizer inspired by Milkdrop/Winamp, using modern web technologies. This is a barebones but functional demo for experimentation.

## Tech Stack

- **React** (with hooks)
- **Three.js** for WebGL rendering
- **Web Audio API** for audio analysis
- **Tailwind CSS** for UI styling
- **Vite** as build tool

## Project Structure

```
audio-visualizer/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   └── AudioVisualizer.jsx
│   ├── shaders/
│   │   ├── fragment.glsl
│   │   └── vertex.glsl
│   └── hooks/
│       └── useAudioAnalyzer.js
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Core Features

### 1. Audio Input Options
- **Microphone input** — capture live audio via `getUserMedia`
- **Audio file upload** — load local MP3/WAV files
- Future: system audio capture (requires browser extension)

### 2. Audio Analysis
Use Web Audio API's `AnalyserNode`:

```javascript
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256; // Lower = faster, less detail. 256-2048 typical
analyser.smoothingTimeConstant = 0.8; // 0-1, higher = smoother

// Get frequency data each frame
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);

// Split into bands
const third = Math.floor(dataArray.length / 3);
const bass = average(dataArray.slice(0, third));           // 0-250Hz roughly
const mid = average(dataArray.slice(third, third * 2));    // 250-2000Hz
const treble = average(dataArray.slice(third * 2));        // 2000Hz+

// Normalize to 0-1
const bassNorm = bass / 255;
```

### 3. Visual Rendering

Use Three.js with a fullscreen shader quad:

```javascript
// Orthographic camera for 2D
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

// Fullscreen quad
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    u_time: { value: 0 },
    u_bass: { value: 0 },
    u_mid: { value: 0 },
    u_treble: { value: 0 },
    u_resolution: { value: new THREE.Vector2() }
  }
});
```

### 4. Fragment Shader

This is where the visual magic happens. Key techniques:

```glsl
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform vec2 u_resolution;

void main() {
    // Normalize coordinates to -1 to 1, centered
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Distance from center
    float dist = length(uv);
    
    // Example: pulsing ring reactive to bass
    float ring = sin(dist * 10.0 - u_time * 2.0 - u_bass * 5.0) * 0.5 + 0.5;
    
    // Color based on audio
    vec3 color = vec3(u_bass, u_mid, u_treble);
    
    gl_FragColor = vec4(color * ring, 1.0);
}
```

**Shader techniques to include:**
- Simplex/Perlin noise for organic movement
- Radial patterns (rings, spirals)
- Color palette mixing based on audio bands
- Glow/bloom effects
- Vignette

### 5. UI Requirements

Minimal overlay UI:
- Start screen with input selection (mic vs file)
- Mic button triggers `getUserMedia`
- File input accepts `audio/*`
- When playing: hide UI, show subtle hint for fullscreen (F11)
- Dark/transparent styling, doesn't distract from visuals

## Animation Loop Structure

```javascript
function animate() {
  requestAnimationFrame(animate);
  
  // Update time
  uniforms.u_time.value = clock.getElapsedTime();
  
  // Get audio data
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate bands with smoothing
    const smoothing = 0.8;
    uniforms.u_bass.value = lerp(uniforms.u_bass.value, calcBass(), 1 - smoothing);
    uniforms.u_mid.value = lerp(uniforms.u_mid.value, calcMid(), 1 - smoothing);
    uniforms.u_treble.value = lerp(uniforms.u_treble.value, calcTreble(), 1 - smoothing);
  }
  
  renderer.render(scene, camera);
}
```

## Nice-to-Have Features (Phase 2)

- [ ] Multiple shader presets with smooth transitions
- [ ] Beat detection (track energy spikes)
- [ ] Keyboard controls (switch presets, toggle UI)
- [ ] Fullscreen API integration
- [ ] FPS counter for performance tuning
- [ ] Export as video (MediaRecorder API)

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.0",
    "vite-plugin-glsl": "^1.2.1"
  }
}
```

## Example Shader: Milkdrop-Style

Here's a complete fragment shader to start with:

```glsl
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform vec2 u_resolution;

// Simplex noise (include full implementation)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    float t = u_time * 0.5 + u_bass * 0.5;
    
    // Layered noise
    float n1 = snoise(uv * 2.0 + t * 0.3);
    float n2 = snoise(uv * 4.0 - t * 0.2 + n1 * 0.5);
    float n3 = snoise(uv * 8.0 + t * 0.1 + n2 * 0.3);
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    noise *= (0.5 + u_bass * 1.5);
    
    // Radial ring
    float dist = length(uv);
    float ring = sin(dist * 10.0 - t * 2.0 - u_bass * 5.0) * 0.5 + 0.5;
    ring *= smoothstep(1.5, 0.0, dist);
    
    // Color palette
    vec3 col1 = vec3(0.1, 0.0, 0.2);  // Deep purple
    vec3 col2 = vec3(0.0, 0.5, 0.8);  // Cyan
    vec3 col3 = vec3(1.0, 0.2, 0.5);  // Pink
    vec3 col4 = vec3(0.0, 1.0, 0.6);  // Mint
    
    vec3 color = mix(col1, col2, noise * 0.5 + 0.5);
    color = mix(color, col3, ring * u_mid);
    color = mix(color, col4, u_treble * 0.5 * (1.0 - dist));
    
    // Center glow
    float glow = exp(-dist * (3.0 - u_bass * 2.0));
    color += vec3(1.0, 0.8, 0.9) * glow * (0.3 + u_bass * 0.7);
    
    // Vignette
    color *= 1.0 - dist * 0.5;
    
    gl_FragColor = vec4(color, 1.0);
}
```

## Resources for Inspiration

- [Shadertoy](https://shadertoy.com) — search "audio reactive"
- [Butterchurn](https://github.com/jberg/butterchurn) — Milkdrop WebGL port
- [The Book of Shaders](https://thebookofshaders.com) — GLSL fundamentals

## Notes

- Test with music that has clear beats (electronic, hip-hop work well)
- The `smoothingTimeConstant` on the analyser affects responsiveness
- Lower `fftSize` = faster response, less frequency detail
- Shaders run per-pixel, keep math efficient for performance