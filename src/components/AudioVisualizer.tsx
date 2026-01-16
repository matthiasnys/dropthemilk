import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import * as THREE from 'three'
import vertexShader from '../shaders/vertex.glsl'
import preset1 from '../shaders/preset1-milkdrop.glsl'
import preset2 from '../shaders/preset2-waveform.glsl'
import preset3 from '../shaders/preset3-kaleidoscope.glsl'
import preset4 from '../shaders/preset4-plasma.glsl'
import preset5 from '../shaders/preset5-particles.glsl'
import preset6 from '../shaders/preset6-geometric.glsl'
import preset7 from '../shaders/preset7-vortex.glsl'
import preset8 from '../shaders/preset8-fire.glsl'
import preset9 from '../shaders/preset9-ocean.glsl'
import preset10 from '../shaders/preset10-electric.glsl'
import preset11 from '../shaders/preset11-aurora.glsl'
import preset12 from '../shaders/preset12-fractal.glsl'
import preset13 from '../shaders/preset13-equalizer.glsl'
import preset14 from '../shaders/preset14-video.glsl'
import { generateTextShader } from '../shaders/textPresetGenerator'

const PRESETS = [
  { name: 'Milkdrop', shader: preset1 },
  { name: 'Neon Tunnel', shader: preset2 },
  { name: 'Kaleidoscope', shader: preset3 },
  { name: 'Retro Plasma', shader: preset4 },
  { name: 'Star Field', shader: preset5 },
  { name: 'Sacred Geometry', shader: preset6 },
  { name: 'Vortex', shader: preset7 },
  { name: 'Inferno', shader: preset8 },
  { name: 'Deep Ocean', shader: preset9 },
  { name: 'Electric Storm', shader: preset10 },
  { name: 'Aurora', shader: preset11 },
  { name: 'Fractal Zoom', shader: preset12 },
  { name: 'Equalizer', shader: preset13 },
  { name: 'Custom Text', shader: null, isTextPreset: true },
  { name: 'Video Reactive', shader: preset14, isVideoPreset: true },
]

