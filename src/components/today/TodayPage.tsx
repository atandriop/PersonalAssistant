'use client'

import { type ReactNode } from 'react'
import useSWR from 'swr'
import type { Task, Appointment } from '@/types'
import { Activity, AlertCircle, Calendar, RefreshCw, Gift, CheckSquare } from 'lucide-react'

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

function ColoredSectionHeader({ icon, color, title, count }: {
  icon: ReactNode
  color: string
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {title}{count !== undefined ? ` — ${count}` : ''}
      </span>
    </div>
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
  const { data: subscriptions = [] } = useSWR<{ id: number; name: string; cost: number; period: string; active: boolean; renewalDate?: string | null }[]>('/api/subscriptions', fetcher)
  const { data: giftPeople = [] } = useSWR<{ id: number; name: string; ideas: { id: number; purchased: boolean }[] }[]>('/api/gifts/people', fetcher)

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

  function daysUntilRenewal(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  const upcomingRenewals = subscriptions
    .filter(s => {
      if (!s.active || !s.renewalDate) return false
      const d = daysUntilRenewal(s.renewalDate)
      return d !== null && d >= 0 && d <= 30
    })
    .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))

  const pendingGiftPeople = giftPeople.filter(p => p.ideas.some(i => !i.purchased))

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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
        style={{ borderLeft: '3px solid #f59e0b' }}>
        <ColoredSectionHeader
          icon={<Activity size={13} strokeWidth={2.5} color="#f59e0b" />}
          color="#f59e0b"
          title="Habits"
          count={habits.length > 0 ? doneCount : undefined}
        />
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

      {/* Upcoming Renewals */}
      {upcomingRenewals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
          style={{ borderLeft: '3px solid #f97316' }}>
          <ColoredSectionHeader
            icon={<RefreshCw size={13} strokeWidth={2.5} color="#f97316" />}
            color="#f97316"
            title="Upcoming Renewals"
            count={upcomingRenewals.length}
          />
          <div className="flex flex-col gap-1.5">
            {upcomingRenewals.map(s => {
              const days = daysUntilRenewal(s.renewalDate)!
              const suffix = s.period === 'monthly' ? 'mo' : s.period === 'quarterly' ? 'qtr' : 'yr'
              return (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">€{s.cost.toFixed(2)}/{suffix}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      days <= 7
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {days === 0 ? 'today' : `in ${days}d`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending Gifts */}
      {pendingGiftPeople.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
          style={{ borderLeft: '3px solid #a855f7' }}>
          <ColoredSectionHeader
            icon={<Gift size={13} strokeWidth={2.5} color="#a855f7" />}
            color="#a855f7"
            title="Pending Gifts"
            count={pendingGiftPeople.length}
          />
          <div className="flex flex-col gap-1">
            {pendingGiftPeople.map(p => {
              const count = p.ideas.filter(i => !i.purchased).length
              return (
                <div key={p.id} className="flex items-center justify-between py-0.5">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p.name}</span>
                  <span className="text-xs text-gray-400">{count} idea{count !== 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's appointments */}
      {todayAppts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
          style={{ borderLeft: '3px solid #3b82f6' }}>
          <ColoredSectionHeader
            icon={<Calendar size={13} strokeWidth={2.5} color="#3b82f6" />}
            color="#3b82f6"
            title="Today's Appointments"
            count={todayAppts.length}
          />
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
          style={{ borderLeft: '3px solid #ef4444' }}>
          <ColoredSectionHeader
            icon={<AlertCircle size={13} strokeWidth={2.5} color="#ef4444" />}
            color="#ef4444"
            title="Overdue"
            count={overdueTasks.length}
          />
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
        style={{ borderLeft: '3px solid #6366f1' }}>
        <ColoredSectionHeader
          icon={<CheckSquare size={13} strokeWidth={2.5} color="#6366f1" />}
          color="#6366f1"
          title="Due Today"
          count={todayTasks.length}
        />
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
