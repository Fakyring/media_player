/** @file API helpers for the MongoDB-backed media backend. */

import type { AuthResponse, AuthUser, MediaListResponse } from '../types/media'

const API_BASE = '/api'

function getToken(): string | null {
  try {
    return window.localStorage.getItem('authToken')
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem('authToken', token)
    } else {
      window.localStorage.removeItem('authToken')
    }
  } catch {
    // Ignore storage errors.
  }
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {})
  const token = getToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  return response
}

async function parseError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = (await response.json()) as { error?: string }
    return new Error(data.error || fallback)
  } catch {
    return new Error(fallback)
  }
}

export async function registerUser(login: string, password: string, name?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ login, password, name }),
  })

  if (!res.ok) {
    throw await parseError(res, 'Failed to register')
  }

  return (await res.json()) as AuthResponse
}

export async function loginUser(login: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ login, password }),
  })

  if (!res.ok) {
    throw await parseError(res, 'Failed to login')
  }

  return (await res.json()) as AuthResponse
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/auth/me`)
  if (!res.ok) {
    throw await parseError(res, 'Failed to fetch current user')
  }

  const data = (await res.json()) as { user: AuthUser }
  return data.user
}

export async function fetchMediaList(): Promise<MediaListResponse> {
  const res = await apiFetch(`${API_BASE}/media`)
  if (!res.ok) {
    throw await parseError(res, 'Failed to fetch media list')
  }

  return (await res.json()) as MediaListResponse
}

export async function fetchMediaFile(src: string): Promise<string> {
  const res = await apiFetch(src)
  if (!res.ok) {
    throw await parseError(res, 'Failed to fetch media file')
  }
  return URL.createObjectURL(await res.blob())
}

export async function getFavorites(): Promise<string[]> {
  const res = await apiFetch(`${API_BASE}/users/me/favorites`)
  if (!res.ok) {
    throw await parseError(res, 'Failed to fetch favorites')
  }

  const data = (await res.json()) as { favorites: string[] }
  return data.favorites ?? []
}

export async function updateFavorites(favorites: string[]): Promise<void> {
  const res = await apiFetch(`${API_BASE}/users/me/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ favorites }),
  })

  if (!res.ok) {
    throw await parseError(res, 'Failed to update favorites')
  }
}

export function uploadMedia(
  formData: FormData,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ albumUuid?: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${API_BASE}/media`)
    const token = getToken()
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total)
    }
    request.onerror = () => reject(new Error('Сетевая ошибка при отправке файла'))
    request.onabort = () => reject(new Error('Загрузка файла была прервана'))
    request.onload = () => {
      let data: { albumUuid?: string; error?: string } = {}
      try {
        data = JSON.parse(request.responseText)
      } catch {
        // Use the HTTP status when the server response is not JSON.
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(data.error || `Ошибка сервера (${request.status})`))
        return
      }
      resolve(data)
    }
    request.send(formData)
  })
}

export async function deleteAlbum(albumUuid: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/albums/${encodeURIComponent(albumUuid)}`, { method: 'DELETE' })
  if (!res.ok) throw await parseError(res, 'Failed to delete album')
}

export async function addMediaToAlbum(albumUuid: string, mediaUuid: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/albums/${encodeURIComponent(albumUuid)}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaUuid }),
  })
  if (!res.ok) throw await parseError(res, 'Failed to add media to album')
}

export async function removeMediaFromAlbum(albumUuid: string, mediaUuid: string): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/albums/${encodeURIComponent(albumUuid)}/items/${encodeURIComponent(mediaUuid)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw await parseError(res, 'Failed to remove media from album')
}

export async function logoutUser(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' })
  if (!res.ok) {
    throw await parseError(res, 'Failed to logout')
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) {
    throw await parseError(res, 'Failed to change password')
  }
}

export async function updateMedia(
  mediaUuid: string,
  payload: { title: string; categories: string[]; isPublic: boolean },
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/media/${encodeURIComponent(mediaUuid)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw await parseError(res, 'Failed to update media')
  }
}

export async function deleteMedia(mediaUuid: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/media/${encodeURIComponent(mediaUuid)}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    throw await parseError(res, 'Failed to delete media')
  }
}

export async function deleteMediaBulk(mediaUuids: string[]): Promise<{ deleted: string[]; rejected: string[] }> {
  const res = await apiFetch(`${API_BASE}/media/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuids: mediaUuids }),
  })
  if (!res.ok) throw await parseError(res, 'Failed to delete selected media')
  return (await res.json()) as { deleted: string[]; rejected: string[] }
}

export async function fetchAdminUsers(search = ''): Promise<AuthUser[]> {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  const res = await apiFetch(`${API_BASE}/admin/users?${params.toString()}`)
  if (!res.ok) {
    throw await parseError(res, 'Failed to fetch users')
  }

  const data = (await res.json()) as { users: AuthUser[] }
  return data.users
}

export async function updateUserWhitelist(userUuid: string, whitelisted: boolean): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/admin/users/${encodeURIComponent(userUuid)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ whitelisted }),
  })

  if (!res.ok) {
    throw await parseError(res, 'Failed to update user')
  }

  const data = (await res.json()) as { user: AuthUser }
  return data.user
}
