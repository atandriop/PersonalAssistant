'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Task } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SubtaskDraft { title: string }
interface WishlistOption { id: number; name: string }
interface LifeAreaWithGoals { id: number; goals: { id: number; title: string }[] }

interface TaskFormProps {
  initial?: Task
  preTitle?: string
  preSourceLink?: { sourceType: 'wishlist' | 'goal'; sourceId: number }
  onSave: () => void
  onCancel: () => void
}

export default function TaskForm({ initial, preTitle, preSourceLink, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? preTitle ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.slice(0, 10) : ''
  )
  const [category, setCategory] = useState(initial?.category ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [sourceType, setSourceType] = useState<'' | 'wishlist' | 'goal'>(
    initial?.sourceLink?.sourceType ?? preSourceLink?.sourceType ?? ''
  )
  const [sourceId, setSourceId] = useState<number | ''>(
    initial?.sourceLink?.sourceId ?? preSourceLink?.sourceId ?? ''
  )
  const [recurring, setRecurring] = useState(initial?.recurring ?? false)
  const [recurringInterval, setRecurringInterval] = useState(initial?.recurringInterval ?? 'weekly')
  const [blockedById, setBlockedById] = useState<number | ''>(initial?.blockedById ?? '')
  const [lifeAreaId, setLifeAreaId] = useState<number | ''>(initial?.lifeAreaId ?? '')
  const [tagInput, setTagInput] = useState(initial?.tags?.join(', ') ?? '')
  const [projectId, setProjectId] = useState<number | ''>(initial?.projectId ?? '')

  const { data: wishlistItems = [] } = useSWR<WishlistOption[]>(
    sourceType === 'wishlist' ? '/api/wishlist' : null,
    fetcher
  )
  const { data: lifeAreas = [] } = useSWR<LifeAreaWithGoals[]>(
    sourceType === 'goal' ? '/api/life-areas' : null,
    fetcher
  )
  const { data: allLifeAreas = [] } = useSWR<{ id: number; name: string; color: string }[]>(
    '/api/life-areas',
    fetcher
  )
  const { data: allTasks = [] } = useSWR<{ id: number; title: string; done: boolean }[]>('/api/tasks', fetcher)
  const { data: projects = [] } = useSWR<{ id: number; name: string; color: string; done: boolean }[]>('/api/projects', fetcher)
  const blockableOptions = allTasks.filter(t => !t.done && t.id !== initial?.id)

  const goalOptions = lifeAreas.flatMap(a =>
    a.goals.map(g => ({ id: g.id, name: g.title }))
  )
  const sourceOptions: { id: number; name: string }[] =
    sourceType === 'wishlist' ? wishlistItems : goalOptions

  function addSubtask() {
    const t = newSubtask.trim()
    if (!t) return
    setSubtasks(prev => [...prev, { title: t }])
    setNewSubtask('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      title,
      priority,
      dueDate: dueDate || null,
      category: category || null,
      notes: notes || null,
      subtasks,
      sourceLink: sourceType && sourceId
        ? { sourceType, sourceId: Number(sourceId) }
        : null,
      recurring,
      recurringInterval: recurring ? recurringInterval : null,
      blockedById: blockedById !== '' ? Number(blockedById) : null,
      lifeAreaId: lifeAreaId !== '' ? Number(lifeAreaId) : null,
      tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
      projectId: projectId !== '' ? Number(projectId) : null,
    }
    if (initial?.id) {
      await fetch(`/api/tasks/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
        <input required className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
          <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
          <input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <input className={inputCls} placeholder="e.g. Shopping, Learning…" value={category} onChange={e => setCategory(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea rows={2} className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={recurring}
            onChange={e => setRecurring(e.target.checked)}
            className="rounded"
          />
          Recurring
        </label>
        {recurring && (
          <select
            value={recurringInterval}
            onChange={e => setRecurringInterval(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blocked by</label>
        <select
          className={inputCls}
          value={blockedById}
          onChange={e => setBlockedById(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">None</option>
          {blockableOptions.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {!initial && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtasks</label>
          <div className="flex flex-col gap-1 mb-2">
            {subtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{s.title}</span>
                <button
                  type="button"
                  onClick={() => setSubtasks(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add subtask…"
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
            />
            <button
              type="button"
              onClick={addSubtask}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {initial && initial.subtasks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtasks</label>
          <div className="flex flex-col gap-1">
            {initial.subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${s.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                  {s.done ? '✓' : ''}
                </span>
                <span className={`text-sm ${s.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{s.title}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Manage subtasks by expanding the task row.</p>
        </div>
      )}

      {!initial && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to</label>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={sourceType}
              onChange={e => { setSourceType(e.target.value as '' | 'wishlist' | 'goal'); setSourceId('') }}
            >
              <option value="">None</option>
              <option value="wishlist">Wishlist item</option>
              <option value="goal">Goal</option>
            </select>
            {sourceType && (
              <select
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={sourceId}
                onChange={e => setSourceId(Number(e.target.value))}
              >
                <option value="">Select…</option>
                {sourceOptions.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
        <select
          className={inputCls}
          value={projectId}
          onChange={e => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">None</option>
          {projects.filter(p => !p.done).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Life area</label>
        <select
          className={inputCls}
          value={lifeAreaId}
          onChange={e => setLifeAreaId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">None</option>
          {allLifeAreas.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
        <input
          className={inputCls}
          placeholder="work, personal, urgent…"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-0.5">Comma-separated</p>
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
