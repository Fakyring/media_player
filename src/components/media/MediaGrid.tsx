import type { MediaAlbum, MediaItem } from '../../types/media'
import { MediaCard } from './MediaCard'
import { Images } from 'lucide-react'

function AlbumCard({ album, onOpen }: { album: MediaAlbum; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-500/60"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-950">
        {album.preview.type === 'image' ? (
          <img src={album.preview.thumbnailSrc || album.preview.src} alt="" loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900 text-emerald-300">
            <Images className="h-10 w-10" />
          </div>
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

interface MediaGridProps {
  items: MediaItem[]
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string) => void
  onOpen: (item: MediaItem) => void
  albums?: MediaAlbum[]
  onOpenAlbum?: (album: MediaAlbum) => void
}

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
