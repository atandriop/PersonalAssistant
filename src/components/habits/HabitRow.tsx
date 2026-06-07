'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ---- Types ----

export interface GoalRef { id: number; title: string; timePeriod: string }
export interface GoalLink { id: number; goalId: number; goal: GoalRef }
export interface Habit {
  id: number
  lifeAreaId: number | null
  name: string
  color: string
  goalLinks: GoalLink[]
  archivedAt?: string | null
}

interface HabitLog { date: string; note: string | null }

// ---- Helpers ----

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getStreak(loggedSet: Set<string>): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)
  let cursor = loggedSet.has(todayStr) ? new Date(today) : new Date(today.getTime() - 86400000)
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

// ---- HabitRow (default export) ----

export default function HabitRow({ habit, onEdit, onDelete, onArchive }: {
  habit: Habit; onEdit: () => void; onDelete: () => void; onArchive: () => void
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

  async function toggle(note?: string | null, date?: string) {
    await fetch(`/api/habits/${habit.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note ?? null, date: date ?? today }),
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
          style={isDone ? { background: habit.color, borderColor: habit.color, color: 'white' } : { borderColor: habit.color, color: habit.color }}
        >
          {isDone ? '✓ Done' : 'Mark done'}
        </button>
        <button onClick={onEdit} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
        <button onClick={onArchive} className="text-xs px-2 py-1 text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20">Archive</button>
        <button onClick={onDelete} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
      </div>

      {showNoteInput && (
        <div className="mb-3 flex gap-2 items-end">
          <textarea autoFocus value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note (optional)…" rows={2} className="flex-1 text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
          <div className="flex flex-col gap-1">
            <button onClick={() => toggle(noteText || null)} className="text-xs px-3 py-1.5 rounded-md text-white" style={{ background: habit.color }}>Done</button>
            <button onClick={() => { setShowNoteInput(false); setNoteText('') }} className="text-xs px-3 py-1.5 rounded-md border dark:border-gray-600 dark:text-gray-300">Skip</button>
          </div>
        </div>
      )}

      {!showNoteInput && isDone && todayNote && (
        <p className="text-xs text-gray-400 italic mb-2">&quot;{todayNote}&quot;</p>
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
                  onClick={() => !isFuture && toggle(null, ds)}
                  className={`w-3 h-3 rounded-sm transition-colors ${isFuture ? 'invisible' : 'cursor-pointer hover:opacity-70'} ${isToday ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''}`}
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
            <span key={link.id} className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
              {link.goal.title} <span className="opacity-60">({link.goal.timePeriod})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
