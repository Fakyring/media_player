/** @file Unified media player for both video and image content with volume persistence. */

import { useEffect, useRef, useState } from 'react'
import type { MediaItem } from '../../types/media'
import { fetchMediaFile } from '../../lib/api'

/**
 * Props for MediaPlayer component.
 */
interface MediaPlayerProps {
  /** Media item to display. */
  item: MediaItem
  onAspectRatioChange?: (ratio: number) => void
}

/**
 * MediaPlayer renders either a video element with persisted volume or a full-size image preview.
 */
export function MediaPlayer({ item, onAspectRatioChange }: MediaPlayerProps) {
  const isVideo = item.type === 'video'
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [volume, setVolume] = useState(1)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (isVideo) {
      setSrc(item.src)
      return
    }
    let active = true
    let objectUrl: string | null = null

    setSrc(null)
    void fetchMediaFile(item.src)
      .then((url) => {
        objectUrl = url
        if (active) {
          setSrc(url)
        } else {
          URL.revokeObjectURL(url)
        }
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load media file', error)
      })

    return () => {
      active = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [isVideo, item.uuid, item.src])

  // Initialize volume from localStorage.
  useEffect(() => {
    let parsed = Number.NaN
    try {
      const stored = window.localStorage.getItem('mediaPlayerVolume')
      parsed = stored ? Number.parseFloat(stored) : Number.NaN
    } catch {
      parsed = Number.NaN
    }
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      setVolume(parsed)
      if (videoRef.current) {
        videoRef.current.volume = parsed
      }
    }
  }, [])

  // Update localStorage and video element when volume changes.
  useEffect(() => {
    try {
      window.localStorage.setItem('mediaPlayerVolume', String(volume))
    } catch {
      // Volume control remains available when browser storage is disabled.
    }
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
  }, [volume])

  if (!isVideo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        {src ? (
          <img src={src} alt={item.title} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-sm text-slate-400">Загрузка медиа...</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-black">
      <video
        ref={videoRef}
        src={src || undefined}
        controls
        autoPlay
        preload="auto"
        onLoadedMetadata={(event) => {
          const { videoWidth, videoHeight } = event.currentTarget
          if (videoWidth > 0 && videoHeight > 0) onAspectRatioChange?.(videoWidth / videoHeight)
        }}
        className="h-full w-full bg-black object-contain"
        onVolumeChange={(event) => {
          const target = event.currentTarget
          setVolume(target.volume)
        }}
      />

      {!src && <p className="px-4 py-2 text-xs text-slate-400">Загрузка медиа...</p>}

    </div>
  )
}
