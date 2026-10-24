import { useState } from 'react'
import { X } from 'lucide-react'
import type { MediaAlbum, MediaItem } from '../../types/media'
import { addMediaToAlbum, removeMediaFromAlbum } from '../../lib/api'
import { MediaCard } from './MediaCard'

interface AlbumModalProps {
  album: MediaAlbum | null
  items: MediaItem[]
  onClose: () => void
  onOpenMedia: (item: MediaItem) => void
  onRefresh: () => Promise<void>
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string) => void
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
        <div className="overflow-y-auto p-4">
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
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {album.items.map((item) => (
              <div key={item.uuid} className="relative">
                <MediaCard item={item} favorite={isFavorite(item.id)} onToggleFavorite={() => onToggleFavorite(item.id)} onOpen={() => onOpenMedia(item)} />
                {album.canEdit && item.canEdit && <button type="button" onClick={() => void handleRemove(item)} className="absolute right-2 top-2 z-10 rounded-lg bg-red-950/90 px-2 py-1 text-xs text-red-200 hover:bg-red-900">Убрать из альбома</button>}
              </div>
            ))}
          </div>
          {album.items.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Альбом пока пуст.</p>}
        </div>
      </section>
    </div>
  )
}