interface AudioVisualizerProps {
  bass: number
  mid: number
  treble: number
  analyser: AnalyserNode | null
  dataArray: Uint8Array | null
  onPresetChange?: (name: string, index: number) => void
  customText?: string
  onRequestTextEdit?: () => void
  autoPlay?: boolean
  autoPlayInterval?: number
  onAutoPlayChange?: (enabled: boolean) => void
  videoElement?: HTMLVideoElement | null
  forcePresetIndex?: number
  customShader?: { code: string; name: string } | null
  onClearCustomShader?: () => void
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function average(arr: Uint8Array, start: number, end: number): number {
  let sum = 0
  for (let i = start; i < end; i++) {
    sum += arr[i]
  }
  return sum / (end - start)
}

export function AudioVisualizer({
  analyser,
  dataArray,
  onPresetChange,
  customText = 'Glue.blue',
  onRequestTextEdit,
  autoPlay = false,
  autoPlayInterval = 15000,
  onAutoPlayChange,
  videoElement,
  forcePresetIndex,
  customShader,
  onClearCustomShader,
}: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const clockRef = useRef<THREE.Clock | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const [presetIndex, setPresetIndex] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(autoPlay)
  const currentTextRef = useRef(customText)
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null)

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_bass: { value: 0 },
    u_mid: { value: 0 },
    u_treble: { value: 0 },
    u_beat: { value: 0 },
    u_resolution: { value: new THREE.Vector2() },
    u_video: { value: null as THREE.VideoTexture | null },
  }), [])

  const getShaderForPreset = useCallback((index: number, text: string) => {
    const preset = PRESETS[index]
    if (preset.isTextPreset) {
      return generateTextShader(text)
    }
    return preset.shader!
  }, [])

  const switchPreset = useCallback((index: number, text?: string) => {
    const newIndex = ((index % PRESETS.length) + PRESETS.length) % PRESETS.length
    setPresetIndex(newIndex)

    // Clear any custom AI shader when switching to a normal preset
    onClearCustomShader?.()

    const textToUse = text ?? currentTextRef.current
    onPresetChange?.(PRESETS[newIndex].isTextPreset ? `"${textToUse}"` : PRESETS[newIndex].name, newIndex)

    if (meshRef.current) {
      const newMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: getShaderForPreset(newIndex, textToUse),
        uniforms,
      })
      meshRef.current.material = newMaterial
    }
  }, [uniforms, onPresetChange, getShaderForPreset, onClearCustomShader])

  // Update text when customText prop changes
  useEffect(() => {
    currentTextRef.current = customText
    // If we're on the text preset, regenerate the shader
    if (PRESETS[presetIndex].isTextPreset && meshRef.current) {
      const newMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: generateTextShader(customText),
        uniforms,
      })
      meshRef.current.material = newMaterial
      onPresetChange?.(`"${customText}"`, presetIndex)
    }
  }, [customText, presetIndex, uniforms, onPresetChange])

  // Apply custom shader when it changes
  useEffect(() => {
    if (customShader && meshRef.current) {
      try {
        const newMaterial = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: customShader.code,
          uniforms,
        })
        meshRef.current.material = newMaterial
        onPresetChange?.(`AI: ${customShader.name}`, -1)
      } catch (e) {
        console.error('Failed to compile custom shader:', e)
      }
    }
  }, [customShader, uniforms, onPresetChange])

  // Update video texture when videoElement changes
  useEffect(() => {
    if (videoElement) {
      const videoTexture = new THREE.VideoTexture(videoElement)
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      videoTextureRef.current = videoTexture
      uniforms.u_video.value = videoTexture

      // If we're on the video preset, recreate the material to pick up the texture
      const currentPreset = PRESETS[presetIndex]
      if (currentPreset.isVideoPreset && meshRef.current) {
        const newMaterial = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: currentPreset.shader!,
          uniforms,
        })
        meshRef.current.material = newMaterial
      }
    } else {
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose()
        videoTextureRef.current = null
      }
      uniforms.u_video.value = null
    }
  }, [videoElement, uniforms, presetIndex])

  // Toggle auto-play
  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay(prev => {
      const newValue = !prev
      onAutoPlayChange?.(newValue)
      return newValue
    })
  }, [onAutoPlayChange])

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlay) return

    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * PRESETS.length)
      switchPreset(randomIndex)
    }, autoPlayInterval)

    return () => clearInterval(timer)
  }, [isAutoPlay, autoPlayInterval, switchPreset])

  // Sync with prop changes
  useEffect(() => {
    setIsAutoPlay(autoPlay)
  }, [autoPlay])

  // Force preset switch from parent
  useEffect(() => {
    if (forcePresetIndex !== undefined && forcePresetIndex !== presetIndex) {
      switchPreset(forcePresetIndex)
    }
  }, [forcePresetIndex, presetIndex, switchPreset])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if an input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Number keys 1-9, 0 for 10
      if (e.key >= '0' && e.key <= '9') {
        const index = e.key === '0' ? 9 : parseInt(e.key) - 1
        if (index < PRESETS.length) {
          switchPreset(index)
        }
        return
      }

      // T key to edit text
      if (e.key === 't' || e.key === 'T') {
        onRequestTextEdit?.()
        return
      }

      // A key to toggle auto-play
      if (e.key === 'a' || e.key === 'A') {
        toggleAutoPlay()
        return
      }

      // Arrow keys or brackets
      switch (e.key) {
        case 'ArrowRight':
        case ']':
          switchPreset(presetIndex + 1)
          break
        case 'ArrowLeft':
        case '[':
          switchPreset(presetIndex - 1)
          break
        case ' ':
          e.preventDefault()
          const randomIndex = Math.floor(Math.random() * PRESETS.length)
          switchPreset(randomIndex)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [presetIndex, switchPreset, onRequestTextEdit, toggleAutoPlay])

  useEffect(() => {
    if (!containerRef.current) return

    // Setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight)

    // Fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: getShaderForPreset(presetIndex, currentTextRef.current),
      uniforms,
    })
    const mesh = new THREE.Mesh(geometry, material)
    meshRef.current = mesh
    scene.add(mesh)

    const clock = new THREE.Clock()
    clockRef.current = clock

    // Notify initial preset
    const preset = PRESETS[presetIndex]
    onPresetChange?.(preset.isTextPreset ? `"${currentTextRef.current}"` : preset.name, presetIndex)

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setSize(width, height)
      uniforms.u_resolution.value.set(width, height)
    }
    window.addEventListener('resize', handleResize)

    // Animation loop with beat detection
    const smoothing = 0.15
    const bassHistory: number[] = []
    const BEAT_THRESHOLD = 1.2       // Lowered: more sensitive to peaks
    const BEAT_COOLDOWN = 100        // Lowered: allow faster beats
    const HISTORY_SIZE = 20          // Shorter: faster adaptation
    const MIN_BASS = 0.08            // Lowered: detect quieter beats
    let lastBeatTime = 0
    let beatValue = 0
    let prevBass = 0

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      uniforms.u_time.value = clock.getElapsedTime()

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>)
        const third = Math.floor(dataArray.length / 3)

        const bass = average(dataArray, 0, third) / 255
        const mid = average(dataArray, third, third * 2) / 255
        const treble = average(dataArray, third * 2, dataArray.length) / 255

        uniforms.u_bass.value = lerp(uniforms.u_bass.value, bass, smoothing)
        uniforms.u_mid.value = lerp(uniforms.u_mid.value, mid, smoothing)
        uniforms.u_treble.value = lerp(uniforms.u_treble.value, treble, smoothing)

        // Beat detection - dual method: threshold + derivative
        const now = performance.now()
        bassHistory.push(bass)
        if (bassHistory.length > HISTORY_SIZE) {
          bassHistory.shift()
        }

        const avgBass = bassHistory.length > 0
          ? bassHistory.reduce((a, b) => a + b, 0) / bassHistory.length
          : 0

        // Derivative: sudden increase in bass
        const bassDerivative = bass - prevBass
        prevBass = bass

        // Beat detected if: (threshold exceeded OR sharp increase) AND cooldown passed
        const thresholdBeat = bass > avgBass * BEAT_THRESHOLD && bass > MIN_BASS
        const derivativeBeat = bassDerivative > 0.15 && bass > MIN_BASS  // Sharp rise

        if ((thresholdBeat || derivativeBeat) && now - lastBeatTime > BEAT_COOLDOWN) {
          beatValue = 1.0
          lastBeatTime = now
        }

        beatValue *= 0.88  // Slightly slower decay for more visible flash
        uniforms.u_beat.value = beatValue
      }

      // Update video texture if present
      if (videoTextureRef.current) {
        videoTextureRef.current.needsUpdate = true
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [uniforms, analyser, dataArray])

  return <div ref={containerRef} className="w-full h-full absolute inset-0" />
}

export { PRESETS }
