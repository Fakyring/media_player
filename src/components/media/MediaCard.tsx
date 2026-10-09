/** @file Visual card component for a single media item. */

import { Lock, PlayCircle, Image as ImageIcon, Star } from 'lucide-react'
import type { MediaItem } from '../../types/media'

/**
 * Props for MediaCard component.
 */
interface MediaCardProps {
  /** Media item to display. */
  item: MediaItem
  /** Indicates whether the item is in favorites. */
  favorite: boolean
  /** Triggered when the favorite state should be toggled. */
  onToggleFavorite: () => void
  /** Triggered when the item should be opened in the modal player. */
  onOpen: () => void
}

/**
 * MediaCard displays media type, basic info and favorite control for a media item.
 */
export function MediaCard({ item, favorite, onToggleFavorite, onOpen }: MediaCardProps) {
  const isVideo = item.type === 'video'
  const icon = isVideo ? (
    <PlayCircle className="h-5 w-5 text-emerald-400" />
  ) : (
    <ImageIcon className="h-5 w-5 text-sky-400" />
  )

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm shadow-slate-900/80 transition hover:-translate-y-0.5 hover:border-emerald-500/60 hover:shadow-emerald-500/20">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-video w-full overflow-hidden bg-slate-950"
      >
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 transition duration-300 group-hover:scale-[1.03]">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <span className="rounded-full bg-slate-800/80 p-4">{icon}</span>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {isVideo ? 'Video' : 'Image'}
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent opacity-90" />

        <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap items-center gap-2 text-xs text-slate-50">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-medium text-slate-50 ring-1 ring-slate-700/80">
            {icon}
            <span>{isVideo ? 'Видео' : 'Картинка'}</span>
          </span>
          {item.categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 ring-1 ring-slate-700/80"
            >
              {category}
            </span>
          ))}
          {!item.isPublic && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 px-2 py-1 text-[10px] text-amber-300 ring-1 ring-amber-800/80">
              <Lock className="h-3 w-3" />
              Приватное
            </span>
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-2 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-medium text-slate-50">{item.title}</h3>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            className="mt-0.5 rounded-full p-1 text-amber-400 hover:bg-slate-800/90"
          >
            <Star className={`h-4 w-4 ${favorite ? 'fill-amber-400' : 'fill-transparent'}`} />
          </button>
        </div>
        <p className="text-xs text-slate-400">Автор: {item.authorName}</p>
        <p className="text-xs text-slate-500">ID: {item.uuid}</p>
      </div>
    </article>
  )
}
