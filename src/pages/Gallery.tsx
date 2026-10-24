/** @file Gallery page showing public media and private items for their owners/admins. */

import { useEffect, useMemo, useState } from 'react'
import { fetchMediaList } from '../lib/api'
import type { MediaAlbum, MediaItem } from '../types/media'
import { MediaGrid } from '../components/media/MediaGrid'
import { MediaModal } from '../components/media/MediaModal'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import { AlbumModal } from '../components/media/AlbumModal'

export default function Gallery() {
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [albums, setAlbums] = useState<MediaAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<'all' | 'image' | 'video' | 'favorites'>('all')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null)
  const [returnAlbum, setReturnAlbum] = useState<MediaAlbum | null>(null)

  const closeMedia = () => {
    setSelectedItem(null)
    if (returnAlbum) {
      setSelectedAlbum(returnAlbum)
      setReturnAlbum(null)
    }
  }

  const loadMedia = async () => {
    const data = await fetchMediaList()
    setItems(data.items)
    setAlbums(data.albums ?? [])
    setSelectedAlbum((current) => current ? (data.albums ?? []).find((album) => album.uuid === current.uuid) ?? null : null)
    setPage(0)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchMediaList()
        if (!cancelled) {
          setItems(data.items)
          setAlbums(data.albums ?? [])
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить медиа')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [user?.uuid])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      if (activeType === 'image' || activeType === 'video') {
        if (item.type !== activeType) continue
      }
      if (activeType === 'favorites' && !favorites.includes(item.id)) continue
      for (const category of item.categories) {
        set.add(category)
      }
    }
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [activeType, favorites, items])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    return items.filter((item) => {
      const matchesType = activeType === 'all' || activeType === 'favorites' || item.type === activeType
      const matchesCategory = activeCategory === 'all' || item.categories.includes(activeCategory)
      const searchableText = [item.title, item.uuid, item.authorName, ...item.categories].join(' ').toLocaleLowerCase()
      const matchesSearch = !query || searchableText.includes(query)
      const matchesFavorites = activeType !== 'favorites' || favorites.includes(item.id)
      return matchesType && matchesCategory && matchesSearch && matchesFavorites
    })
  }, [activeCategory, activeType, favorites, items, searchQuery])

  const filteredAlbums = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    return albums.filter((album) => {
      const matchingItems = album.items.filter((item) => {
        const matchesType = activeType === 'all' || activeType === 'favorites' || item.type === activeType
        const matchesCategory = activeCategory === 'all' || item.categories.includes(activeCategory)
        const matchesFavorite = activeType !== 'favorites' || favorites.includes(item.id)
        return matchesType && matchesCategory && matchesFavorite
      })
      const searchable = [album.title, ...album.items.flatMap((item) => [item.title, item.uuid, ...item.categories])].join(' ').toLocaleLowerCase()
      return matchingItems.length > 0 && (!query || searchable.includes(query))
    })
  }, [activeCategory, activeType, albums, favorites, searchQuery])
  const pageSize = 30
  const entryCount = filteredItems.length + filteredAlbums.length
  const pageCount = Math.ceil(entryCount / pageSize)
  const pageItems = filteredItems.slice(page * pageSize, (page + 1) * pageSize)
  const pageAlbums = filteredAlbums.slice(Math.max(0, page * pageSize - filteredItems.length), Math.max(0, (page + 1) * pageSize - filteredItems.length))

  useEffect(() => {
    setPage(0)
  }, [activeCategory, activeType, searchQuery])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Галерея медиа</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Неавторизованные пользователи видят только публичные материалы. Администраторы,
            участники white-list и авторы также видят приватные видео.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          {user ? `Выполнен вход: ${user.name} (@${user.login})` : 'Режим гостя'}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Тип медиа">
        {([
          ['all', 'Все медиа'],
          ['image', 'Фотографии'],
          ['video', 'Видео'],
        ] as const).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setActiveType(type)
              setActiveCategory('all')
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeType === type
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
        {user && (
          <button
            type="button"
            onClick={() => {
              setActiveType('favorites')
              setActiveCategory('all')
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeType === 'favorites'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            Избранное
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              activeCategory === category
                ? 'bg-emerald-500 text-emerald-950'
                : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {category === 'all' ? 'Все категории' : category}
          </button>
        ))}
      </div>

      <label className="mt-6 block">
        <span className="sr-only">Поиск по галерее</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Поиск по названию, ID, автору или категории"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-500"
        />
      </label>

      {loading ? (
        <p className="mt-8 text-sm text-slate-400">Загрузка медиатеки...</p>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : filteredItems.length === 0 && filteredAlbums.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
          {activeType === 'favorites' && favorites.length === 0
            ? 'В избранном пока нет медиа.'
            : 'По вашему запросу ничего не найдено.'}
        </p>
      ) : (
        <div className="mt-8">
          <MediaGrid
            items={pageItems}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onOpen={(item) => { setReturnAlbum(null); setSelectedAlbum(null); setSelectedItem(item) }}
            albums={pageAlbums}
            onOpenAlbum={setSelectedAlbum}
          />
        </div>
      )}

      {!loading && !error && pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Страницы медиатеки">
          <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-slate-200 disabled:opacity-40">Назад</button>
          <span className="text-sm text-slate-400">Страница {page + 1} из {pageCount}</span>
          <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-slate-200 disabled:opacity-40">Далее</button>
        </nav>
      )}

      <MediaModal
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={closeMedia}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
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
          try { await loadMedia() } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Не удалось обновить альбом')
          }
        }}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  )
}
