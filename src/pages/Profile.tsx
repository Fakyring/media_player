/** @file User profile settings and administrator whitelist management. */

import { useEffect, useState, type FormEvent } from 'react'
import { changePassword, fetchAdminUsers, updateUserWhitelist } from '../lib/api'
import type { AuthUser } from '../types/media'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<AuthUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.isAdmin) return

    let cancelled = false
    setUsersLoading(true)
    setUsersError(null)

    const timer = window.setTimeout(() => {
      void fetchAdminUsers(search)
        .then((result) => {
          if (!cancelled) setUsers(result)
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setUsersError(error instanceof Error ? error.message : 'Не удалось найти пользователей')
          }
        })
        .finally(() => {
          if (!cancelled) setUsersLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [search, user?.isAdmin])

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('Новый пароль и подтверждение не совпадают.')
      return
    }

    try {
      await changePassword(currentPassword, newPassword)
      setPasswordMessage('Пароль изменён. Войдите с новым паролем.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      logout()
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Не удалось изменить пароль')
    }
  }

  const handleWhitelistToggle = async (target: AuthUser) => {
    try {
      const updated = await updateUserWhitelist(target.uuid, !target.whitelisted)
      setUsers((current) => current.map((item) => (item.uuid === updated.uuid ? updated : item)))
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Не удалось обновить white-list')
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-slate-50">
        <h1 className="text-2xl font-semibold">Профиль</h1>
        <p className="mt-3 text-sm text-slate-400">Войдите, чтобы открыть настройки профиля.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 text-slate-50">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Профиль</h1>
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
        <p className="font-medium text-slate-100">{user.name}</p>
        <p className="mt-1 text-slate-400">Логин: @{user.login}</p>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-medium">Смена пароля</h2>
        <form onSubmit={handlePasswordChange} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Текущий пароль"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Новый пароль"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Повторите новый пароль"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
          />
          {passwordError && <p className="text-sm text-red-300 sm:col-span-3">{passwordError}</p>}
          {passwordMessage && <p className="text-sm text-emerald-300 sm:col-span-3">{passwordMessage}</p>}
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 sm:col-span-3 sm:justify-self-start"
          >
            Изменить пароль
          </button>
        </form>
      </section>

      {user.isAdmin && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-medium">Одобрение пользователей</h2>
          <p className="mt-1 text-sm text-slate-400">
            Найдите пользователя по имени или логину и добавьте его в white-list для загрузки медиа.
          </p>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по имени или логину"
            className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-500"
          />

          {usersError && <p className="mt-3 text-sm text-red-300">{usersError}</p>}
          {usersLoading ? (
            <p className="mt-4 text-sm text-slate-400">Поиск пользователей...</p>
          ) : users.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Пользователи не найдены.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {users.map((target) => (
                <div
                  key={target.uuid}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{target.name}</p>
                    <p className="text-xs text-slate-400">@{target.login}</p>
                  </div>
                  {target.isAdmin ? (
                    <span className="text-xs text-slate-500">Администратор</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleWhitelistToggle(target)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium ${
                        target.whitelisted
                          ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                          : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                      }`}
                    >
                      {target.whitelisted ? 'Убрать из white-list' : 'Добавить в white-list'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
