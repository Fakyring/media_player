/** @file Landing page with media-focused introduction and navigation shortcuts. */

import { useNavigate } from 'react-router'
import { PlayCircle, Images, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Home page component with hero section and quick links to gallery and admin.
 */
export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <p className="inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/40">
            MongoDB media library • Видео и картинки с разграничением доступа
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Личная медиа-библиотека
            <span className="block bg-gradient-to-r from-sky-400 to-emerald-300 bg-clip-text text-transparent">
              с избранным и тёмной темой
            </span>
          </h1>
          <p className="max-w-xl text-sm text-slate-300 sm:text-base">
            Загружайте видео и изображения по категориям, просматривайте их в удобном плеере,
            сохраняйте любимые ролики в избранное. Метаданные и права доступа хранятся в MongoDB,
            а сами файлы лежат на диске по UUID и расширению.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/gallery')}
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
            >
              <PlayCircle className="h-4 w-4" />
              Открыть галерею
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/60 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-sky-500 hover:bg-slate-900"
            >
              <Shield className="h-4 w-4 text-sky-300" />
              Админка загрузки
            </button>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900">
                <Images className="h-3.5 w-3.5 text-emerald-300" />
              </span>
              <span>Несколько категорий на один файл</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900">
                <PlayCircle className="h-3.5 w-3.5 text-sky-300" />
              </span>
              <span>Сохранение громкости плеера в браузере</span>
            </div>
          </div>

          {user && (
            <p className="text-xs text-slate-400">
              Вы вошли как <span className="font-semibold text-slate-100">{user.name}</span> @{user.login}.
              {user.isAdmin
                ? ' У вас есть административный доступ.'
                : user.whitelisted
                  ? ' Вы можете загружать медиа.'
                  : ' Для загрузки медиа требуется одобрение администратора.'}
            </p>
          )}
        </div>

        <div className="flex-1">
          <div className="relative aspect-video overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl shadow-sky-900/60">
            <img
              src="https://pub-cdn.sider.ai/u/U03VH88Z1JV/web-coder/6ab72d4a51c6bc4f496ee310/resource/d9e999ff-302d-4d71-850c-6dbf36c43669.jpg"
              alt="Media gallery preview"
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-900/10 to-sky-500/20" />
            <div className="absolute bottom-4 left-4 right-4 space-y-1 text-xs text-slate-100">
              <p className="font-medium text-sky-200">Медиатека сервера</p>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
