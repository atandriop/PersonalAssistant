'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  async function save() {
    if (!name.trim()) return
    const body = {
      name,
      color,
      valueMethod,
      depreciationRate: valueMethod === 'depreciation' && depreciationRate
        ? Number(depreciationRate) / 100
        : null,
    }
    if (editing) {
      await fetch(`/api/categories/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setName(''); setColor(PRESET_COLORS[0]); setValueMethod('cost'); setDepreciationRate(''); setEditing(null)
    mutate()
  }

  async function del(id: number) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
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
