/** @file Media management page for upload, editing, deletion and whitelist moderation. */

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  deleteMedia,
  fetchMediaList,
  updateMedia,
  uploadMedia,
} from '../lib/api'
import type { MediaItem } from '../types/media'
import { useAuth } from '../context/AuthContext'

function categoriesToString(categories: string[]): string {
  return categories.join(', ')
}

function stringToCategories(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [categories, setCategories] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const [editState, setEditState] = useState<Record<string, { title: string; categories: string; isPublic: boolean }>>({})

  const canUpload = Boolean(user && (user.isAdmin || user.whitelisted))
  const manageableItems = useMemo(() => items.filter((item) => item.canEdit), [items])

  const loadData = async () => {
    setLoading(true)
    setPageError(null)

    try {
      const mediaData = await fetchMediaList()
      setItems(mediaData.items)

      setEditState(
        Object.fromEntries(
          mediaData.items.map((item) => [
            item.uuid,
            {
              title: item.title,
              categories: categoriesToString(item.categories),
              isPublic: item.isPublic,
            },
          ]),
        ),
      )

    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [user?.uuid, user?.isAdmin])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
  }

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      setUploadMessage('Выберите файл для загрузки.')
      return
    }

    if (!canUpload) {
      setUploadMessage('Загрузка разрешена только администраторам и пользователям из white-list.')
      return
    }

    setUploading(true)
    setUploadMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('categories', JSON.stringify(stringToCategories(categories)))
      formData.append('isPublic', String(isPublic))

      await uploadMedia(formData)

      setTitle('')
      setCategories('')
      setIsPublic(true)
      setFile(null)
      setUploadMessage('Медиа успешно добавлено.')
      await loadData()
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Ошибка при загрузке медиа')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (item: MediaItem) => {
    const state = editState[item.uuid]
    if (!state) return

    try {
      await updateMedia(item.uuid, {
        title: state.title.trim(),
        categories: stringToCategories(state.categories),
        isPublic: state.isPublic,
      })
      await loadData()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Не удалось обновить медиа')
    }
  }

  const handleDelete = async (item: MediaItem) => {
    const confirmed = window.confirm(`Удалить медиа "${item.title}"?`)
    if (!confirmed) return

    try {
      await deleteMedia(item.uuid)
      await loadData()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Не удалось удалить медиа')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-slate-50">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Управление медиатекой</h1>
      <p className="mt-3 max-w-3xl text-sm text-slate-300">
        Загружать файлы могут администраторы и пользователи из white-list. Редактирование и
        удаление доступны администратору и автору конкретного медиа.
      </p>

      {user ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p>
            Текущий пользователь: <span className="font-medium text-slate-100">{user.name}</span> @{user.login}
          </p>
          <p className="mt-1 text-slate-400">
            {user.isAdmin
              ? 'У вас полный административный доступ.'
              : user.whitelisted
                ? 'Вы добавлены в white-list и можете загружать медиа.'
                : 'Вы ещё не добавлены в white-list.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          Для управления медиа необходим вход в систему.
        </div>
      )}

      {pageError && (
        <div className="mt-4 rounded-2xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-300">
          {pageError}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-lg font-medium text-slate-100">Добавление медиа</h2>
        <form onSubmit={handleUpload} className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="block text-slate-200">Название (необязательно)</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50"
                placeholder="По умолчанию будет использовано имя файла"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="block text-slate-200">Категории</span>
              <input
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50"
                placeholder="Например: anime, music, clips"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4"
            />
            Публичное медиа
          </label>

          <div className="space-y-1.5 text-sm">
            <label htmlFor="media-file" className="block text-slate-200">
              Файл
            </label>
            <input
              id="media-file"
              type="file"
              accept="video/*,image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-50 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-medium file:text-emerald-950 hover:file:bg-emerald-400"
            />
          </div>

          {uploadMessage && (
            <p className={`text-sm ${uploadMessage.includes('успешно') ? 'text-emerald-300' : 'text-red-300'}`}>
              {uploadMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={uploading || !canUpload}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? 'Загрузка...' : 'Добавить медиа'}
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-lg font-medium text-slate-100">Редактирование моих доступных медиа</h2>

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Загрузка списка медиа...</p>
        ) : manageableItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Нет медиа, доступных для редактирования.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {manageableItems.map((item) => {
              const state = editState[item.uuid]
              if (!state) return null

              return (
                <div key={item.uuid} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-400">
                        Автор: {item.authorName} • Тип: {item.type} • Расширение: .{item.extension}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-red-950 hover:bg-red-400"
                    >
                      Удалить
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={state.title}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          [item.uuid]: { ...prev[item.uuid], title: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                    />
                    <input
                      value={state.categories}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          [item.uuid]: { ...prev[item.uuid], categories: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                    />
                  </div>

                  <label className="mt-3 flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={state.isPublic}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          [item.uuid]: { ...prev[item.uuid], isPublic: e.target.checked },
                        }))
                      }
                      className="h-4 w-4"
                    />
                    Публичное медиа
                  </label>

                  <button
                    type="button"
                    onClick={() => handleSave(item)}
                    className="mt-4 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
                  >
                    Сохранить изменения
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
