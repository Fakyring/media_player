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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [fileTitles, setFileTitles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [mediaSearch, setMediaSearch] = useState('')

  const [editState, setEditState] = useState<Record<string, { title: string; categories: string; isPublic: boolean }>>({})

  const canUpload = Boolean(user && (user.isAdmin || user.whitelisted))
  const availableCategories = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.categories))).sort((a, b) => a.localeCompare(b)),
    [items],
  )
  const matchingCategories = useMemo(() => {
    const query = categoryInput.trim().toLocaleLowerCase()
    return availableCategories
      .filter(
        (category) =>
          !selectedCategories.includes(category) &&
          (!query || category.toLocaleLowerCase().includes(query)),
      )
      .slice(0, 8)
  }, [availableCategories, categoryInput, selectedCategories])
  const manageableItems = useMemo(() => {
    const query = mediaSearch.trim().toLocaleLowerCase()
    return items.filter((item) => {
      if (!item.canEdit) return false
      if (!query) return true
      const searchableText = [item.title, item.authorName, ...item.categories].join(' ').toLocaleLowerCase()
      return searchableText.includes(query)
    })
  }, [items, mediaSearch])

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
    const selectedFiles = Array.from(event.target.files ?? [])
    setFiles(selectedFiles)
    setFileTitles(selectedFiles.map((file) => file.name.replace(/\.[^.]+$/, '')))
  }

  const addCategory = (value: string) => {
    const category = value.trim().toLocaleLowerCase()
    if (!category) return
    setSelectedCategories((current) => (current.includes(category) ? current : [...current, category]))
    setCategoryInput('')
    setCategoriesOpen(false)
  }

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (files.length === 0) {
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
      files.forEach((file) => formData.append('files', file))
      formData.append(
        'titles',
        JSON.stringify(fileTitles.map((fileTitle) => fileTitle.trim() || title.trim())),
      )
      formData.append('categories', JSON.stringify(selectedCategories))
      formData.append('isPublic', String(isPublic))

      await uploadMedia(formData)

      setTitle('')
      setSelectedCategories([])
      setCategoryInput('')
      setIsPublic(true)
      setFiles([])
      setFileTitles([])
      setUploadMessage(`Успешно добавлено файлов: ${files.length}.`)
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

            <div className="space-y-1.5 text-sm">
              <label htmlFor="category-input" className="block text-slate-200">
                Категории
              </label>
              <div className="relative">
                <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 focus-within:border-emerald-500">
                  {selectedCategories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200 ring-1 ring-emerald-500/30"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategories((current) => current.filter((item) => item !== category))
                        }
                        className="rounded-full px-1 text-emerald-200/70 hover:bg-emerald-500/20 hover:text-emerald-100"
                        aria-label={`Удалить категорию ${category}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    id="category-input"
                    value={categoryInput}
                    onFocus={() => setCategoriesOpen(true)}
                    onChange={(event) => {
                      setCategoryInput(event.target.value)
                      setCategoriesOpen(true)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault()
                        addCategory(categoryInput)
                      } else if (event.key === 'Backspace' && !categoryInput && selectedCategories.length) {
                        setSelectedCategories((current) => current.slice(0, -1))
                      } else if (event.key === 'Escape') {
                        setCategoriesOpen(false)
                      }
                    }}
                    onBlur={() => window.setTimeout(() => setCategoriesOpen(false), 120)}
                    className="min-w-[140px] flex-1 bg-transparent py-1 text-slate-50 outline-none placeholder:text-slate-500"
                    placeholder={selectedCategories.length ? 'Добавить категорию...' : 'Введите или выберите категорию'}
                    autoComplete="off"
                  />
                </div>

                {categoriesOpen && (matchingCategories.length > 0 || categoryInput.trim()) && (
                  <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/40">
                    {matchingCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addCategory(category)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                      >
                        <span>{category}</span>
                        <span className="text-xs text-slate-500">Существующая категория</span>
                      </button>
                    ))}
                    {categoryInput.trim() &&
                      !availableCategories.some(
                        (category) => category.toLocaleLowerCase() === categoryInput.trim().toLocaleLowerCase(),
                      ) &&
                      !selectedCategories.includes(categoryInput.trim().toLocaleLowerCase()) && (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addCategory(categoryInput)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-emerald-200 hover:bg-slate-800"
                        >
                          <span>Создать «{categoryInput.trim()}»</span>
                          <span className="text-xs text-emerald-500">Новая</span>
                        </button>
                      )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">Введите новую категорию или выберите подходящую из списка. Enter добавляет введённое значение.</p>
            </div>
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
              multiple
              accept="video/*,image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-50 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-medium file:text-emerald-950 hover:file:bg-emerald-400"
            />
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-400">Файлов выбрано: {files.length}. Можно изменить название каждого:</p>
                {files.map((selectedFile, index) => (
                  <label key={`${selectedFile.name}-${index}`} className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="min-w-0 flex-1 truncate">{selectedFile.name}</span>
                    <input
                      value={fileTitles[index] ?? ''}
                      onChange={(event) =>
                        setFileTitles((current) =>
                          current.map((value, titleIndex) =>
                            titleIndex === index ? event.target.value : value,
                          ),
                        )
                      }
                      className="w-1/2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50"
                      aria-label={`Название файла ${selectedFile.name}`}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {uploadMessage && (
            <p className={`text-sm ${uploadMessage.startsWith('Успешно добавлено') ? 'text-emerald-300' : 'text-red-300'}`}>
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

        <label className="mt-4 block">
          <span className="sr-only">Поиск по медиа</span>
          <input
            type="search"
            value={mediaSearch}
            onChange={(event) => setMediaSearch(event.target.value)}
            placeholder="Поиск по названию, автору или категории"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-500"
          />
        </label>

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Загрузка списка медиа...</p>
        ) : manageableItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            {mediaSearch.trim()
              ? 'По вашему запросу ничего не найдено.'
              : 'Нет медиа, доступных для редактирования.'}
          </p>
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
