/** @file Gallery page showing public media and private items for their owners/admins. */

import { useEffect, useMemo, useState } from 'react'
import { fetchMediaList } from '../lib/api'
import type { MediaItem } from '../types/media'
import { MediaGrid } from '../components/media/MediaGrid'
import { MediaModal } from '../components/media/MediaModal'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'

export default function Gallery() {
  const { isFavorite, toggleFavorite } = useFavorites()
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<'all' | 'image' | 'video'>('all')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchMediaList()
        if (!cancelled) {
          setItems(data.items)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить медиа')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [user?.uuid])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      if (activeType !== 'all' && item.type !== activeType) continue
      for (const category of item.categories) {
        set.add(category)
      }
    }
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [activeType, items])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    return items.filter((item) => {
      const matchesType = activeType === 'all' || item.type === activeType
      const matchesCategory = activeCategory === 'all' || item.categories.includes(activeCategory)
      const searchableText = [item.title, item.authorName, ...item.categories].join(' ').toLocaleLowerCase()
      const matchesSearch = !query || searchableText.includes(query)
      return matchesType && matchesCategory && matchesSearch
    })
  }, [activeCategory, activeType, items, searchQuery])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Галерея медиа</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Неавторизованные пользователи видят только публичные материалы. Автор и администратор
            дополнительно видят свои непубличные записи.
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
          placeholder="Поиск по названию, автору или категории"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-500"
        />
      </label>

      {loading ? (
        <p className="mt-8 text-sm text-slate-400">Загрузка медиатеки...</p>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
          По вашему запросу ничего не найдено.
        </p>
      ) : (
        <div className="mt-8">
          <MediaGrid
            items={filteredItems}
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
