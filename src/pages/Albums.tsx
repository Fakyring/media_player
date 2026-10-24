/** @file Album library page. */

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { fetchMediaList } from '../lib/api'
import type { MediaAlbum, MediaItem } from '../types/media'
import { AlbumModal } from '../components/media/AlbumModal'
import { MediaModal } from '../components/media/MediaModal'
import { MediaGrid } from '../components/media/MediaGrid'

export default function Albums() {
  const { user } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [albums, setAlbums] = useState<MediaAlbum[]>([])
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null)
  const [returnAlbum, setReturnAlbum] = useState<MediaAlbum | null>(null)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)

  const loadAlbums = async () => {
    const data = await fetchMediaList()
    setAlbums((data.albums ?? []).map((album) => ({
      ...album,
      items: [...album.items].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    })))
    setItems(data.items)
    setSelectedAlbum((current) => current ? (data.albums ?? []).find((album) => album.uuid === current.uuid) ?? null : null)
  }

  useEffect(() => {
    let cancelled = false
    void fetchMediaList()
      .then((data) => {
        if (!cancelled) {
          setAlbums((data.albums ?? []).map((album) => ({
            ...album,
            items: [...album.items].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
          })))
          setItems(data.items)
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить альбомы')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.uuid])

  const closeMedia = () => {
    setSelectedItem(null)
    if (returnAlbum) {
      setSelectedAlbum(returnAlbum)
      setReturnAlbum(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-50">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Альбомы</h1>
      <p className="mt-2 text-sm text-slate-400">Медиа, объединённые в тематические альбомы.</p>
      {loading ? (
        <p className="mt-8 text-sm text-slate-400">Загрузка альбомов...</p>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : albums.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">Альбомов пока нет.</p>
      ) : (
        <div className="mt-8">
          <MediaGrid
            items={[]}
            albums={albums}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onOpen={() => {}}
            onOpenAlbum={setSelectedAlbum}
          />
        </div>
      )}
      <AlbumModal
        album={selectedAlbum}
        items={items}
        onClose={() => setSelectedAlbum(null)}
        onOpenMedia={(item) => {
          setReturnAlbum(selectedAlbum)
          setSelectedAlbum(null)
          setSelectedItem(item)
        }}
        onRefresh={async () => {
          try {
            await loadAlbums()
          } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Не удалось обновить альбом')
          }
        }}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
      <MediaModal
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={closeMedia}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  )
}
