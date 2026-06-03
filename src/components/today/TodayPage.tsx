'use client'

import useSWR from 'swr'
import type { Task, Appointment } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface HabitWithToday {
  id: number; name: string; color: string; doneToday: boolean
}

const PRIORITY_COLOR: Record<string, string> = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const APPT_CATEGORY_COLOR: Record<string, string> = {
  Medical: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function SectionHeader({ title, count, color }: { title: string; count?: number; color?: string }) {
  return (
    <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${color ?? 'text-gray-500 dark:text-gray-400'}`}>
      {title}{count !== undefined ? ` (${count})` : ''}
    </h2>
  )
}

export default function TodayPage() {
  const today = new Date().toISOString().slice(0, 10)
  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const { data: habits = [], mutate: mutateHabits } = useSWR<HabitWithToday[]>('/api/habits?includeToday=true', fetcher)
  const { data: tasks = [], mutate: mutateTasks } = useSWR<Task[]>('/api/tasks?done=false', fetcher)
  const { data: appointments = [] } = useSWR<Appointment[]>('/api/appointments', fetcher)

  const overdueTasks = tasks
    .filter(t => t.dueDate && t.dueDate.slice(0, 10) < today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

  const todayTasks = tasks
    .filter(t => t.dueDate?.slice(0, 10) === today)
    .sort((a, b) => {
      const po: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
      return (po[a.priority] ?? 1) - (po[b.priority] ?? 1)
    })

  const todayAppts = appointments
    .filter(a => !a.done && a.date === today)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

  const doneCount = habits.filter(h => h.doneToday).length

  async function toggleHabit(id: number) {
    await fetch(`/api/habits/${id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    mutateHabits()
  }

  async function markTaskDone(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title, priority: task.priority, dueDate: task.dueDate,
        category: task.category, notes: task.notes, done: true,
        recurring: task.recurring, recurringInterval: task.recurringInterval,
        blockedById: task.blockedById,
      }),
    })
    mutateTasks()
  }

  const allClear = overdueTasks.length === 0 && todayTasks.length === 0 && todayAppts.length === 0

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Habits */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
        <SectionHeader title="Habits" count={habits.length > 0 ? doneCount : undefined} />
        {habits.length === 0 ? (
          <p className="text-sm text-gray-400">No habits configured.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: habits.length > 0 ? `${Math.round((doneCount / habits.length) * 100)}%` : '0%' }}
              />
            </div>
            {habits.map(h => (
              <div key={h.id} className="flex items-center justify-between py-0.5">
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: h.color }} />
                  {h.name}
                </span>
                <button
                  onClick={() => toggleHabit(h.id)}
                  className={`w-5 h-5 rounded-full border-2 transition-colors shrink-0 ${
                    h.doneToday
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's appointments */}
      {todayAppts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
          <SectionHeader title="Today's Appointments" count={todayAppts.length} color="text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col gap-2">
            {todayAppts.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{a.title}</span>
                  {a.location && <span className="text-xs text-gray-400">{a.location}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.time && <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{a.time}</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${APPT_CATEGORY_COLOR[a.category] ?? APPT_CATEGORY_COLOR.Other}`}>
                    {a.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue tasks */}
      {overdueTasks.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
          <SectionHeader title="Overdue" count={overdueTasks.length} color="text-red-500" />
          <div className="flex flex-col gap-1.5">
            {overdueTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 group">
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate block">{t.title}</span>
                  <span className="text-xs text-red-400">{t.dueDate!.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.Medium}`}>
                    {t.priority}
                  </span>
                  <button
                    onClick={() => markTaskDone(t)}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-500 transition-colors"
                    title="Mark done"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due today */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
        <SectionHeader title="Due Today" count={todayTasks.length} />
        {todayTasks.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing due today.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {todayTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate block">{t.title}</span>
                  {t.category && <span className="text-xs text-gray-400">{t.category}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.Medium}`}>
                    {t.priority}
                  </span>
                  <button
                    onClick={() => markTaskDone(t)}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-500 transition-colors"
                    title="Mark done"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {allClear && habits.length > 0 && doneCount === habits.length && (
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">All done for today!</p>
          <p className="text-sm text-gray-400 mt-1">No overdue tasks, no due-today tasks, all habits complete.</p>
        </div>
      )}
    </div>
  )
}
