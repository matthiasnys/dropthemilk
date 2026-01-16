import { useState } from 'react'
import { VideoFile } from '../hooks/useVideoLibrary'
import type { useVideoLibrary } from '../hooks/useVideoLibrary'

interface VideoLibraryProps {
  onVideoTrigger: (video: HTMLVideoElement | null) => void
  isVisible: boolean
  onClose: () => void
  videoLibrary: ReturnType<typeof useVideoLibrary>
}

export function VideoLibrary({ onVideoTrigger, isVisible, onClose, videoLibrary }: VideoLibraryProps) {
  const {
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
  } = videoLibrary

  const [loadingSlot, setLoadingSlot] = useState<number | null>(null)

  const handleSelectFolder = async () => {
    await selectFolder()
  }

  const handleRequestPermission = async () => {
    await requestPermission()
  }

  const handleLoadToSlot = async (videoFile: VideoFile, slotIndex: number) => {
    setLoadingSlot(slotIndex)
    await loadVideoToSlot(videoFile, slotIndex)
    setLoadingSlot(null)
  }

  const handleTriggerSlot = (slotIndex: number) => {
    const video = triggerSlot(slotIndex)
    onVideoTrigger(video)
  }

  const handleStopVideo = () => {
    stopVideo()
    onVideoTrigger(null)
  }

  // Check if we need permission
  const showPermissionPrompt = folderHandle && videoFiles.length === 0 && folderName

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Video Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isSupported ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-2">File System Access API not supported</p>
            <p className="text-gray-500 text-sm">Please use Chrome or Edge browser</p>
          </div>
        ) : (
          <>
            {/* Video Slots */}
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Video Slots (Shift + 1-9 to trigger)</p>
              <div className="grid grid-cols-9 gap-2">
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className={`relative aspect-video rounded-lg border-2 transition-all cursor-pointer ${
                      activeSlot === i
                        ? 'border-green-500 bg-green-500/20'
                        : slot.url
                        ? 'border-blue-500/50 bg-blue-500/10 hover:border-blue-400'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                    onClick={() => slot.url && handleTriggerSlot(i)}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                      <span className="text-xs text-gray-500 mb-1">⇧{i + 1}</span>
                      {slot.url ? (
                        <>
                          <span className="text-[10px] text-white truncate w-full text-center px-1">
                            {slot.name.replace(/\.[^/.]+$/, '').slice(0, 8)}
                          </span>
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLoop(i); }}
                              className={`text-[8px] px-1 rounded ${slot.loop ? 'bg-blue-500' : 'bg-gray-600'}`}
                              title={slot.loop ? 'Loop ON' : 'Loop OFF'}
                            >
                              ⟳
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); clearSlot(i); }}
                              className="text-[8px] px-1 rounded bg-red-500/50 hover:bg-red-500"
                              title="Clear slot"
                            >
                              ✕
                            </button>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-600 text-lg">○</span>
                      )}
                    </div>
                    {activeSlot === i && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
              {activeSlot !== null && (
                <button
                  onClick={handleStopVideo}
                  className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg"
                >
                  Stop Video (Shift+0)
                </button>
              )}
            </div>

            {/* Folder Selection */}
            <div className="mb-4 p-4 bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    {folderName ? `📁 ${folderName}` : 'No folder selected'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {videoFiles.length > 0
                      ? `${videoFiles.length} video${videoFiles.length !== 1 ? 's' : ''} found`
                      : 'Select a folder with your video files'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {showPermissionPrompt && (
                    <button
                      onClick={handleRequestPermission}
                      className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm"
                    >
                      Grant Access
                    </button>
                  )}
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm"
                  >
                    {folderName ? 'Change Folder' : 'Select Folder'}
                  </button>
                </div>
              </div>
            </div>

            {/* Video Files List */}
            {videoFiles.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                <p className="text-gray-400 text-sm mb-2">Click a video to load into a slot</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {videoFiles.map((video) => (
                    <div
                      key={video.name}
                      className="group relative bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors"
                    >
                      <p className="text-white text-sm truncate mb-2" title={video.name}>
                        {video.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {slots.map((slot, slotIndex) => (
                          <button
                            key={slotIndex}
                            onClick={() => handleLoadToSlot(video, slotIndex)}
                            disabled={loadingSlot === slotIndex}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              slot.name === video.name
                                ? 'bg-green-500/30 text-green-400'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                          >
                            {loadingSlot === slotIndex ? '...' : `→${slotIndex + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-xs">
                <span className="text-gray-400">Shift+1-9</span> trigger slot •
                <span className="text-gray-400"> Shift+0</span> stop •
                <span className="text-gray-400"> B</span> toggle library
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

