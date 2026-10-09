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

export async function uploadMedia(formData: FormData): Promise<void> {
  const res = await apiFetch(`${API_BASE}/media`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw await parseError(res, 'Failed to upload media')
  }
}

export async function logoutUser(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' })
  if (!res.ok) {
    throw await parseError(res, 'Failed to logout')
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

export async function fetchAdminUsers(): Promise<AuthUser[]> {
  const res = await apiFetch(`${API_BASE}/admin/users`)
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
