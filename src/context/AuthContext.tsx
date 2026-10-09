/** @file React context for token-based authentication. */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types/media'
import { fetchCurrentUser, loginUser, logoutUser, registerUser, setToken } from '../lib/api'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (login: string, password: string) => Promise<void>
  register: (login: string, password: string, name?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async (): Promise<void> => {
    const nextUser = await fetchCurrentUser()
    setUser(nextUser)
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        await refreshUser()
      } catch {
        setToken(null)
        if (!cancelled) {
          setUser(null)
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
  }, [])

  const login = async (loginValue: string, password: string): Promise<void> => {
    const response = await loginUser(loginValue.trim(), password)
    setToken(response.token)
    setUser(response.user)
  }

  const register = async (loginValue: string, password: string, name?: string): Promise<void> => {
    const response = await registerUser(loginValue.trim(), password, name?.trim() || undefined)
    setToken(response.token)
    setUser(response.user)
  }

  const logout = (): void => {
    void logoutUser().catch(() => {})
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
