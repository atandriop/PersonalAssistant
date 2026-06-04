'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface HabitForForm {
  id: number
  name: string
  color: string
  lifeAreaId?: number | null
}

interface LifeAreaOption { id: number; name: string }

export default function HabitForm({ initial, defaultLifeAreaId, onSave, onCancel }: {
  initial?: HabitForForm
  defaultLifeAreaId?: number | null
  onSave: () => void
  onCancel: () => void
}) {
  const { data: lifeAreas = [] } = useSWR<LifeAreaOption[]>('/api/life-areas', fetcher)
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [lifeAreaId, setLifeAreaId] = useState<number | null>(
    initial?.lifeAreaId !== undefined ? (initial.lifeAreaId ?? null) : (defaultLifeAreaId ?? null)
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, color, lifeAreaId }
    if (initial?.id) {
      await fetch(`/api/habits/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Habit name" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <div className="flex gap-2 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
            style={{ background: c }} />
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Life Area</label>
        <select
          value={lifeAreaId ?? ''}
          onChange={e => setLifeAreaId(e.target.value ? Number(e.target.value) : null)}
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="">None (unassigned)</option>
          {lifeAreas.map(area => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add habit'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}
