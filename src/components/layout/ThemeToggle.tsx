/** @file Theme toggle button for switching between light and dark modes. */

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Small pill-shaped button that toggles between dark and light themes.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="inline-flex h-8 items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    >
      {isDark ? (
        <>
          <Moon className="h-3.5 w-3.5 text-slate-100" />
          <span className="hidden sm:inline">Тёмная</span>
        </>
      ) : (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-300" />
          <span className="hidden sm:inline">Светлая</span>
        </>
      )}
    </button>
  )
}
