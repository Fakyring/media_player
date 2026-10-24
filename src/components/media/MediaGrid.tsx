/** @file Grid layout component for displaying media cards. */

import { useEffect, useRef, useState } from 'react'
import type { MediaAlbum, MediaItem } from '../../types/media'
import { MediaCard } from './MediaCard'
import { Images } from 'lucide-react'

function AlbumCard({ album, onOpen }: { album: MediaAlbum; onOpen: () => void }) {
  const cardRef = useRef<HTMLButtonElement | null>(null)
  const [nearViewport, setNearViewport] = useState(false)

  useEffect(() => {
    const element = cardRef.current
    if (!element || nearViewport) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true)
        observer.disconnect()
      }
    }, { rootMargin: '240px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [nearViewport])

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-500/60"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-950">
        {album.preview.type === 'image' ? (
          <img src={nearViewport ? album.preview.thumbnailSrc || album.preview.src : undefined} alt="" loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        ) : (
          <video
            src={nearViewport ? album.preview.src : undefined}
            muted
            playsInline
            preload={nearViewport ? 'metadata' : 'none'}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget
              if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(video.duration * 0.1, 2)
            }}
            className="h-full w-full object-cover"
          />
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2.5 py-1 text-xs text-white">{album.items.length} файла</span>
        <Images className="absolute left-3 top-3 h-5 w-5 text-white drop-shadow" />
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium text-slate-50">{album.title}</h3>
        <p className="mt-1 text-xs text-slate-400">Альбом · Автор: {album.authorName}</p>
      </div>
    </button>
  )
}

/**
 * Props for MediaGrid component.
 */
interface MediaGridProps {
  /** Items to render as cards. */
  items: MediaItem[]
  /** Returns true if item is currently in favorites. */
  isFavorite: (id: string) => boolean
  /** Toggles favorite state of an item. */
  onToggleFavorite: (id: string) => void
  /** Called when user wants to open item in modal player. */
  onOpen: (item: MediaItem) => void
  albums?: MediaAlbum[]
  onOpenAlbum?: (album: MediaAlbum) => void
}

/**
 * MediaGrid renders a responsive grid of MediaCard components.
 */
export function MediaGrid({ items, isFavorite, onToggleFavorite, onOpen, albums = [], onOpenAlbum }: MediaGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          favorite={isFavorite(item.id)}
          onToggleFavorite={() => onToggleFavorite(item.id)}
          onOpen={() => onOpen(item)}
        />
      ))}
      {albums.map((album) => <AlbumCard key={album.id} album={album} onOpen={() => onOpenAlbum?.(album)} />)}
    </div>
  )
}
