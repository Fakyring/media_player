/** @file React context that keeps the application in dark mode. */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark'

/**
 * Shape of the theme context value.
 */
interface ThemeContextValue {
  /** Current theme. */
  theme: Theme
  /** Keeps the theme API stable; the application only supports dark mode. */
  setTheme: (theme: Theme) => void
  /** No-op because dark mode is fixed. */
  toggleTheme: () => void
}

/**
 * Internal theme context.
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/**
 * Hook to access theme context.
 *
 * @returns {ThemeContextValue} Theme context value.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}

/**
 * Props for ThemeProvider component.
 */
interface ThemeProviderProps {
  /** Children that should receive theme context. */
  children: ReactNode
}

/**
 * Provider that manages light/dark theme, stores it in localStorage
 * and synchronizes the "dark" class on document.documentElement.
 *
 * @param {ThemeProviderProps} props - Component props.
 * @returns {JSX.Element} Provider wrapping children.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    setThemeState('dark')
    window.document.documentElement.classList.add('dark')
    try {
      window.localStorage.setItem('theme', 'dark')
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const setTheme = (_next: Theme): void => {}
  const toggleTheme = (): void => {}

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
