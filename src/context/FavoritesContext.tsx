/** @file React context for managing user media favorites with backend synchronization. */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { getFavorites, updateFavorites } from '../lib/api'

/**
 * Shape of the favorites context value.
 */
interface FavoritesContextValue {
  /** List of favorite media item IDs for current user. */
  favorites: string[]
  /** Returns true if id is present in favorites. */
  isFavorite: (id: string) => boolean
  /** Toggles favorite state of a media item. */
  toggleFavorite: (id: string) => void
  /** Clears all favorites locally (and remotely if user is logged in). */
  clearFavorites: () => void
  /** Indicates if favorites are currently being loaded from backend. */
  loading: boolean
}

/**
 * Internal context instance for favorites.
 */
const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined)

/**
 * Hook to access favorites context safely.
 *
 * @returns {FavoritesContextValue} Favorites context value.
 */
export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider')
  }
  return ctx
}

/**
 * Props for FavoritesProvider component.
 */
interface FavoritesProviderProps {
  /** Children that receive access to favorites context. */
  children: ReactNode
}

/**
 * Provider that manages favorites list and synchronizes it with backend
 * for the currently logged-in user.
 *
 * @param {FavoritesProviderProps} props - Component props.
 * @returns {JSX.Element} Provider wrapping children.
 */
export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { isAuthenticated } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Load favorites whenever auth state changes.
  useEffect(() => {
    if (!isAuthenticated) {
      setFavorites([])
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const list = await getFavorites()
        if (!cancelled) {
          setFavorites(list)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load favorites', error)
        if (!cancelled) {
          setFavorites([])
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
  }, [isAuthenticated])

  /**
   * Returns true if the given ID is in favorites.
   *
   * @param {string} id - Media item ID.
   * @returns {boolean} True if ID is favorite.
   */
  const isFavorite = (id: string): boolean => favorites.includes(id)

  /**
   * Persists favorites to backend for current user if logged in.
   *
   * @param {string[]} next - New favorites list.
   */
  const persistIfPossible = (next: string[]): void => {
    if (!isAuthenticated) return
    // Fire-and-forget; errors are logged but do not break UI.
    void (async () => {
      try {
        await updateFavorites(next)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to update favorites', error)
      }
    })()
  }

  /**
   * Toggles favorite state of one media item.
   *
   * @param {string} id - Media item ID.
   */
  const toggleFavorite = (id: string): void => {
    setFavorites((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((itemId) => itemId !== id) : [...prev, id]
      persistIfPossible(next)
      return next
    })
  }

  /**
   * Clears all favorites locally and on backend if user is logged in.
   */
  const clearFavorites = (): void => {
    setFavorites([])
    persistIfPossible([])
  }

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      clearFavorites,
      loading,
    }),
    [favorites, loading],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
