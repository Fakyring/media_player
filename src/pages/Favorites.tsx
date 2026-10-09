/** @file Favorites page listing saved media items. */

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { fetchMediaList } from '../lib/api'
import type { MediaItem } from '../types/media'
import { MediaGrid } from '../components/media/MediaGrid'
import { MediaModal } from '../components/media/MediaModal'

export default function Favorites() {
  const { user } = useAuth()
  const { favorites, isFavorite, toggleFavorite, loading: favoritesLoading } = useFavorites()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchMediaList()
      .then((data) => {
        if (!cancelled) setItems(data.items)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить избранное')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.uuid])

  const favoriteItems = items.filter((item) => favorites.includes(item.id))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-50">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Избранное</h1>
      <p className="mt-2 text-sm text-slate-400">Сохранённые фотографии и видео.</p>

      {loading || favoritesLoading ? (
        <p className="mt-8 text-sm text-slate-400">Загрузка избранного...</p>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : favoriteItems.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
          Здесь пока пусто. Добавляйте медиа в избранное кнопкой со звездой в галерее.
        </p>
      ) : (
        <div className="mt-8">
          <MediaGrid
            items={favoriteItems}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onOpen={setSelectedItem}
          />
        </div>
      )}

      <MediaModal
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  )
}
