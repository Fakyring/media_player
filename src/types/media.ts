/** @file Shared TypeScript types for media items, categories and auth entities. */

export interface MediaItem {
  id: string
  uuid: string
  type: 'video' | 'image'
  extension: string
  title: string
  categories: string[]
  isPublic: boolean
  src: string
  authorUuid: string
  authorName: string
  canEdit: boolean
  createdAt?: string
  updatedAt?: string
}

export interface MediaCategory {
  id: string
  name: string
  count?: number
}

export interface MediaListResponse {
  categories: MediaCategory[]
  items: MediaItem[]
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
