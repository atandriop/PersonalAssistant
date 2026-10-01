'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { fetcher, mutateJson } from '@/lib/fetcher'

const PRESET_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

interface Category {
  id: number
  name: string
  color: string
  valueMethod: string
  depreciationRate: number | null
}

export default function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data: categories = [], mutate } = useSWR<Category[]>('/api/categories', fetcher)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [valueMethod, setValueMethod] = useState('cost')
  const [depreciationRate, setDepreciationRate] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  async function save() {
    if (!name.trim()) return

    // The save button is not inside a <form>, so the rate input's min/max never
    // fire. Validate here as well as server-side: a rate outside 1-99 produced a
    // depreciationRate above 1, which made every inventory value NaN.
    const ratePct = Number(depreciationRate)
    if (valueMethod === 'depreciation' && depreciationRate !== '') {
      if (!Number.isFinite(ratePct) || ratePct < 1 || ratePct > 99) {
        setError('Annual depreciation rate must be between 1 and 99%')
        return
      }
    }

    const body = {
      name,
      color,
      valueMethod,
      depreciationRate: valueMethod === 'depreciation' && depreciationRate
        ? ratePct / 100
        : null,
    }
    try {
      await mutateJson(editing ? `/api/categories/${editing.id}` : '/api/categories', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save category')
      return
    }
    setError(null)
    setName(''); setColor(PRESET_COLORS[0]); setValueMethod('cost'); setDepreciationRate(''); setEditing(null)
    mutate()
  }

  // The route returns 409 naming the dependent count when the category is still
  // in use. Previously this ignored the status entirely, so the delete appeared
  // to succeed while the category stayed put.
  async function del(id: number) {
    try {
      await mutateJson(`/api/categories/${id}`, { method: 'DELETE' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete category')
      return
    }
    setError(null)
    mutate()
  }

  function startEdit(cat: Category) {
    setEditing(cat)
    setName(cat.name)
    setColor(cat.color)
    setValueMethod(cat.valueMethod ?? 'cost')
    setDepreciationRate(cat.depreciationRate !== null && cat.depreciationRate !== undefined
      ? String(Math.round(cat.depreciationRate * 100))
      : '')
  }

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 mb-4">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
            <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.name}</span>
            {cat.valueMethod === 'depreciation' && cat.depreciationRate !== null && (
              <span className="text-xs text-amber-500">↓{Math.round(cat.depreciationRate * 100)}%/yr</span>
            )}
            <button onClick={() => startEdit(cat)} className="text-blue-500 hover:underline">Edit</button>
            <button onClick={() => del(cat.id)} className="text-red-500 hover:underline">Delete</button>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col gap-3">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Category name"
          className={field}
        />
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <select value={valueMethod} onChange={e => setValueMethod(e.target.value)} className={field}>
          <option value="cost">Value = Cost (default)</option>
          <option value="depreciation">Depreciation (compound %/year)</option>
        </select>
        {valueMethod === 'depreciation' && (
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" max="99" step="1"
              value={depreciationRate} onChange={e => setDepreciationRate(e.target.value)}
              placeholder="Annual rate (e.g. 15)"
              className={field}
            />
            <span className="text-sm text-gray-500 shrink-0">% / year</span>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
            {editing ? 'Update' : 'Add Category'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setName(''); setColor(PRESET_COLORS[0]); setValueMethod('cost'); setDepreciationRate('') }}
              className="px-3 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Close</button>
      </div>
    </div>
  )
}
