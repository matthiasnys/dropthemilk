import { useState, useCallback, useEffect, useRef } from 'react'

// Type declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>
    queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
    requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  }
}

export interface VideoSlot {
  file: File | null
  name: string
  url: string | null
  loop: boolean
}

export interface VideoFile {
  name: string
  handle: FileSystemFileHandle
}

const DB_NAME = 'vj-video-library'
const STORE_NAME = 'folder-handle'

// IndexedDB helpers for persisting folder handle
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
  })
}

async function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, 'folder')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get('folder')
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export function useVideoLibrary() {
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
  const [slots, setSlots] = useState<VideoSlot[]>(
    Array(9).fill(null).map(() => ({ file: null, name: '', url: null, loop: true }))
  )
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [isSupported] = useState(() => 'showDirectoryPicker' in window)
  const videoElementsRef = useRef<(HTMLVideoElement | null)[]>(Array(9).fill(null))

  // Try to restore folder handle on mount
  useEffect(() => {
    async function restore() {
      const handle = await loadFolderHandle()
      if (handle) {
        // Check if we still have permission
        const permission = await handle.queryPermission({ mode: 'read' })
        if (permission === 'granted') {
          setFolderHandle(handle)
          setFolderName(handle.name)
          await scanFolder(handle)
        } else {
          // Store handle for later re-permission
          setFolderHandle(handle)
          setFolderName(handle.name)
        }
      }
    }
    if (isSupported) {
      restore()
    }
  }, [isSupported])

  const scanFolder = async (handle: FileSystemDirectoryHandle) => {
    const files: VideoFile[] = []
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile()
        if (file.type.startsWith('video/')) {
          files.push({ name: entry.name, handle: entry })
        }
      }
    }
    files.sort((a, b) => a.name.localeCompare(b.name))
    setVideoFiles(files)
  }

  const selectFolder = useCallback(async () => {
    if (!isSupported) {
      alert('File System Access API not supported. Use Chrome or Edge.')
      return
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' })
      setFolderHandle(handle)
      setFolderName(handle.name)
      await saveFolderHandle(handle)
      await scanFolder(handle)
    } catch (err) {
      // User cancelled
      console.log('Folder selection cancelled')
    }
  }, [isSupported])

  const requestPermission = useCallback(async () => {
    if (!folderHandle) return false
    try {
      const permission = await folderHandle.requestPermission({ mode: 'read' })
      if (permission === 'granted') {
        await scanFolder(folderHandle)
        return true
      }
    } catch {
      // Permission denied
    }
    return false
  }, [folderHandle])

  const loadVideoToSlot = useCallback(async (videoFile: VideoFile, slotIndex: number) => {
    if (slotIndex < 0 || slotIndex >= 9) return

    // Clean up old URL
    const oldSlot = slots[slotIndex]
    if (oldSlot.url) {
      URL.revokeObjectURL(oldSlot.url)
    }

    const file = await videoFile.handle.getFile()
    const url = URL.createObjectURL(file)

    setSlots(prev => {
      const newSlots = [...prev]
      newSlots[slotIndex] = {
        file,
        name: videoFile.name,
        url,
        loop: true
      }
      return newSlots
    })
  }, [slots])

  const clearSlot = useCallback((slotIndex: number) => {
    setSlots(prev => {
      const newSlots = [...prev]
      if (newSlots[slotIndex].url) {
        URL.revokeObjectURL(newSlots[slotIndex].url)
      }
      newSlots[slotIndex] = { file: null, name: '', url: null, loop: true }
      return newSlots
    })
    if (activeSlot === slotIndex) {
      setActiveSlot(null)
    }
  }, [activeSlot])

  const triggerSlot = useCallback((slotIndex: number): HTMLVideoElement | null => {
    if (slotIndex < 0 || slotIndex >= 9) return null
    const slot = slots[slotIndex]
    if (!slot.url) return null

    setActiveSlot(slotIndex)

    // Create or reuse video element
    let video = videoElementsRef.current[slotIndex]
    if (!video) {
      video = document.createElement('video')
      video.playsInline = true
      video.muted = true // Muted since audio comes from main source
      videoElementsRef.current[slotIndex] = video
    }

    if (video.src !== slot.url) {
      video.src = slot.url
      video.loop = slot.loop
    }

    video.currentTime = 0
    video.play()

    return video
  }, [slots])

  const stopVideo = useCallback(() => {
    if (activeSlot !== null) {
      const video = videoElementsRef.current[activeSlot]
      if (video) {
        video.pause()
      }
    }
    setActiveSlot(null)
  }, [activeSlot])

  const toggleLoop = useCallback((slotIndex: number) => {
    setSlots(prev => {
      const newSlots = [...prev]
      newSlots[slotIndex] = { ...newSlots[slotIndex], loop: !newSlots[slotIndex].loop }
      return newSlots
    })
    const video = videoElementsRef.current[slotIndex]
    if (video) {
      video.loop = !video.loop
    }
  }, [])

  const getActiveVideo = useCallback((): HTMLVideoElement | null => {
    if (activeSlot === null) return null
    return videoElementsRef.current[activeSlot]
  }, [activeSlot])

  return {
    isSupported,
    folderName,
    folderHandle,
    videoFiles,
    slots,
    activeSlot,
    selectFolder,
    requestPermission,
    loadVideoToSlot,
    clearSlot,
    triggerSlot,
    stopVideo,
    toggleLoop,
    getActiveVideo,
  }
}
