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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  // Anchor to Monday of the current week so today is always visible
  const dow = today.getDay() || 7  // 1=Mon … 7=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow - 1))
  monday.setHours(0, 0, 0, 0)
  // Go back 11 full weeks to start of 12-week window
  const start = new Date(monday)
  start.setDate(monday.getDate() - 77)
  start.setHours(0, 0, 0, 0)
  const dates: Date[] = []
  const d = new Date(start)
  while (dates.length < 84) {
    dates.push(new Date(d))
    d.setDate(d.getDate() + 1)
    d.setHours(0, 0, 0, 0)
  }
  return dates
}

function formatLastDone(logs: HabitLog[]): string {
  if (logs.length === 0) return 'Never'
  const lastDate = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0].date
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const last = new Date(lastDate + 'T00:00:00')
  const diff = Math.round((today.getTime() - last.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return lastDate
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
  const [showLogs, setShowLogs] = useState(false)
  const [logDateInput, setLogDateInput] = useState('')

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
        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
          Last: {formatLastDone(logs)}
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

      <div className="mt-3 overflow-x-auto">
        {/* Month labels */}
        <div className="flex gap-1 mb-0.5 pl-5">
          {weeks.map((week, wi) => {
            const label = week.find(d => d.getDate() <= 7 && d.getDate() === 1)
              ? new Date(week.find(d => d.getDate() === 1)!).toLocaleString('default', { month: 'short' })
              : null
            return (
              <div key={wi} className="w-3 shrink-0 text-center">
                {label && <span className="text-gray-400" style={{ fontSize: '9px' }}>{label}</span>}
              </div>
            )
          })}
        </div>

        {/* Day labels + week columns */}
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 mr-1 shrink-0">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="w-3 h-3 flex items-center justify-center">
                <span className="text-gray-400" style={{ fontSize: '9px' }}>{d}</span>
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 shrink-0">
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
                    className={`w-3 h-3 rounded-sm transition-colors cursor-pointer hover:opacity-70 ${isFuture ? 'invisible pointer-events-none' : ''} ${isToday ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''}`}
                    style={{ backgroundColor: done ? habit.color : 'rgb(229 231 235)' }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <button
          onClick={() => setShowLogs(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <span>{showLogs ? '▾' : '▸'}</span>
          {logs.length} log{logs.length !== 1 ? 's' : ''}
        </button>

        {showLogs && (
          <div className="mt-2 flex flex-col gap-1">
            {logs.length === 0 && (
              <p className="text-xs text-gray-400">No logs yet.</p>
            )}
            {[...logs].sort((a, b) => b.date.localeCompare(a.date)).map(log => (
              <div key={log.date} className="flex items-center gap-2 text-xs group">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: log.date === today ? habit.color : 'rgb(156 163 175)' }} />
                <span className="text-gray-700 dark:text-gray-300 w-24 shrink-0">{log.date}</span>
                {log.note && <span className="text-gray-400 italic truncate flex-1">{log.note}</span>}
                {log.date !== today && (
                  <button
                    onClick={() => toggle(null, log.date)}
                    className="hidden group-hover:block text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 shrink-0"
                    title="Remove this log"
                  >×</button>
                )}
              </div>
            ))}

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <input
                type="date"
                max={today}
                value={logDateInput}
                onChange={e => setLogDateInput(e.target.value)}
                className="text-xs border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              <button
                disabled={!logDateInput}
                onClick={async () => { await toggle(null, logDateInput); setLogDateInput('') }}
                className="text-xs px-2 py-1 rounded border disabled:opacity-40"
                style={{ borderColor: habit.color, color: habit.color }}
              >
                {logDateInput && loggedSet.has(logDateInput) ? 'Remove' : 'Log date'}
              </button>
            </div>
          </div>
        )}
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
