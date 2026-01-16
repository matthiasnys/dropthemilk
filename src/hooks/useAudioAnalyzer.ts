import { useRef, useCallback, useState } from 'react'

export interface AudioBands {
  bass: number
  mid: number
  treble: number
  beat: number
}

export interface AudioAnalyzerReturn {
  isActive: boolean
  bands: AudioBands
  startMicrophone: () => Promise<void>
  startFile: (file: File) => Promise<void>
  startVideo: (file: File) => Promise<HTMLVideoElement>
  stop: () => void
  analyserRef: React.RefObject<AnalyserNode | null>
  dataArrayRef: React.RefObject<Uint8Array | null>
  videoElementRef: React.RefObject<HTMLVideoElement | null>
  seekVideo: (time: number) => void
  toggleVideoPlayback: () => void
}

export function useAudioAnalyzer(): AudioAnalyzerReturn {
  const [isActive, setIsActive] = useState(false)
  const [bands, setBands] = useState<AudioBands>({ bass: 0, mid: 0, treble: 0, beat: 0 })

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Beat detection state
  const bassHistoryRef = useRef<number[]>([])
  const lastBeatTimeRef = useRef<number>(0)
  const beatValueRef = useRef<number>(0)
  const prevBassRef = useRef<number>(0)
  const BEAT_THRESHOLD = 1.2  // Lowered: more sensitive to peaks
  const BEAT_COOLDOWN = 100   // Lowered: allow faster beats
  const HISTORY_SIZE = 20     // Shorter: faster adaptation
  const MIN_BASS = 0.08       // Lowered: detect quieter beats

  const average = (arr: Uint8Array, start: number, end: number): number => {
    let sum = 0
    for (let i = start; i < end; i++) {
      sum += arr[i]
    }
    return sum / (end - start)
  }

  const updateBands = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>)
    const data = dataArrayRef.current
    const third = Math.floor(data.length / 3)

    const bass = average(data, 0, third) / 255
    const mid = average(data, third, third * 2) / 255
    const treble = average(data, third * 2, data.length) / 255

    // Beat detection - dual method: threshold + derivative
    const now = performance.now()
    const bassHistory = bassHistoryRef.current

    // Add current bass to history
    bassHistory.push(bass)
    if (bassHistory.length > HISTORY_SIZE) {
      bassHistory.shift()
    }

    // Calculate average bass from history
    const avgBass = bassHistory.length > 0
      ? bassHistory.reduce((a, b) => a + b, 0) / bassHistory.length
      : 0

    // Derivative: sudden increase in bass
    const bassDerivative = bass - prevBassRef.current
    prevBassRef.current = bass

    // Beat detected if: (threshold exceeded OR sharp increase) AND cooldown passed
    const thresholdBeat = bass > avgBass * BEAT_THRESHOLD && bass > MIN_BASS
    const derivativeBeat = bassDerivative > 0.15 && bass > MIN_BASS

    if ((thresholdBeat || derivativeBeat) && now - lastBeatTimeRef.current > BEAT_COOLDOWN) {
      beatValueRef.current = 1.0
      lastBeatTimeRef.current = now
    }

    // Decay beat value (slower for more visible flash)
    beatValueRef.current *= 0.88
    const beat = beatValueRef.current

    setBands({ bass, mid, treble, beat })
    animationFrameRef.current = requestAnimationFrame(updateBands)
  }, [])

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.5  // Lowered for sharper transients (beat detection)
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
    }
    return { audioContext: audioContextRef.current, analyser: analyserRef.current }
  }, [])

  const startMicrophone = useCallback(async () => {
    try {
      const { audioContext, analyser } = initAudioContext()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      setIsActive(true)
      updateBands()
    } catch (err) {
      console.error('Error accessing microphone:', err)
      throw err
    }
  }, [initAudioContext, updateBands])

  const startFile = useCallback(async (file: File) => {
    try {
      const { audioContext, analyser } = initAudioContext()

      const url = URL.createObjectURL(file)
      const audio = new Audio(url)
      audio.crossOrigin = 'anonymous'
      audio.loop = true
      audioElementRef.current = audio

      const source = audioContext.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      sourceRef.current = source

      await audio.play()
      setIsActive(true)
      updateBands()
    } catch (err) {
      console.error('Error playing audio file:', err)
      throw err
    }
  }, [initAudioContext, updateBands])

  const startVideo = useCallback(async (file: File): Promise<HTMLVideoElement> => {
    try {
      const { audioContext, analyser } = initAudioContext()

      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.src = url
      video.crossOrigin = 'anonymous'
      video.loop = true
      video.muted = false
      video.playsInline = true
      videoElementRef.current = video

      const source = audioContext.createMediaElementSource(video)
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      sourceRef.current = source

      await video.play()
      setIsActive(true)
      updateBands()
      return video
    } catch (err) {
      console.error('Error playing video file:', err)
      throw err
    }
  }, [initAudioContext, updateBands])

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }

    if (videoElementRef.current) {
      videoElementRef.current.pause()
      videoElementRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Reset beat detection state
    bassHistoryRef.current = []
    lastBeatTimeRef.current = 0
    beatValueRef.current = 0
    prevBassRef.current = 0

    setIsActive(false)
    setBands({ bass: 0, mid: 0, treble: 0, beat: 0 })
  }, [])

  const seekVideo = useCallback((time: number) => {
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = Math.max(0, Math.min(time, videoElementRef.current.duration || 0))
    }
  }, [])

  const toggleVideoPlayback = useCallback(() => {
    if (videoElementRef.current) {
      if (videoElementRef.current.paused) {
        videoElementRef.current.play()
      } else {
        videoElementRef.current.pause()
      }
    }
  }, [])

  return {
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
  }
}
