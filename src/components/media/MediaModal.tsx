/** @file Simple fullscreen modal for displaying media player. */

import type { MediaItem } from '../../types/media'
import { MediaPlayer } from './MediaPlayer'
import { X, Star } from 'lucide-react'

/**
 * Props for MediaModal component.
 */
interface MediaModalProps {
  /** Media item to display, or null if closed. */
  item: MediaItem | null
  /** Controls whether the modal is visible. */
  open: boolean
  /** Called when user closes the modal. */
  onClose: () => void
  /** Returns true if the item is in favorites. */
  isFavorite: (id: string) => boolean
  /** Toggles favorite state for the item. */
  onToggleFavorite: (id: string) => void
}

/**
 * MediaModal renders a fullscreen overlay with MediaPlayer and basic controls.
 */
export function MediaModal({
  item,
  open,
  onClose,
  isFavorite,
  onToggleFavorite,
}: MediaModalProps) {
  if (!open || !item) return null

  const favorite = isFavorite(item.id)

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-3 py-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/80"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5">
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate text-sm font-medium text-slate-100">{item.title}</h2>
            <p className="truncate text-xs text-slate-400">
              {item.type === 'video' ? 'Видео' : 'Картинка'} • {item.categories.join(', ') || 'Без категории'} • Автор: {item.authorName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-slate-900 px-3 text-xs text-slate-200 hover:bg-slate-800"
            >
              <Star
                className={`h-4 w-4 text-amber-400 ${
                  favorite ? 'fill-amber-400' : 'fill-transparent'
                }`}
              />
              <span className="hidden sm:inline">
                {favorite ? 'В избранном' : 'В избранное'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-200 hover:bg-slate-800"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 bg-black">
          <MediaPlayer item={item} />
        </div>
      </div>
    </div>
  )
}
