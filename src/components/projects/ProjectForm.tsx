'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Project } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const COLORS = ['#6b7280', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

interface ProjectFormProps {
  initial?: Project
  onSave: () => void
  onCancel: () => void
}

export default function ProjectForm({ initial, onSave, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? '#6b7280')
  const [lifeAreaId, setLifeAreaId] = useState<number | ''>(initial?.lifeAreaId ?? '')

  const { data: lifeAreas = [] } = useSWR<{ id: number; name: string }[]>('/api/life-areas', fetcher)

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name,
      description: description || null,
      color,
      lifeAreaId: lifeAreaId !== '' ? Number(lifeAreaId) : null,
    }
    if (initial?.id) {
      await fetch(`/api/projects/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
        <input required className={inputCls} value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea rows={2} className={inputCls} value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Life area</label>
        <select
          className={inputCls}
          value={lifeAreaId}
          onChange={e => setLifeAreaId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">None</option>
          {lifeAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          Save
        </button>
      </div>
    </form>
  )
}
