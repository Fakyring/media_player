/** @file Simple fullscreen modal for displaying media player. */

import { useState } from 'react'
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
  const [fitMode, setFitMode] = useState<'contain' | 'video'>('contain')
  const [aspectRatio, setAspectRatio] = useState(16 / 9)
  if (!open || !item) return null

  const favorite = isFavorite(item.id)
  const fittedWidth = `min(95vw, ${Math.max(0.5, aspectRatio) * 82}vh)`

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-3 py-4"
      onClick={onClose}
    >
      <div
        style={fitMode === 'video' && item.type === 'video' ? { width: fittedWidth } : undefined}
        className={`relative flex ${fitMode === 'video' && item.type === 'video' ? 'max-h-[95vh]' : 'h-full w-full max-w-5xl'} flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/80`}
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
            {item.type === 'video' && (
              <div className="flex rounded-full bg-slate-900 p-0.5" aria-label="Масштаб видео">
                <button
                  type="button"
                  aria-pressed={fitMode === 'contain'}
                  onClick={() => setFitMode('contain')}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${fitMode === 'contain' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  Вписать
                </button>
                <button
                  type="button"
                  aria-pressed={fitMode === 'video'}
                  onClick={() => setFitMode('video')}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${fitMode === 'video' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  По размеру видео
                </button>
              </div>
            )}
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

        <div
          style={fitMode === 'video' && item.type === 'video' ? { aspectRatio, maxHeight: '82vh' } : undefined}
          className={`min-h-0 bg-black ${fitMode === 'video' && item.type === 'video' ? 'w-full flex-none' : 'flex-1'}`}
        >
          <MediaPlayer item={item} onAspectRatioChange={setAspectRatio} />
        </div>
      </div>
    </div>
  )
}
