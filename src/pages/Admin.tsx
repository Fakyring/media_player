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
import { CategoryPicker } from '../components/media/CategoryPicker'

export default function Admin() {
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [isPublic, setIsPublic] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [fileTitles, setFileTitles] = useState<string[]>([])
  const [fileCategories, setFileCategories] = useState<string[][]>([])
  const [fileModifiedDates, setFileModifiedDates] = useState<number[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [mediaSearch, setMediaSearch] = useState('')

  const [editState, setEditState] = useState<Record<string, { title: string; categories: string[]; isPublic: boolean }>>({})

  const canUpload = Boolean(user && (user.isAdmin || user.whitelisted))
  const availableCategories = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.categories))).sort((a, b) => a.localeCompare(b)),
    [items],
  )
  const manageableItems = useMemo(() => {
    const query = mediaSearch.trim().toLocaleLowerCase()
    return items.filter((item) => {
      if (!item.canEdit) return false
      if (!query) return true
      const searchableText = [item.title, item.uuid, item.authorName, ...item.categories].join(' ').toLocaleLowerCase()
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
              categories: item.categories,
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
    if (!canUpload) {
      setLoading(false)
      return
    }
    void loadData()
  }, [user?.uuid, user?.isAdmin, user?.whitelisted])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    const nextFiles = [...files]
    const nextTitles = [...fileTitles]
    const addedFiles: File[] = []

    for (const file of selectedFiles) {
      const duplicate = nextFiles.some(
        (current) =>
          current.name === file.name &&
          current.size === file.size &&
          current.lastModified === file.lastModified,
      )
      if (duplicate) continue
      if (nextFiles.length >= 20) {
        setUploadMessage('Можно выбрать не более 20 файлов за раз.')
        break
      }
      nextFiles.push(file)
      nextTitles.push('')
      addedFiles.push(file)
    }

    setFiles(nextFiles)
    setFileTitles(nextTitles)
    setFileCategories((current) => [...current, ...addedFiles.map(() => [])])
    setFileModifiedDates((current) => [...current, ...addedFiles.map((file) => file.lastModified)])
  }

  const removeSelectedFile = (index: number) => {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
    setFileTitles((current) => current.filter((_, titleIndex) => titleIndex !== index))
    setFileCategories((current) => current.filter((_, categoryIndex) => categoryIndex !== index))
    setFileModifiedDates((current) => current.filter((_, dateIndex) => dateIndex !== index))
  }

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (files.length === 0) {
      setUploadMessage('Выберите файл для загрузки.')
      return
    }

    if (fileTitles.some((fileTitle) => !fileTitle.trim())) {
      setUploadMessage('Укажите название для каждого файла.')
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
        JSON.stringify(fileTitles.map((fileTitle) => fileTitle.trim())),
      )
      formData.append('categoriesByFile', JSON.stringify(fileCategories))
      formData.append('fileModifiedDates', JSON.stringify(fileModifiedDates))
      formData.append('isPublic', String(isPublic))

      await uploadMedia(formData)

      setIsPublic(true)
      setFiles([])
      setFileTitles([])
      setFileCategories([])
      setFileModifiedDates([])
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
        categories: state.categories,
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

  if (!canUpload) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-slate-50">
        <h1 className="text-2xl font-semibold">Управление медиатекой</h1>
        <p className="mt-3 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          Панель доступна только администраторам и пользователям из white-list.
        </p>
      </div>
    )
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
                <p className="text-xs text-slate-400">Файлов выбрано: {files.length}. Укажите название и категории каждого:</p>
                {files.map((selectedFile, index) => (
                  <div key={`${selectedFile.name}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-950/50 hover:text-red-300"
                        aria-label={`Убрать файл ${selectedFile.name}`}
                      >
                        Убрать
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        required
                        value={fileTitles[index] ?? ''}
                        onChange={(event) =>
                          setFileTitles((current) =>
                            current.map((value, titleIndex) =>
                              titleIndex === index ? event.target.value : value,
                            ),
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                        placeholder="Название медиа"
                        aria-label={`Название файла ${selectedFile.name}`}
                      />
                      <CategoryPicker
                        id={`upload-categories-${index}`}
                        value={fileCategories[index] ?? []}
                        options={availableCategories}
                        onChange={(value) =>
                          setFileCategories((current) =>
                            current.map((categories, categoryIndex) =>
                              categoryIndex === index ? value : categories,
                            ),
                          )
                        }
                        placeholder="Категории этого медиа"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Исходный файл изменён: {fileModifiedDates[index] ? new Date(fileModifiedDates[index]).toLocaleString() : 'дата неизвестна'}
                    </p>
                  </div>
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
            placeholder="Поиск по названию, ID, автору или категории"
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
                      <p className="mt-1 text-xs text-slate-500">
                        Исходный файл изменён: {item.fileModifiedAt ? new Date(item.fileModifiedAt).toLocaleString() : 'дата неизвестна'}
                        {' • '}
                        Загружено: {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'дата неизвестна'}
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
                      required
                      value={state.title}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          [item.uuid]: { ...prev[item.uuid], title: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                    />
                    <CategoryPicker
                      id={`edit-categories-${item.uuid}`}
                      value={state.categories}
                      options={availableCategories}
                      onChange={(categories) =>
                        setEditState((prev) => ({
                          ...prev,
                          [item.uuid]: { ...prev[item.uuid], categories },
                        }))
                      }
                      placeholder="Добавить или выбрать категории"
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
