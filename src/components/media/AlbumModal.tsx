import { useState } from 'react'
import { Image as ImageIcon, PlayCircle, Star, X } from 'lucide-react'
import type { MediaAlbum, MediaItem } from '../../types/media'
import { addMediaToAlbum, removeMediaFromAlbum } from '../../lib/api'

interface AlbumModalProps {
  album: MediaAlbum | null
  items: MediaItem[]
  onClose: () => void
  onOpenMedia: (item: MediaItem) => void
  onRefresh: () => Promise<void>
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string) => void
}

function AlbumTile({ item, favorite, canEdit, onOpen, onToggleFavorite, onRemove }: {
  item: MediaItem
  favorite: boolean
  canEdit: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onRemove: () => void
}) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90 [content-visibility:auto] [contain-intrinsic-size:auto_280px]">
      <button type="button" onClick={onOpen} className="block w-full min-w-0 text-left">
        <div className="relative aspect-video overflow-hidden bg-slate-950">
          {item.type === 'image' ? (
            <img
              src={item.thumbnailSrc || item.src}
              alt={item.title}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              width={480}
              height={320}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-emerald-300">
              <PlayCircle className="h-9 w-9" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] text-slate-100">
            {item.type === 'image' ? <ImageIcon className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
            {item.type === 'image' ? 'Фото' : 'Видео'}
          </span>
        </div>
        <div className="flex h-12 min-w-0 items-center justify-between gap-2 px-3">
          <span className="truncate text-sm font-medium text-slate-100">{item.title}</span>
          <span className="shrink-0 text-[10px] text-slate-500">{new Date(item.createdAt ?? 0).toLocaleDateString()}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        className="absolute right-2 top-2 rounded-full bg-black/65 p-2 text-amber-400"
      >
        <Star className={`h-4 w-4 ${favorite ? 'fill-amber-400' : 'fill-transparent'}`} />
      </button>
      {canEdit && <button type="button" onClick={onRemove} className="absolute left-2 top-2 rounded-lg bg-red-950/90 px-2 py-1.5 text-xs text-red-200 hover:bg-red-900">Убрать</button>}
    </article>
  )
}

export function AlbumModal({ album, items, onClose, onOpenMedia, onRefresh, isFavorite, onToggleFavorite }: AlbumModalProps) {
  const [selectedUuid, setSelectedUuid] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!album) return null
  const availableItems = items.filter((item) => !item.albumUuid && item.canEdit)
  const handleAdd = async () => {
    if (!selectedUuid) return
    try {
      await addMediaToAlbum(album.uuid, selectedUuid)
      setSelectedUuid('')
      setError(null)
      await onRefresh()
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Не удалось добавить медиа')
    }
  }
  const handleRemove = async (item: MediaItem) => {
    try {
      await removeMediaFromAlbum(album.uuid, item.uuid)
      setError(null)
      await onRefresh()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Не удалось убрать медиа')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3" onClick={onClose}>
      <section className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">{album.title}</h2>
            <p className="text-xs text-slate-400">{album.items.length} элементов · Автор: {album.authorName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть альбом" className="rounded-full bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {album.canEdit && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <select value={selectedUuid} onChange={(event) => setSelectedUuid(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <option value="">Выберите своё медиа для добавления</option>
                {availableItems.map((item) => <option key={item.uuid} value={item.uuid}>{item.title}</option>)}
              </select>
              <button type="button" disabled={!selectedUuid} onClick={() => void handleAdd()} className="rounded-lg bg-violet-400 px-4 py-2 text-sm font-medium text-violet-950 disabled:opacity-50">Добавить в альбом</button>
            </div>
          )}
          {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
          <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {album.items.map((item) => (
              <AlbumTile
                key={item.uuid}
                item={item}
                favorite={isFavorite(item.id)}
                canEdit={album.canEdit && item.canEdit}
                onOpen={() => onOpenMedia(item)}
                onToggleFavorite={() => onToggleFavorite(item.id)}
                onRemove={() => void handleRemove(item)}
              />
            ))}
          </div>
          {album.items.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Альбом пока пуст.</p>}
        </div>
      </section>
    </div>
  )
}
