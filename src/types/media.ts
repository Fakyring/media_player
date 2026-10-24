/** @file Shared TypeScript types for media items, categories and auth entities. */

export interface MediaItem {
  id: string
  uuid: string
  type: 'video' | 'image'
  extension: string
  title: string
  categories: string[]
  albumUuid?: string | null
  isPublic: boolean
  src: string
  authorUuid: string
  authorName: string
  canEdit: boolean
  createdAt?: string
  fileModifiedAt?: string | null
  updatedAt?: string
}

export interface MediaAlbum {
  id: string
  uuid: string
  title: string
  authorName: string
  canEdit: boolean
  preview: MediaItem
  items: MediaItem[]
}

export interface MediaCategory {
  id: string
  name: string
  count?: number
}

export interface MediaListResponse {
  categories: MediaCategory[]
  items: MediaItem[]
  albums: MediaAlbum[]
}

export interface AuthUser {
  uuid: string
  login: string
  name: string
  isAdmin: boolean
  whitelisted: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}
