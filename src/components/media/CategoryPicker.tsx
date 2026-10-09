/** @file Searchable multi-select category picker with support for new categories. */

import { useMemo, useState } from 'react'

interface CategoryPickerProps {
  value: string[]
  options: string[]
  onChange: (value: string[]) => void
  id: string
  placeholder?: string
}

export function CategoryPicker({
  value,
  options,
  onChange,
  id,
  placeholder = 'Введите или выберите категорию',
}: CategoryPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return options
      .filter(
        (category) =>
          !value.includes(category) &&
          (!normalizedQuery || category.toLocaleLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 8)
  }, [options, query, value])

  const add = (rawValue: string) => {
    const category = rawValue.trim().toLocaleLowerCase()
    if (!category) return
    onChange(value.includes(category) ? value : [...value, category])
    setQuery('')
    setOpen(false)
  }

  const createValue = query.trim().toLocaleLowerCase()

  return (
    <div className="relative">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 focus-within:border-emerald-500">
        {value.map((category) => (
          <span
            key={category}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200 ring-1 ring-emerald-500/30"
          >
            {category}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== category))}
              className="rounded-full px-1 text-emerald-200/70 hover:bg-emerald-500/20 hover:text-emerald-100"
              aria-label={`Удалить категорию ${category}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              add(query)
            } else if (event.key === 'Backspace' && !query && value.length) {
              onChange(value.slice(0, -1))
            } else if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-slate-50 outline-none placeholder:text-slate-500"
          placeholder={value.length ? 'Добавить категорию...' : placeholder}
          autoComplete="off"
        />
      </div>

      {open && (matches.length > 0 || createValue) && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/40">
          {matches.map((category) => (
            <button
              key={category}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(category)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
            >
              <span>{category}</span>
              <span className="text-xs text-slate-500">Существующая категория</span>
            </button>
          ))}
          {createValue &&
            !options.some((category) => category.toLocaleLowerCase() === createValue) &&
            !value.includes(createValue) && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(query)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-emerald-200 hover:bg-slate-800"
              >
                <span>Создать «{query.trim()}»</span>
                <span className="text-xs text-emerald-500">Новая</span>
              </button>
            )}
        </div>
      )}
    </div>
  )
}
