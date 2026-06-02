'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Types ─────────────────────────────────────────────────────────────────
interface Habit { id: number; name: string; color: string }

interface MaintenanceTask {
  id: number; description: string; intervalMonths: number | null
  dueDate: string | null; lastDoneDate: string | null; createdAt: string
}
interface HomeItem { id: number; name: string; tasks: MaintenanceTask[] }
type TaskStatus = 'overdue' | 'due-soon' | 'ok' | 'none'

interface Milestone { id: number; completedAt: string | null }
interface Goal { id: number; title: string; milestones: Milestone[]; habitLinks: unknown[] }
interface LifeArea { id: number; name: string; goals: Goal[] }

interface GiftIdea { id: number; estimatedCost: number | null; purchased: boolean }
interface GiftPerson { id: number; name: string; budget: number | null; ideas: GiftIdea[] }

// ─── Maintenance helpers ────────────────────────────────────────────────────
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  if (d.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}

function getTaskStatus(task: MaintenanceTask): TaskStatus {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  let nextDue: string | null = null
  if (task.intervalMonths != null) {
    const base = task.lastDoneDate ?? task.createdAt.slice(0, 10)
    nextDue = addMonths(base, task.intervalMonths)
  } else if (task.dueDate != null) {
    if (task.lastDoneDate && task.lastDoneDate >= task.dueDate) return 'none'
    nextDue = task.dueDate
  }
  if (!nextDue) return 'none'
  if (nextDue < today) return 'overdue'
  if (nextDue <= in30) return 'due-soon'
  return 'ok'
}

// ─── Habits Done Count ──────────────────────────────────────────────────────
function HabitsDoneCount({ habits }: { habits: Habit[] }) {
  const [doneCount, setDoneCount] = useState(0)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (habits.length === 0) return
    Promise.allSettled(
      habits.map(h =>
        fetch(`/api/habits/${h.id}/logs`).then(r => r.json()).then((dates: string[]) => dates.includes(today))
      )
    ).then(results => {
      const count = results.filter(r => r.status === 'fulfilled' && r.value).length
      setDoneCount(count)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits.map(h => h.id).join(','), today])

  return (
    <p className="text-xs text-gray-400 mb-2">{doneCount} / {habits.length} done today</p>
  )
}

// ─── Habit Today Row ────────────────────────────────────────────────────────
function HabitTodayRow({ habit }: { habit: Habit }) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: logs = [], mutate } = useSWR<string[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const done = logs.includes(today)

  async function toggle() {
    await fetch(`/api/habits/${habit.id}/logs`, { method: 'POST' })
    mutate()
  }

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: habit.color }} />
        {habit.name}
      </span>
      <button
        onClick={toggle}
        title={done ? 'Done today' : 'Mark done'}
        className={`w-5 h-5 rounded-full border-2 transition-colors shrink-0 ${
          done
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
        }`}
      />
    </div>
  )
}

// ─── Widget card ────────────────────────────────────────────────────────────
function WidgetCard({ title, borderStyle, children }: {
  title: string
  borderStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div
      className="bg-white dark:bg-gray-900 border rounded-xl p-4"
      style={borderStyle ?? {}}
    >
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: habits = [] } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: maintenanceItems = [] } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const { data: lifeAreas = [] } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: giftPeople = [] } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)

  // ── Maintenance widget ──
  const alertItems = maintenanceItems.flatMap(item =>
    item.tasks
      .map(t => ({ item, task: t, status: getTaskStatus(t) }))
      .filter(x => x.status === 'overdue' || x.status === 'due-soon')
  )
  const worstMaintenance: TaskStatus = alertItems.some(x => x.status === 'overdue')
    ? 'overdue'
    : alertItems.some(x => x.status === 'due-soon')
    ? 'due-soon'
    : 'none'
  const maintenanceBorder: React.CSSProperties =
    worstMaintenance === 'overdue' ? { borderColor: '#f87171' }
    : worstMaintenance === 'due-soon' ? { borderColor: '#fbbf24' }
    : { borderColor: '#34d399' }

  // ── Goals widget ──
  const allGoals = lifeAreas.flatMap(area =>
    area.goals.map(g => ({
      ...g,
      areaName: area.name,
      pct: g.milestones.length === 0
        ? 0
        : g.milestones.filter(m => m.completedAt !== null).length / g.milestones.length,
    }))
  )
  const lowestGoals = [...allGoals].sort((a, b) => a.pct - b.pct).slice(0, 4)

  // ── Gifts widget ──
  const peopleWithIdeas = giftPeople.filter(p => p.ideas.length > 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Habits Today */}
        <WidgetCard title="Habits Today">
          {habits.length === 0 ? (
            <p className="text-sm text-gray-400">No habits set up yet.</p>
          ) : (
            <div className="flex flex-col">
              <HabitsDoneCount habits={habits} />
              {habits.map(h => <HabitTodayRow key={h.id} habit={h} />)}
            </div>
          )}
        </WidgetCard>

        {/* Maintenance */}
        <WidgetCard title="Maintenance" borderStyle={maintenanceBorder}>
          {alertItems.length === 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400">All up to date ✓</p>
          ) : (
            <div className="flex flex-col gap-1">
              {alertItems.map(({ item, task, status }) => (
                <div key={task.id} className="flex items-start justify-between gap-2 py-0.5">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{item.name}</span>
                    <span className="text-xs text-gray-400 truncate block">{task.description}</span>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${status === 'overdue' ? 'text-red-500' : 'text-amber-500'}`}>
                    {status === 'overdue' ? 'Overdue' : 'Due soon'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        {/* Goals */}
        <WidgetCard title="Goals">
          {lowestGoals.length === 0 ? (
            <p className="text-sm text-gray-400">No goals set up yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {lowestGoals.map(g => (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.title}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{Math.round(g.pct * 100)}%</span>
                  </div>
                  <span className="text-xs text-gray-400">{g.areaName}</span>
                  <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.round(g.pct * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        {/* Gifts */}
        <WidgetCard title="Gifts">
          {peopleWithIdeas.length === 0 ? (
            <p className="text-sm text-gray-400">No gift ideas yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {peopleWithIdeas.map(p => {
                const bought = p.ideas.filter(i => i.purchased).length
                const total = p.ideas.length
                const committed = p.ideas
                  .filter(i => i.purchased)
                  .reduce((s, i) => s + (i.estimatedCost ?? 0), 0)
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                      <span className="text-xs text-gray-500">{bought} / {total} bought</span>
                    </div>
                    {p.budget != null && p.budget > 0 && (
                      <div className="mt-1">
                        <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                          <span>€{committed.toFixed(0)} / €{p.budget.toFixed(0)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${Math.min(100, (committed / p.budget) * 100).toFixed(0)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </WidgetCard>

      </div>
    </div>
  )
}
