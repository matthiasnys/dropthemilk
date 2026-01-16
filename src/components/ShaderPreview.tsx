import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import vertexShader from '../shaders/vertex.glsl'

interface ShaderPreviewProps {
  shader: string
  className?: string
}

export function ShaderPreview({ shader, className = '' }: ShaderPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Setup
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const uniforms = {
      u_time: { value: 0 },
      u_bass: { value: 0 },
      u_mid: { value: 0 },
      u_treble: { value: 0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_video: { value: null },
    }

    const geometry = new THREE.PlaneGeometry(2, 2)
    // Fallback shader for when compilation fails
    const fallbackShader = `
      uniform float u_time;
      uniform float u_bass;
      uniform float u_mid;
      uniform float u_treble;
      uniform vec2 u_resolution;
      uniform sampler2D u_video;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec3 color = vec3(0.2 + u_bass * 0.3, 0.1 + u_mid * 0.2, 0.3 + u_treble * 0.2);
        color += 0.1 * sin(u_time + uv.xyx * 10.0);
        gl_FragColor = vec4(color, 1.0);
      }
    `

    let material: THREE.ShaderMaterial

    // Test compile first
    const testShader = renderer.getContext().createShader(renderer.getContext().FRAGMENT_SHADER)
    if (testShader) {
      renderer.getContext().shaderSource(testShader, shader)
      renderer.getContext().compileShader(testShader)
      const success = renderer.getContext().getShaderParameter(testShader, renderer.getContext().COMPILE_STATUS)
      renderer.getContext().deleteShader(testShader)

      if (!success) {
        console.warn('ShaderPreview: Shader failed to compile, using fallback')
        material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: fallbackShader,
          uniforms,
        })
      } else {
        material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader: shader,
          uniforms,
        })
      }
    } else {
      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: fallbackShader,
        uniforms,
      })
    }

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const clock = new THREE.Clock()

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      const t = clock.getElapsedTime()
      uniforms.u_time.value = t

      // Simulate audio levels with oscillating values (higher base for visibility)
      uniforms.u_bass.value = 0.6 + 0.4 * Math.sin(t * 2)
      uniforms.u_mid.value = 0.5 + 0.4 * Math.sin(t * 3 + 1)
      uniforms.u_treble.value = 0.5 + 0.4 * Math.sin(t * 5 + 2)

      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      renderer.setSize(newWidth, newHeight)
      uniforms.u_resolution.value.set(newWidth, newHeight)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [shader])

  return <div ref={containerRef} className={`overflow-hidden ${className}`} />
}
