/** @file React context for managing light/dark theme with persistence and document class sync. */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Application theme variants.
 */
type Theme = 'light' | 'dark'

/**
 * Shape of the theme context value.
 */
interface ThemeContextValue {
  /** Current theme. */
  theme: Theme
  /** Sets theme to explicit value. */
  setTheme: (theme: Theme) => void
  /** Toggles between light and dark themes. */
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

  /**
   * Applies current theme to document root element.
   *
   * @param {Theme} nextTheme - Theme to apply.
   */
  const applyThemeToDocument = (nextTheme: Theme): void => {
    const root = window.document.documentElement
    if (nextTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Initialize theme from localStorage or system preference.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('theme') as Theme | null
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored)
        applyThemeToDocument(stored)
        return
      }
    } catch {
      // Ignore storage errors and fallback to media query.
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const initial: Theme = prefersDark ? 'dark' : 'light'
    setThemeState(initial)
    applyThemeToDocument(initial)
  }, [])

  /**
   * Sets theme and persists it.
   *
   * @param {Theme} next - Theme value to set.
   */
  const setTheme = (next: Theme): void => {
    setThemeState(next)
    try {
      window.localStorage.setItem('theme', next)
    } catch {
      // Ignore storage errors.
    }
    applyThemeToDocument(next)
  }

  /**
   * Toggles between light and dark themes.
   */
  const toggleTheme = (): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

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
