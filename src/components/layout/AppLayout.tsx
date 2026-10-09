/** @file Application shell with header navigation, auth controls and theme toggle. */

import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, login, register, logout, loading } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const isActive = (path: string) => location.pathname === path

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setAuthError(null)

    try {
      if (mode === 'login') {
        await login(loginValue, password)
      } else {
        await register(loginValue, password, name)
      }

      setPassword('')
      setName('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-50"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-sky-500 text-xs font-bold text-emerald-950 shadow-md shadow-emerald-500/40">
                M
              </span>
              <span>Media Library</span>
            </button>

            <nav className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`rounded-full px-3 py-1.5 ${
                  isActive('/') ? 'bg-slate-800 text-slate-50' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                Главная
              </button>
              <button
                type="button"
                onClick={() => navigate('/gallery')}
                className={`rounded-full px-3 py-1.5 ${
                  isActive('/gallery')
                    ? 'bg-slate-800 text-slate-50'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                Галерея
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`rounded-full px-3 py-1.5 ${
                  isActive('/admin')
                    ? 'bg-slate-800 text-slate-50'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                Управление
              </button>
            </nav>
          </div>

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 text-xs text-slate-300 lg:max-w-xl">
              {loading ? (
                <p className="rounded-2xl bg-slate-900/70 px-3 py-2">Проверка авторизации...</p>
              ) : isAuthenticated && user ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <p>
                    Вход выполнен: <span className="font-semibold text-slate-100">{user.name}</span> @{user.login}
                  </p>
                  <p className="mt-1 text-slate-400">
                    {user.isAdmin
                      ? 'Роль: администратор.'
                      : user.whitelisted
                        ? 'Доступ к загрузке разрешён через white-list.'
                        : 'Загрузка недоступна до одобрения администрацией.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`rounded-full px-3 py-1 ${
                        mode === 'login' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      Вход
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className={`rounded-full px-3 py-1 ${
                        mode === 'register' ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      Регистрация
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={loginValue}
                      onChange={(e) => setLoginValue(e.target.value)}
                      placeholder="Логин"
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Пароль"
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500"
                    />
                    {mode === 'register' ? (
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Имя на сайте"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500"
                      />
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-sky-500 px-3 py-2 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                      >
                        {submitting ? 'Выполняется...' : 'Войти'}
                      </button>
                    )}
                  </div>

                  {mode === 'register' && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-2 font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {submitting ? 'Выполняется...' : 'Создать пользователя'}
                    </button>
                  )}

                  {authError && <p className="mt-2 text-red-400">{authError}</p>}
                </form>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Выйти
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-950 text-slate-50">{children}</main>
    </div>
  )
}
