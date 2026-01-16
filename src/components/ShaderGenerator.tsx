import { useState, useRef, useEffect } from 'react'
import { generateShader, saveApiKey, getApiKey, clearApiKey } from '../services/shaderGenerator'
import { ShaderPreview } from './ShaderPreview'

interface GeneratedShader {
  code: string
  prompt: string
  timestamp: number
}

interface ShaderGeneratorProps {
  isVisible: boolean
  onClose: () => void
  onShaderGenerated: (shader: string, prompt: string) => void
  currentShader?: { code: string; name: string } | null
}

type ViewMode = 'generate' | 'history' | 'preview'

// Store generated shaders in localStorage
function saveShaderHistory(shaders: GeneratedShader[]) {
  localStorage.setItem('generated_shaders', JSON.stringify(shaders.slice(0, 20))) // Keep last 20
}

function loadShaderHistory(): GeneratedShader[] {
  try {
    const data = localStorage.getItem('generated_shaders')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function downloadShader(shader: GeneratedShader) {
  const safeName = shader.prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
  const filename = `shader-${safeName}-${new Date(shader.timestamp).toISOString().slice(0, 10)}.glsl`

  const header = `// AI Generated Shader
// Prompt: ${shader.prompt}
// Generated: ${new Date(shader.timestamp).toISOString()}
//
// Available uniforms:
// - u_time: float (time in seconds)
// - u_bass: float (0.0 - 1.0)
// - u_mid: float (0.0 - 1.0)
// - u_treble: float (0.0 - 1.0)
// - u_resolution: vec2 (screen size)
// - u_video: sampler2D (video texture)

`
  const content = header + shader.code
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ShaderGenerator({ isVisible, onClose, onShaderGenerated, currentShader }: ShaderGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [apiKey, setApiKey] = useState(() => getApiKey() || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shaderHistory, setShaderHistory] = useState<GeneratedShader[]>(() => loadShaderHistory())
  const [viewMode, setViewMode] = useState<ViewMode>('generate')
  const [previewShader, setPreviewShader] = useState<GeneratedShader | null>(null)
  const promptInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Focus prompt input when shown
  useEffect(() => {
    if (isVisible && promptInputRef.current && viewMode === 'generate') {
      promptInputRef.current.focus()
    }
  }, [isVisible, viewMode])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }
    if (!apiKey.trim()) {
      setError('Please enter your OpenRouter API key')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationStatus('Generating...')

    try {
      const result = await generateShader({
        apiKey: apiKey.trim(),
        prompt: prompt.trim(),
        onProgress: (attempt, max, status) => {
          setGenerationStatus(`${status} (attempt ${attempt}/${max})`)
        }
      })

      if (result.success && result.shader) {
        saveApiKey(apiKey.trim())

        // Add to history
        const newShader: GeneratedShader = {
          code: result.shader,
          prompt: prompt.trim(),
          timestamp: Date.now(),
        }
        const newHistory = [newShader, ...shaderHistory]
        setShaderHistory(newHistory)
        saveShaderHistory(newHistory)

        // Show preview instead of immediately applying
        setPreviewShader(newShader)
        setViewMode('preview')
      } else {
        setError(result.error || 'Failed to generate shader')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClearApiKey = () => {
    clearApiKey()
    setApiKey('')
  }

  const handleLoadFromHistory = (shader: GeneratedShader) => {
    setPreviewShader(shader)
    setViewMode('preview')
  }

  const handleApplyShader = () => {
    if (previewShader) {
      onShaderGenerated(previewShader.code, previewShader.prompt)
      onClose()
    }
  }

  const handleBackFromPreview = () => {
    setViewMode('generate')
    setPreviewShader(null)
  }

  const handleDeleteFromHistory = (index: number) => {
    const newHistory = shaderHistory.filter((_, i) => i !== index)
    setShaderHistory(newHistory)
    saveShaderHistory(newHistory)
  }

  const handleLoadFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()

      // Extract prompt from header if present
      const promptMatch = text.match(/\/\/ Prompt: (.+)/i)
      const extractedPrompt = promptMatch ? promptMatch[1] : file.name.replace('.glsl', '')

      // Remove header comments to get just the shader code
      const codeLines = text.split('\n')
      let codeStart = 0
      for (let i = 0; i < codeLines.length; i++) {
        if (codeLines[i].startsWith('uniform ') || codeLines[i].startsWith('precision ') || codeLines[i].startsWith('#')) {
          codeStart = i
          break
        }
      }
      const shaderCode = codeLines.slice(codeStart).join('\n')

      onShaderGenerated(shaderCode || text, extractedPrompt)
      onClose()
    } catch (err) {
      setError('Failed to load shader file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const examplePrompts = [
    'Flowing liquid metal with rainbow reflections',
    'Cosmic nebula with swirling galaxies',
    'Digital rain matrix effect',
    'Geometric crystals that pulse with bass',
    'Underwater caustics with jellyfish',
    'Cyberpunk city grid with neon lights',
  ]

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Shader Generator
          </h2>
          <div className="flex items-center gap-2">
            {viewMode === 'preview' ? (
              <button
                onClick={handleBackFromPreview}
                className="px-3 py-1 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
              >
                Back
              </button>
            ) : (
              <button
                onClick={() => setViewMode(viewMode === 'history' ? 'generate' : 'history')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  viewMode === 'history'
                    ? 'bg-purple-500/30 text-purple-300'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                }`}
              >
                {viewMode === 'history' ? 'New' : `History (${shaderHistory.length})`}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {viewMode === 'preview' && previewShader ? (
          // Preview View
          <div className="flex-1 flex flex-col">
            <div className="flex-1 rounded-xl overflow-hidden border border-gray-700 mb-4">
              <ShaderPreview shader={previewShader.code} className="w-full h-64" />
            </div>
            <div className="p-3 bg-gray-800 rounded-lg mb-4">
              <p className="text-gray-400 text-xs mb-1">Prompt:</p>
              <p className="text-white text-sm">{previewShader.prompt}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBackFromPreview}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => downloadShader(previewShader)}
                className="py-3 px-4 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-xl transition-colors"
                title="Download .glsl file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={handleApplyShader}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-colors"
              >
                Apply Shader
              </button>
            </div>
            <p className="text-gray-500 text-xs text-center mt-3">
              Audio levels are simulated in preview
            </p>
          </div>
        ) : viewMode === 'history' ? (
          // History View
          <div className="flex-1 overflow-y-auto">
            {shaderHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No generated shaders yet</p>
                <p className="text-sm mt-2">Generate your first shader or load from a file</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shaderHistory.map((shader, i) => (
                  <div
                    key={shader.timestamp}
                    className="p-3 bg-gray-800 rounded-lg hover:bg-gray-750 group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{shader.prompt}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(shader.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleLoadFromHistory(shader)}
                          className="p-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded"
                          title="Use this shader"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => downloadShader(shader)}
                          className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded"
                          title="Download .glsl file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteFromHistory(i)}
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load from file button */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Load .glsl file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glsl,.frag,.fs,.txt"
                onChange={handleLoadFromFile}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          // Generate View
          <>
            {/* API Key Section */}
            <div className="mb-4 p-4 bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-300 text-sm font-medium">OpenRouter API Key</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-500 hover:text-gray-300 text-xs"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                  {apiKey && (
                    <button
                      onClick={handleClearApiKey}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-gray-500 text-xs mt-1">
                Get your API key at{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            {/* Prompt Section */}
            <div className="mb-4">
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Describe your shader
              </label>
              <textarea
                ref={promptInputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A swirling galaxy with stars that pulse to the bass..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    handleGenerate()
                  }
                }}
              />
              <p className="text-gray-500 text-xs mt-1">
                Tip: Be specific about colors, movement, and how it should react to audio (bass, mid, treble)
              </p>
            </div>

            {/* Example Prompts */}
            <div className="mb-4">
              <p className="text-gray-500 text-xs mb-2">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs rounded-lg transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !apiKey.trim()}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isGenerating || !prompt.trim() || !apiKey.trim()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {generationStatus || 'Generating...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Shader
                </>
              )}
            </button>

            {/* Current Shader Info */}
            {currentShader && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Current AI shader:</p>
                  <p className="text-purple-300 text-sm truncate">{currentShader.name}</p>
                </div>
                <button
                  onClick={() => downloadShader({
                    code: currentShader.code,
                    prompt: currentShader.name,
                    timestamp: Date.now()
                  })}
                  className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg"
                  title="Download current shader"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            )}

            {/* Keyboard Shortcut */}
            <p className="text-gray-600 text-xs text-center mt-4">
              Press <span className="text-gray-500">Cmd+Enter</span> to generate
            </p>
          </>
        )}
      </div>
    </div>
  )
}
