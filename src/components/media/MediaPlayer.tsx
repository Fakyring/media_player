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
}

/**
 * MediaPlayer renders either a video element with persisted volume or a full-size image preview.
 */
export function MediaPlayer({ item }: MediaPlayerProps) {
  const isVideo = item.type === 'video'
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [volume, setVolume] = useState(1)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
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
  }, [item.uuid, item.src])

  // Initialize volume from localStorage.
  useEffect(() => {
    const stored = window.localStorage.getItem('mediaPlayerVolume')
    const parsed = stored ? Number.parseFloat(stored) : Number.NaN
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      setVolume(parsed)
      if (videoRef.current) {
        videoRef.current.volume = parsed
      }
    }
  }, [])

  // Update localStorage and video element when volume changes.
  useEffect(() => {
    window.localStorage.setItem('mediaPlayerVolume', String(volume))
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
        className="h-full w-full bg-black object-contain"
        onVolumeChange={(event) => {
          const target = event.currentTarget
          setVolume(target.volume)
        }}
      />

      {!src && <p className="px-4 py-2 text-xs text-slate-400">Загрузка медиа...</p>}

      <div className="flex items-center gap-3 border-t border-slate-800 bg-slate-950/95 px-4 py-2 text-xs text-slate-200">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Громкость</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-500"
        />
        <span className="w-10 text-right tabular-nums text-slate-400">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  )
}
