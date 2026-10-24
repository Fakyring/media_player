/** @file Media management page for upload, editing, deletion and whitelist moderation. */

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  deleteMedia,
  deleteMediaBulk,
  deleteAlbum,
  fetchMediaList,
  updateMedia,
  uploadMedia,
} from '../lib/api'
import type { MediaAlbum, MediaItem } from '../types/media'
import { useAuth } from '../context/AuthContext'
import { CategoryPicker } from '../components/media/CategoryPicker'

export default function Admin() {
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [albums, setAlbums] = useState<MediaAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [isPublic, setIsPublic] = useState(true)
  const [createAlbum, setCreateAlbum] = useState(false)
  const [albumTitle, setAlbumTitle] = useState('')
  const [uploadAlbumUuid, setUploadAlbumUuid] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileTitles, setFileTitles] = useState<string[]>([])
  const [fileCategories, setFileCategories] = useState<string[][]>([])
  const [fileModifiedDates, setFileModifiedDates] = useState<number[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ processed: number; total: number; succeeded: number; currentFile: string; bytesUploaded: number; totalBytes: number } | null>(null)
  const [uploadFailures, setUploadFailures] = useState<Array<{ name: string; message: string }>>([])
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [mediaSearch, setMediaSearch] = useState('')
  const [selectedMediaUuids, setSelectedMediaUuids] = useState<string[]>([])
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deletingAlbumUuid, setDeletingAlbumUuid] = useState<string | null>(null)

  const [editState, setEditState] = useState<Record<string, { title: string; categories: string[]; isPublic: boolean }>>({})

  const canUpload = Boolean(user && (user.isAdmin || user.whitelisted))
  const canManage = Boolean(user)
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
      if (!user) return
      setItems(mediaData.items)
      setAlbums(mediaData.albums ?? [])

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
      if (user) setPageError(error instanceof Error ? error.message : 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canManage) {
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
      if (nextFiles.length >= 100) {
        setUploadMessage('Можно выбрать не более 100 файлов за раз.')
        break
      }
      nextFiles.push(file)
      nextTitles.push(file.name.replace(/\.[^.]+$/, ''))
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

    if (!canUpload) {
      setUploadMessage('Загрузка разрешена только администраторам и пользователям из white-list.')
      return
    }

    setUploading(true)
    setUploadMessage(null)
    setUploadFailures([])
    const uploadFiles = [...files]
    const totalBytes = uploadFiles.reduce((sum, file) => sum + file.size, 0)
    let bytesUploaded = 0
    setUploadProgress({ processed: 0, total: uploadFiles.length, succeeded: 0, currentFile: uploadFiles[0].name, bytesUploaded, totalBytes })
    let albumUuid: string | undefined = uploadAlbumUuid || undefined
    let succeeded = 0
    const failedIndexes: number[] = []
    const failures: Array<{ name: string; message: string }> = []

    try {
      for (let index = 0; index < uploadFiles.length; index += 1) {
        const file = uploadFiles[index]
        setUploadProgress({ processed: index, total: uploadFiles.length, succeeded, currentFile: file.name, bytesUploaded, totalBytes })
        const formData = new FormData()
        formData.append('files', file)
        formData.append('titles', JSON.stringify([fileTitles[index]?.trim() ?? '']))
        formData.append('categoriesByFile', JSON.stringify([fileCategories[index] ?? []]))
        formData.append('fileModifiedDates', JSON.stringify([fileModifiedDates[index] ?? file.lastModified]))
        formData.append('isPublic', String(isPublic))
        if (albumUuid) formData.append('albumUuid', albumUuid)
        else if (createAlbum) formData.append('albumTitle', albumTitle.trim())

        try {
          const result = await uploadMedia(formData, (loaded, requestTotal) => {
            const fileProgress = requestTotal > 0 ? Math.min(1, loaded / requestTotal) : 0
            setUploadProgress({
              processed: index,
              total: uploadFiles.length,
              succeeded,
              currentFile: file.name,
              bytesUploaded: bytesUploaded + file.size * fileProgress,
              totalBytes,
            })
          })
          albumUuid = result.albumUuid || albumUuid
          succeeded += 1
        } catch (error) {
          failedIndexes.push(index)
          failures.push({
            name: file.name,
            message: error instanceof Error ? error.message : 'Неизвестная ошибка загрузки',
          })
        }
        bytesUploaded += file.size
        setUploadProgress({ processed: index + 1, total: uploadFiles.length, succeeded, currentFile: file.name, bytesUploaded, totalBytes })
      }

      const retainFailed = <T,>(values: T[]) => failedIndexes.map((index) => values[index])
      if (failedIndexes.length > 0) {
        setFiles(retainFailed(uploadFiles))
        setFileTitles(retainFailed(fileTitles))
        setFileCategories(retainFailed(fileCategories))
        setFileModifiedDates(retainFailed(fileModifiedDates))
        setUploadAlbumUuid(albumUuid || null)
        setUploadFailures(failures)
        setUploadMessage(`Загружено ${succeeded} из ${uploadFiles.length}. Неудачные файлы оставлены для повторной попытки.`)
      } else {
        setIsPublic(true)
        setCreateAlbum(false)
        setAlbumTitle('')
        setUploadAlbumUuid(null)
        setFiles([])
        setFileTitles([])
        setFileCategories([])
        setFileModifiedDates([])
        setUploadMessage(`Успешно добавлено файлов: ${succeeded}.`)
      }
      await loadData()
    } finally {
      setUploading(false)
      setUploadProgress(null)
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

  const handleBulkDelete = async () => {
    if (selectedMediaUuids.length === 0) return
    const confirmed = window.confirm(`Удалить выбранные медиа (${selectedMediaUuids.length})? Это действие нельзя отменить.`)
    if (!confirmed) return
    setBulkDeleting(true)
    setBulkDeleteError(null)
    const selected = [...selectedMediaUuids]
    const deleted: string[] = []
    const rejected: string[] = []
    let nextOffset = 0
    try {
      for (nextOffset = 0; nextOffset < selected.length; nextOffset += 100) {
        const result = await deleteMediaBulk(selected.slice(nextOffset, nextOffset + 100))
        deleted.push(...result.deleted)
        rejected.push(...result.rejected)
      }
      setSelectedMediaUuids(rejected)
      if (rejected.length > 0) setBulkDeleteError(`Удалено ${deleted.length}. Не удалось удалить ${rejected.length}: возможно, нет прав на эти элементы.`)
      await loadData()
    } catch (error) {
      setSelectedMediaUuids([...rejected, ...selected.slice(nextOffset)])
      if (deleted.length > 0) {
        setBulkDeleteError(`Удалено ${deleted.length}; оставшиеся элементы сохранены в выборе. ${error instanceof Error ? error.message : ''}`)
      } else {
        setBulkDeleteError(error instanceof Error ? error.message : 'Не удалось удалить выбранные медиа')
      }
      await loadData()
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleMediaSelection = (uuid: string) => {
    setSelectedMediaUuids((current) => current.includes(uuid) ? current.filter((value) => value !== uuid) : [...current, uuid])
  }

  const handleDeleteAlbum = async (album: MediaAlbum) => {
    const confirmed = window.confirm(`Удалить альбом «${album.title}» и все ${album.items.length} медиафайлов в нём? Это действие нельзя отменить.`)
    if (!confirmed) return
    setDeletingAlbumUuid(album.uuid)
    try {
      await deleteAlbum(album.uuid)
      await loadData()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Не удалось удалить альбом')
    } finally {
      setDeletingAlbumUuid(null)
    }
  }

  if (!canUpload) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-slate-50">
        <h1 className="text-2xl font-semibold">Управление медиатекой</h1>
        <p className="mt-3 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          Войдите в систему, чтобы управлять своими медиа.
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

      {canUpload && <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
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

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={createAlbum}
              onChange={(event) => setCreateAlbum(event.target.checked)}
              className="h-4 w-4"
            />
            Объединить выбранные файлы в альбом
          </label>
          {createAlbum && (
            <input
              required
              maxLength={200}
              value={albumTitle}
              onChange={(event) => setAlbumTitle(event.target.value)}
              placeholder="Название альбома"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
            />
          )}

          <div className="space-y-1.5 text-sm">
            <label htmlFor="media-file" className="block text-slate-200">
              Файл
            </label>
            <input
              id="media-file"
              type="file"
              multiple
              accept=".mp4,.webm,.mov,.avi,.mkv,.m4v,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-50 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-medium file:text-emerald-950 hover:file:bg-emerald-400"
            />
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-400">Файлов выбрано: {files.length} из 100. Название можно изменить; по умолчанию используется имя файла.</p>
                {files.map((selectedFile, index) => (
                  <div key={`${selectedFile.name}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        disabled={uploading}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-950/50 hover:text-red-300"
                        aria-label={`Убрать файл ${selectedFile.name}`}
                      >
                        Убрать
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={fileTitles[index] ?? ''}
                        onChange={(event) =>
                          setFileTitles((current) =>
                            current.map((value, titleIndex) =>
                              titleIndex === index ? event.target.value : value,
                            ),
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
                        placeholder={selectedFile.name.replace(/\.[^.]+$/, '') || 'Название медиа'}
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

          {uploadProgress && (
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3" aria-live="polite">
              <div className="flex justify-between gap-3 text-sm text-slate-200">
                <span>{uploadProgress.processed} из {uploadProgress.total} файлов</span>
                <span>{uploadProgress.succeeded} успешно · {uploadProgress.totalBytes > 0 ? Math.floor((uploadProgress.bytesUploaded / uploadProgress.totalBytes) * 100) : 0}%</span>
              </div>
              <progress className="h-2 w-full accent-emerald-500" max={uploadProgress.totalBytes} value={uploadProgress.bytesUploaded} />
              <p className="truncate text-xs text-slate-400">{uploadProgress.processed < uploadProgress.total ? `Сейчас: ${uploadProgress.currentFile}` : 'Проверка результата...'}</p>
            </div>
          )}
          {uploadMessage && (
            <p className={`text-sm ${uploadMessage.startsWith('Успешно добавлено') ? 'text-emerald-300' : 'text-red-300'}`}>
              {uploadMessage}
            </p>
          )}
          {uploadFailures.length > 0 && (
            <div className="rounded-xl border border-red-800/70 bg-red-950/30 p-3" role="alert">
              <h3 className="text-sm font-medium text-red-200">Не удалось загрузить ({uploadFailures.length})</h3>
              <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                {uploadFailures.map((failure, index) => (
                  <li key={`${failure.name}-${index}`} className="break-words text-xs text-red-200">
                    <span className="font-medium">{failure.name}</span>: {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !canUpload}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? 'Загрузка...' : 'Добавить медиа'}
          </button>
        </form>
      </section>}

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-lg font-medium text-slate-100">Мои альбомы</h2>
        {albums.filter((album) => album.canEdit).length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Нет альбомов, доступных для управления.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {albums.filter((album) => album.canEdit).map((album) => (
              <div key={album.uuid} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{album.title}</p>
                  <p className="text-xs text-slate-400">{album.items.length} элементов</p>
                </div>
                <button type="button" disabled={deletingAlbumUuid === album.uuid} onClick={() => void handleDeleteAlbum(album)} className="shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-red-950 hover:bg-red-400 disabled:opacity-50">{deletingAlbumUuid === album.uuid ? 'Удаление...' : 'Удалить альбом'}</button>
              </div>
            ))}
          </div>
        )}
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
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={manageableItems.length > 0 && manageableItems.every((item) => selectedMediaUuids.includes(item.uuid))}
                onChange={(event) => setSelectedMediaUuids((current) => event.target.checked
                  ? Array.from(new Set([...current, ...manageableItems.map((item) => item.uuid)]))
                  : current.filter((uuid) => !manageableItems.some((item) => item.uuid === uuid)))}
                className="h-4 w-4"
              />
              Выбрать все показанные ({manageableItems.length})
            </label>
            {manageableItems.map((item) => {
              const state = editState[item.uuid]
              if (!state) return null

              return (
                <div key={item.uuid} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedMediaUuids.includes(item.uuid)}
                        onChange={() => toggleMediaSelection(item.uuid)}
                        className="mr-2 h-4 w-4 align-middle"
                        aria-label={`Выбрать ${item.title} для удаления`}
                      />
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

      {selectedMediaUuids.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-200">Будет удалено медиа: <strong>{selectedMediaUuids.length}</strong></p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={bulkDeleting} onClick={() => setSelectedMediaUuids([])} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 disabled:opacity-50">Снять выбор</button>
              <button type="button" disabled={bulkDeleting} onClick={() => void handleBulkDelete()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-red-950 disabled:opacity-50">{bulkDeleting ? 'Удаление...' : `Удалить выбранные (${selectedMediaUuids.length})`}</button>
            </div>
            {bulkDeleteError && <p className="w-full text-sm text-red-300" role="alert">{bulkDeleteError}</p>}
          </div>
        </div>
      )}

    </div>
  )
}
