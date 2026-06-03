'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface GoalRef { id: number; title: string; timePeriod: string }
interface GoalLink { id: number; goalId: number; goal: GoalRef }
interface Habit { id: number; name: string; color: string; goalLinks: GoalLink[] }
interface HabitLog { date: string; note: string | null }

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getStreak(loggedSet: Set<string>): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)
  let cursor = loggedSet.has(todayStr)
    ? new Date(today)
    : new Date(today.getTime() - 86400000)
  let streak = 0
  while (loggedSet.has(toDateStr(cursor))) {
    streak++
    cursor = new Date(cursor.getTime() - 86400000)
  }
  return streak
}

function buildHeatmapDates(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today.getTime() - 83 * 86400000)
  const dayOfWeek = start.getDay() || 7
  start.setDate(start.getDate() - (dayOfWeek - 1))
  const dates: Date[] = []
  const d = new Date(start)
  while (dates.length < 84) {
    dates.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function HabitRow({ habit, onEdit, onDelete, onArchive }: {
  habit: Habit; onEdit: () => void; onDelete: () => void; onArchive: () => void;
}) {
  const { data: logs = [], mutate } = useSWR<HabitLog[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const logMap = new Map(logs.map(l => [l.date, l]))
  const loggedSet = new Set(logs.map(l => l.date))
  const today = toDateStr(new Date())
  const streak = getStreak(loggedSet)
  const heatmapDates = buildHeatmapDates()
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')

  const weeks: Date[][] = []
  for (let i = 0; i < 12; i++) weeks.push(heatmapDates.slice(i * 7, i * 7 + 7))

  const isDone = loggedSet.has(today)
  const todayNote = logMap.get(today)?.note ?? null

  async function toggle(note?: string | null) {
    await fetch(`/api/habits/${habit.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note ?? null }),
    })
    mutate()
    setShowNoteInput(false)
    setNoteText('')
  }

  function handleMarkDoneClick() {
    if (isDone) { toggle(); return }
    setShowNoteInput(true)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: habit.color }} />
        <span className="font-medium text-gray-900 dark:text-white flex-1">{habit.name}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {streak > 0 ? `🔥 ${streak} day${streak !== 1 ? 's' : ''}` : '—'}
        </span>
        <button
          onClick={handleMarkDoneClick}
          className="text-xs px-2 py-1 rounded-md border transition-colors"
          style={isDone
            ? { background: habit.color, borderColor: habit.color, color: 'white' }
            : { borderColor: habit.color, color: habit.color }
          }>
          {isDone ? '✓ Done' : 'Mark done'}
        </button>
        <button onClick={onEdit} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
        <button onClick={onArchive} className="text-xs px-2 py-1 text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20">Archive</button>
        <button onClick={onDelete} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
      </div>

      {showNoteInput && (
        <div className="mb-3 flex gap-2 items-end">
          <textarea
            autoFocus
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note (optional)…"
            rows={2}
            className="flex-1 text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => toggle(noteText || null)}
              className="text-xs px-3 py-1.5 rounded-md text-white"
              style={{ background: habit.color }}
            >Done</button>
            <button
              onClick={() => { setShowNoteInput(false); setNoteText('') }}
              className="text-xs px-3 py-1.5 rounded-md border dark:border-gray-600 dark:text-gray-300"
            >Skip</button>
          </div>
        </div>
      )}

      {!showNoteInput && isDone && todayNote && (
        <p className="text-xs text-gray-400 italic mb-2">"{todayNote}"</p>
      )}

      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(d => {
              const ds = toDateStr(d)
              const logEntry = logMap.get(ds)
              const done = loggedSet.has(ds)
              const isToday = ds === today
              const isFuture = d > new Date()
              return (
                <div
                  key={ds}
                  title={logEntry?.note ? `${ds}: ${logEntry.note}` : ds}
                  className={`w-3 h-3 rounded-sm transition-colors ${isToday ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''} ${isFuture ? 'invisible' : ''}`}
                  style={{ backgroundColor: done ? habit.color : 'rgb(229 231 235)' }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {habit.goalLinks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 mr-1">Supporting:</span>
          {habit.goalLinks.map(link => (
            <span
              key={link.id}
              className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
            >
              {link.goal.title} <span className="opacity-60">({link.goal.timePeriod})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

interface HabitFormProps { initial?: Habit; onSave: () => void; onCancel: () => void }

function HabitForm({ initial, onSave, onCancel }: HabitFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/habits/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
    } else {
      await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
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
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add habit'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function HabitsPage() {
  const { data: habits = [], mutate } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: archivedHabits = [], mutate: mutateArchived } = useSWR<Habit[]>('/api/habits?archived=true', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [loadingPrompt, setLoadingPrompt] = useState(false)

  async function del(id: number) {
    if (!confirm('Delete this habit and all its history?')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    mutate()
  }

  async function archive(id: number) {
    if (!confirm('Archive this habit? You can restore it later from the Archived section.')) return
    await fetch(`/api/habits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    mutate()
    mutateArchived()
  }

  async function restore(id: number) {
    await fetch(`/api/habits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    mutate()
    mutateArchived()
  }

  async function openPrompt() {
    setLoadingPrompt(true)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const cutoffStr = new Date(now.getTime() - 83 * 86400000).toISOString().slice(0, 10)
    const todayStr = now.toISOString().slice(0, 10)

    const lines = await Promise.all(
      habits.map(async h => {
        const logs: HabitLog[] = await fetch(`/api/habits/${h.id}/logs`).then(r => r.json())
        const logSet = new Set(logs.map(l => l.date))

        let streak = 0
        let cursor = new Date(logSet.has(todayStr) ? now : new Date(now.getTime() - 86400000))
        while (logSet.has(cursor.toISOString().slice(0, 10))) {
          streak++
          cursor = new Date(cursor.getTime() - 86400000)
        }

        const recent = logs.filter(l => l.date >= cutoffStr)
        const pct = Math.round((recent.length / 84) * 100)

        return `- ${h.name}: ${streak} day streak · ${pct}% consistency over last 12 weeks (${recent.length}/84 days)`
      })
    )

    const prompt = `Here is my habit tracking snapshot as of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:

${lines.join('\n')}

Please analyse this. For each habit: call out whether the consistency is strong, inconsistent, or struggling. Identify which habit has the best momentum and which is at most risk of being abandoned. Suggest one concrete change I could make this week to improve the weakest habit without disrupting the strongest.`

    setPromptText(prompt)
    setLoadingPrompt(false)
    setShowPrompt(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habits</h1>
        <div className="flex gap-2">
          {habits.length > 0 && (
            <button
              onClick={openPrompt}
              disabled={loadingPrompt}
              className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loadingPrompt ? 'Loading…' : 'Generate AI Prompt'}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add habit
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {habits.map(h => (
          <HabitRow key={h.id} habit={h} onEdit={() => setEditing(h)} onDelete={() => del(h.id)} onArchive={() => archive(h.id)} />
        ))}
      </div>

      {habits.length === 0 && archivedHabits.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No habits yet. Add one to start tracking.</p>
      )}

      {archivedHabits.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived(v => !v)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <span>{showArchived ? '▾' : '▸'}</span>
            Archived ({archivedHabits.length})
          </button>
          {showArchived && (
            <div className="flex flex-col gap-2 mt-2">
              {archivedHabits.map(h => (
                <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.color }} />
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{h.name}</span>
                  <button onClick={() => restore(h.id)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && <Modal title="Add habit" onClose={() => setShowAdd(false)}><HabitForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit habit" onClose={() => setEditing(null)}><HabitForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
      {showPrompt && <PromptModal title="Habits AI Prompt" prompt={promptText} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
