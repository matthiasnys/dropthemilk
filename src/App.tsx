import { useRef, useState, useEffect } from 'react'
import { AudioVisualizer, PRESETS } from './components/AudioVisualizer'
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer'
import { VideoLibrary } from './components/VideoLibrary'
import { useVideoLibrary } from './hooks/useVideoLibrary'
import { ShaderGenerator } from './components/ShaderGenerator'

type InputMode = 'none' | 'mic' | 'file' | 'video'

function App() {
  const [mode, setMode] = useState<InputMode>('none')
  const [error, setError] = useState<string | null>(null)
  const [currentPreset, setCurrentPreset] = useState({ name: PRESETS[0].name, index: 0 })
  const [showPresetNotification, setShowPresetNotification] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [customText, setCustomText] = useState('Glue.blue')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInputValue, setTextInputValue] = useState('Glue.blue')
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [showAutoPlayNotification, setShowAutoPlayNotification] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [showVideoOverlay, setShowVideoOverlay] = useState(true)
  const [showVideoLibrary, setShowVideoLibrary] = useState(false)
  const [libraryVideo, setLibraryVideo] = useState<HTMLVideoElement | null>(null)
  const [showShaderGenerator, setShowShaderGenerator] = useState(false)
  const [customShader, setCustomShader] = useState<{ code: string; name: string } | null>(null)

  const videoLibrary = useVideoLibrary()

  const {
    isActive,
    bands,
    startMicrophone,
    startFile,
    startVideo,
    stop,
    analyserRef,
    dataArrayRef,
    videoElementRef,
    seekVideo,
    toggleVideoPlayback,
  } = useAudioAnalyzer()

  const handlePresetChange = (name: string, index: number) => {
    setCurrentPreset({ name, index })
    setShowPresetNotification(true)
  }

  // Auto-hide preset notification
  useEffect(() => {
    if (showPresetNotification) {
      const timer = setTimeout(() => setShowPresetNotification(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [showPresetNotification, currentPreset])

  // Auto-hide auto-play notification
  useEffect(() => {
    if (showAutoPlayNotification) {
      const timer = setTimeout(() => setShowAutoPlayNotification(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [showAutoPlayNotification])

  const handleAutoPlayChange = (enabled: boolean) => {
    setIsAutoPlay(enabled)
    setShowAutoPlayNotification(true)
  }

  // Toggle controls with H key, close text input with Escape, video controls with J/K/L
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      if (e.key === 'h' || e.key === 'H') {
        setShowControls(prev => !prev)
      }
      if (e.key === 'Escape') {
        setShowTextInput(false)
        setShowVideoLibrary(false)
        setShowShaderGenerator(false)
      }

      // B to toggle video library
      if (e.key === 'b' || e.key === 'B') {
        setShowVideoLibrary(prev => !prev)
      }

      // G to toggle shader generator
      if (e.key === 'g' || e.key === 'G') {
        setShowShaderGenerator(prev => !prev)
      }

      // Shift+1-9 to trigger video slots, Shift+0 to stop
      // Use e.code because e.key gives "!" for Shift+1, "@" for Shift+2, etc.
      if (e.shiftKey && e.code.startsWith('Digit')) {
        e.preventDefault()
        const digit = e.code.replace('Digit', '')
        if (digit === '0') {
          videoLibrary.stopVideo()
          setLibraryVideo(null)
        } else {
          const slotIndex = parseInt(digit) - 1
          const video = videoLibrary.triggerSlot(slotIndex)
          setLibraryVideo(video)
        }
      }

      // V to toggle video overlay (works anytime there's a video)
      if ((e.key === 'v' || e.key === 'V') && !e.shiftKey) {
        setShowVideoOverlay(prev => !prev)
      }

      // Video controls (J/K/L like YouTube)
      if (mode === 'video' && videoElementRef.current) {
        if (e.key === 'j' || e.key === 'J') {
          seekVideo(videoElementRef.current.currentTime - 10)
        }
        if (e.key === 'l' || e.key === 'L') {
          seekVideo(videoElementRef.current.currentTime + 10)
        }
        if (e.key === 'k' || e.key === 'K') {
          toggleVideoPlayback()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode, videoElementRef, seekVideo, toggleVideoPlayback, videoLibrary])

  // Focus text input when shown
  useEffect(() => {
    if (showTextInput && textInputRef.current) {
      textInputRef.current.focus()
      textInputRef.current.select()
    }
  }, [showTextInput])

  const handleMicClick = async () => {
    try {
      setError(null)
      await startMicrophone()
      setMode('mic')
    } catch {
      setError('Could not access microphone. Please allow microphone access.')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      await startFile(file)
      setMode('file')
    } catch {
      setError('Could not play audio file.')
    }
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      const video = await startVideo(file)
      setVideoElement(video)
      setMode('video')
      // Switch to video preset (index 14)
      setCurrentPreset({ name: PRESETS[14].name, index: 14 })
    } catch {
      setError('Could not play video file.')
    }
  }

  const handleStop = () => {
    stop()
    setVideoElement(null)
    setMode('none')
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInputValue.trim()) {
      setCustomText(textInputValue.trim())
    }
    setShowTextInput(false)
  }

  const handleRequestTextEdit = () => {
    setTextInputValue(customText)
    setShowTextInput(true)
  }

  const showUI = !isActive

  return (
    <div className="w-full h-full relative bg-black">
      <AudioVisualizer
        bass={bands.bass}
        mid={bands.mid}
        treble={bands.treble}
        analyser={analyserRef.current}
        dataArray={dataArrayRef.current}
        onPresetChange={handlePresetChange}
        customText={customText}
        onRequestTextEdit={handleRequestTextEdit}
        autoPlay={isAutoPlay}
        autoPlayInterval={15000}
        onAutoPlayChange={handleAutoPlayChange}
        videoElement={showVideoOverlay ? (libraryVideo || videoElement) : null}
        customShader={customShader}
        onClearCustomShader={() => setCustomShader(null)}
      />

      {/* Start screen UI */}
      {showUI && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/70 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 border border-white/10">
            <h1 className="text-3xl font-bold text-white mb-2 text-center">
              Audio Visualizer
            </h1>
            <p className="text-gray-400 text-center mb-8">
              Milkdrop-inspired reactive visuals
            </p>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleMicClick}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Use Microphone
              </button>

              <div className="relative">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 border border-white/20 flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Load Audio File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Load Video File
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-gray-500 text-xs text-center mb-2">Keyboard Controls</p>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="px-2 py-1 bg-white/5 rounded text-gray-400">1-9/0 Presets</span>
                <span className="px-2 py-1 bg-white/5 rounded text-gray-400">←→ Cycle</span>
                <span className="px-2 py-1 bg-white/5 rounded text-gray-400">Space Random</span>
                <span className="px-2 py-1 bg-white/5 rounded text-gray-400">A Auto</span>
                <span className="px-2 py-1 bg-white/5 rounded text-gray-400">T Edit Text</span>
                <span className="px-2 py-1 bg-white/5 rounded text-gray-400">H Help</span>
              </div>
            </div>

            <p className="text-gray-500 text-xs text-center mt-4">
              Press F11 for fullscreen experience
            </p>
          </div>
        </div>
      )}

      {/* Text input modal */}
      {showTextInput && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-sm">
          <form onSubmit={handleTextSubmit} className="bg-black/80 backdrop-blur-md rounded-xl p-6 border border-white/20 max-w-md w-full mx-4">
            <h2 className="text-white font-medium mb-4">Edit Custom Text</h2>
            <input
              ref={textInputRef}
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder="Enter your text..."
              maxLength={20}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-gray-500 text-xs mt-2">
              Supports A-Z, 0-9, and basic punctuation. Max 20 characters.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowTextInput(false)}
                className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preset notification */}
      {isActive && showPresetNotification && !showTextInput && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-pulse">
          <div className="px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20">
            <p className="text-white text-sm font-medium">
              {currentPreset.index + 1}. {currentPreset.name}
            </p>
          </div>
        </div>
      )}

      {/* Auto-play notification */}
      {isActive && showAutoPlayNotification && !showTextInput && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 animate-pulse">
          <div className={`px-4 py-2 backdrop-blur-sm rounded-lg border ${isAutoPlay ? 'bg-green-600/60 border-green-400/40' : 'bg-black/60 border-white/20'}`}>
            <p className="text-white text-sm font-medium">
              Auto-play: {isAutoPlay ? 'ON' : 'OFF'}
            </p>
          </div>
        </div>
      )}

      {/* Auto-play indicator */}
      {isActive && isAutoPlay && !showTextInput && !showAutoPlayNotification && (
        <div className="absolute top-4 right-4 z-10">
          <div className="px-3 py-1.5 bg-green-600/40 backdrop-blur-sm rounded-full border border-green-400/30">
            <p className="text-green-300 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              AUTO
            </p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {isActive && showControls && !showTextInput && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 border border-white/10 text-sm">
            <p className="text-white font-medium mb-3">Controls</p>
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">1-0</span>
                <span>Switch preset</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">← →</span>
                <span>Prev / Next</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">[ ]</span>
                <span>Prev / Next</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Space</span>
                <span>Random preset</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">A</span>
                <span>Toggle auto-play</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">T</span>
                <span>Edit custom text</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">H</span>
                <span>Toggle help</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">G</span>
                <span>AI Shader Generator</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">F11</span>
                <span>Fullscreen</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-gray-500 text-xs">Presets:</p>
              <div className="mt-1 space-y-1">
                {PRESETS.map((p, i) => (
                  <p key={i} className={`text-xs ${i === currentPreset.index ? 'text-white' : 'text-gray-500'}`}>
                    {i + 1}. {p.name} {i === currentPreset.index && '←'}
                  </p>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-gray-500 text-xs">Current text:</p>
              <p className="text-cyan-400 text-sm mt-1">"{customText}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Active state hint */}
      {isActive && !showTextInput && !showVideoLibrary && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white text-sm rounded-full backdrop-blur-sm transition-all duration-200 border border-white/10"
          >
            {mode === 'mic' ? 'Stop Mic' : mode === 'video' ? 'Stop Video' : 'Stop Audio'}
          </button>
          <div className="px-4 py-2 bg-black/30 text-white/50 text-sm rounded-full backdrop-blur-sm border border-white/5">
            {mode === 'video' ? 'J -10s | K pause | L +10s | V overlay | B library | G AI' : 'B library | V overlay | G AI | H help'}
          </div>
        </div>
      )}

      {/* Library video indicator */}
      {libraryVideo && !showVideoLibrary && (
        <div className="absolute top-4 left-4 z-10">
          <div className="px-3 py-1.5 bg-blue-600/40 backdrop-blur-sm rounded-full border border-blue-400/30">
            <p className="text-blue-300 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              VID {videoLibrary.activeSlot !== null ? videoLibrary.activeSlot + 1 : ''}
            </p>
          </div>
        </div>
      )}

      {/* AI Shader indicator */}
      {customShader && isActive && !showShaderGenerator && (
        <div className="absolute top-4 left-4 z-10" style={{ marginLeft: libraryVideo ? '80px' : '0' }}>
          <div className="px-3 py-1.5 bg-purple-600/40 backdrop-blur-sm rounded-full border border-purple-400/30">
            <p className="text-purple-300 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
              AI
            </p>
          </div>
        </div>
      )}

      {/* Video Library */}
      <VideoLibrary
        isVisible={showVideoLibrary}
        onClose={() => setShowVideoLibrary(false)}
        onVideoTrigger={setLibraryVideo}
        videoLibrary={videoLibrary}
      />

      {/* Shader Generator */}
      <ShaderGenerator
        isVisible={showShaderGenerator}
        onClose={() => setShowShaderGenerator(false)}
        onShaderGenerated={(code, prompt) => {
          setCustomShader({ code, name: prompt })
        }}
        currentShader={customShader}
      />
    </div>
  )
}

export default App
