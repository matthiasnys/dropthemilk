const SYSTEM_PROMPT = `You are a GLSL shader expert. Generate fragment shaders for an audio visualizer.

Available uniforms (DO NOT declare these, they are already provided):
- uniform float u_time;      // Time in seconds
- uniform float u_bass;      // Bass frequency level (0.0 - 1.0)
- uniform float u_mid;       // Mid frequency level (0.0 - 1.0)
- uniform float u_treble;    // Treble frequency level (0.0 - 1.0)
- uniform vec2 u_resolution; // Screen resolution in pixels
- uniform sampler2D u_video; // Video texture (may be empty)

Your shader MUST:
1. Start with the uniforms declarations exactly as shown above
2. Have a void main() function
3. Output to gl_FragColor
4. Be audio-reactive using u_bass, u_mid, u_treble
5. Use u_time for animation
6. Be visually impressive and creative

Standard coordinate setup (use this pattern):
vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;

For video blending (add at the end before gl_FragColor):
vec3 video = texture2D(u_video, screenUV).rgb;
float videoPresence = step(0.01, dot(video, vec3(1.0)));
color = mix(color, 1.0 - (1.0 - color) * (1.0 - video), videoPresence * 0.7);

Useful functions you can include:
- Simplex/Perlin noise
- Hash functions for randomness
- Rotation matrices
- SDF primitives

IMPORTANT:
- Output ONLY the GLSL code, no explanations or markdown
- Start directly with: uniform float u_time;
- Make sure the shader compiles in WebGL 1.0 (GLSL ES 1.0)
- Use float literals (1.0 not 1, 0.5 not .5)
- Declare all variables before use
- Keep it simple and working, avoid complex raymarching unless asked`

export interface GenerateShaderOptions {
  apiKey: string
  prompt: string
  model?: string
  onProgress?: (attempt: number, maxAttempts: number, status: string) => void
}

export interface GenerateShaderResult {
  success: boolean
  shader?: string
  error?: string
  attempts?: number
}

function extractShaderCode(content: string): string {
  let shader = content

  // Try various code block formats
  const codeBlockPatterns = [
    /```glsl\n?([\s\S]*?)```/i,
    /```GLSL\n?([\s\S]*?)```/i,
    /```frag\n?([\s\S]*?)```/i,
    /```c\n?([\s\S]*?)```/i,
    /```\n?([\s\S]*?)```/,
  ]

  for (const pattern of codeBlockPatterns) {
    const match = shader.match(pattern)
    if (match && match[1]) {
      shader = match[1].trim()
      break
    }
  }

  // If no code block found, try to extract shader by finding uniform declarations
  if (!shader.includes('void main') && !shader.includes('uniform ')) {
    const uniformMatch = shader.match(/((?:precision|uniform)[\s\S]*)/i)
    if (uniformMatch) {
      shader = uniformMatch[1].trim()
    }
  }

  return shader
}

function validateShader(shader: string): { valid: boolean; error?: string } {
  const hasMain = /void\s+main\s*\(\s*\)/.test(shader)
  const hasFragColor = shader.includes('gl_FragColor')

  if (!hasMain || !hasFragColor) {
    const missing = []
    if (!hasMain) missing.push('void main()')
    if (!hasFragColor) missing.push('gl_FragColor')
    return { valid: false, error: `Missing required: ${missing.join(' and ')}` }
  }

  return { valid: true }
}

export async function generateShader(options: GenerateShaderOptions): Promise<GenerateShaderResult> {
  const { apiKey, prompt, model = 'anthropic/claude-sonnet-4', onProgress } = options
  const MAX_RETRIES = 5

  let messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Create a fragment shader for: ${prompt}` }
  ]

  let lastError = ''

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      onProgress?.(attempt + 1, MAX_RETRIES, attempt === 0 ? 'Generating...' : 'Fixing errors...')

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Audio Visualizer - Shader Generator'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      const shader = extractShaderCode(content)

      // Validate structure
      const validation = validateShader(shader)
      if (!validation.valid) {
        lastError = validation.error || 'Invalid shader structure'
        console.warn(`Attempt ${attempt + 1}/${MAX_RETRIES} failed:`, lastError)

        // Add the failed attempt and ask for fix
        messages = [
          ...messages,
          { role: 'assistant', content },
          { role: 'user', content: `This shader has an error: ${lastError}. Please fix it and output ONLY the complete corrected GLSL code.` }
        ]
        continue
      }

      // Try to compile the shader to catch GLSL errors
      const compileError = testCompileShader(shader)
      if (compileError) {
        lastError = compileError
        console.warn(`Attempt ${attempt + 1}/${MAX_RETRIES} compile error:`, lastError)

        messages = [
          ...messages,
          { role: 'assistant', content },
          { role: 'user', content: `This shader failed to compile with error: "${lastError}". Please fix the GLSL error and output ONLY the complete corrected code.` }
        ]
        continue
      }

      // Success!
      return { success: true, shader, attempts: attempt + 1 }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'

      // For API errors, don't retry
      if (lastError.includes('API error') || lastError.includes('401') || lastError.includes('403')) {
        return { success: false, error: lastError, attempts: attempt + 1 }
      }
    }
  }

  return {
    success: false,
    error: `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`,
    attempts: MAX_RETRIES
  }
}

// Test compile shader using WebGL to catch GLSL errors
function testCompileShader(fragmentShader: string): string | null {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  if (!gl) return null

  const shader = gl.createShader(gl.FRAGMENT_SHADER)
  if (!shader) return null

  gl.shaderSource(shader, fragmentShader)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || 'Unknown compile error'
    gl.deleteShader(shader)
    return error
  }

  gl.deleteShader(shader)
  return null
}

// Store API key in localStorage
export function saveApiKey(key: string): void {
  localStorage.setItem('openrouter_api_key', key)
}

export function getApiKey(): string | null {
  return localStorage.getItem('openrouter_api_key')
}

export function clearApiKey(): void {
  localStorage.removeItem('openrouter_api_key')
}
