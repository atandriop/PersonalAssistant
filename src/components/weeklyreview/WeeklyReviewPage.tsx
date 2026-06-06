'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import PromptModal from '@/components/ui/PromptModal'
import { HomeItem, getTaskStatus } from '@/lib/maintenance'
import type { Habit, LifeArea, Subscription } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface WishlistItemRow { id: number; name: string; cost: number; priority: string }
interface InventoryItemRow { id: number; name: string; cost: number }
interface PortfolioHoldingRow {
  id: number; name: string; type: string
  currentPrice?: number | null; buyPrice?: number | null; quantity?: number | null
  balance?: number | null; interestRate?: number | null
}
interface CompletedTask { id: number; title: string; priority: string; dueDate: string | null; category: string | null }
interface CompletedAppt { id: number; title: string; date: string; category: string }
interface NewMemory { id: number; title: string; date: string; category: string }

interface WeeklyData {
  wishlistItems: WishlistItemRow[]
  inventoryItems: InventoryItemRow[]
  portfolioHoldings: PortfolioHoldingRow[]
  portfolioDelta: number | null
  completedTasks: CompletedTask[]
  completedAppointments: CompletedAppt[]
  newMemories: NewMemory[]
  weekStart: string
  weekEnd: string
}

function getWeekKey(): string {
  const d = new Date()
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `weekly-review-notes-${d.getFullYear()}-W${week}`
}

function getWeekDates(): string[] {
  const today = new Date()
  const dow = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function HabitWeekRow({ habit, weekDates, onCount }: {
  habit: Habit; weekDates: string[]
  onCount?: (id: number, count: number) => void
}) {
  const { data: logs = [] } = useSWR<{ date: string; note: string | null }[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const logDates = logs.map(l => l.date)
  const count = weekDates.filter(d => logDates.includes(d)).length
  const pct = count / 7
  useEffect(() => { onCount?.(habit.id, count) }, [habit.id, count, onCount])
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: habit.color }} />
          {habit.name}
        </span>
        <span className="text-xs text-gray-500">{count}/7</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
    </div>
  )
}

function WeekSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function WeeklyReviewPage() {
  const { data } = useSWR<WeeklyData>('/api/weekly-review', fetcher)
  const { data: activeHabits = [] } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: archivedHabits = [] } = useSWR<Habit[]>('/api/habits?archived=true', fetcher)
  const habits = [...activeHabits, ...archivedHabits]
  const { data: maintenanceItems = [] } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const { data: lifeAreas = [] } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const [notes, setNotes] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const weekKey = getWeekKey()

  const weekDates = getWeekDates()
  const [weekCounts, setWeekCounts] = useState<Record<number, number>>({})
  const handleWeekCount = useCallback((id: number, count: number) => {
    setWeekCounts(prev => prev[id] === count ? prev : { ...prev, [id]: count })
  }, [])
  const sortedHabits = [...habits].sort((a, b) => (weekCounts[a.id] ?? 0) - (weekCounts[b.id] ?? 0))

  const maintenanceAlerts = maintenanceItems.flatMap(item =>
    item.tasks
      .map(t => ({ item, task: t, status: getTaskStatus(t).status }))
      .filter(x => x.status === 'overdue' || x.status === 'due-soon')
  )

  const goalsWithMilestones = lifeAreas.flatMap(area =>
    area.goals
      .filter(g => g.milestones.length > 0)
      .map(g => ({
        ...g,
        areaName: area.name,
        done: g.milestones.filter(m => m.completedAt !== null).length,
        total: g.milestones.length,
      }))
  )

  const todayStr = new Date().toISOString().slice(0, 10)
  const today30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const renewingSoon = subscriptions
    .filter(s => s.active && s.renewalDate != null && s.renewalDate.slice(0, 10) >= todayStr && s.renewalDate.slice(0, 10) <= today30)
    .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))

  useEffect(() => {
    setNotes(localStorage.getItem(weekKey) ?? '')
  }, [weekKey])

  function saveNotes(value: string) {
    setNotes(value)
    localStorage.setItem(weekKey, value)
  }

  function buildPrompt(): string {
    if (!data) return ''
    const { wishlistItems, inventoryItems, portfolioHoldings, portfolioDelta, weekStart, weekEnd } = data
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const wTotal = wishlistItems.reduce((s, i) => s + i.cost, 0)
    const wLines = wishlistItems.length
      ? wishlistItems.map(i => `- ${i.name} — €${i.cost.toFixed(2)} [${i.priority}]`).join('\n')
      : '(none)'
    const iLines = inventoryItems.length
      ? inventoryItems.map(i => `- ${i.name} — €${i.cost.toFixed(2)}`).join('\n')
      : '(none)'
    const pLines = portfolioHoldings.length
      ? portfolioHoldings.map(h => {
          if (h.type === 'savings') return `- ${h.name} (savings): €${(h.balance ?? 0).toFixed(2)}`
          const v = (h.currentPrice ?? 0) * (h.quantity ?? 0)
          const p = ((h.currentPrice ?? 0) - (h.buyPrice ?? 0)) * (h.quantity ?? 0)
          return `- ${h.name} (${h.type}): €${v.toFixed(2)} [P&L: ${p >= 0 ? '+' : ''}€${p.toFixed(2)}]`
        }).join('\n')
      : '(none)'
    const delta = portfolioDelta !== null
      ? `Portfolio delta vs 7 days ago: ${portfolioDelta >= 0 ? '+' : ''}€${portfolioDelta.toFixed(2)}`
      : 'Portfolio delta: not enough data'

    const habitLines = sortedHabits.length
      ? sortedHabits.map(h => `- ${h.name}: ${weekCounts[h.id] ?? 0}/7 days`).join('\n')
      : '(no habits)'

    const goalLines = goalsWithMilestones.length
      ? goalsWithMilestones.map(g => `- ${g.title} (${g.areaName}): ${g.done}/${g.total} milestones`).join('\n')
      : '(no goals with milestones)'

    const maintenanceLines = maintenanceAlerts.length
      ? maintenanceAlerts.map(({ item, task, status }) =>
          `- ${item.name} — ${task.description} [${status}]`
        ).join('\n')
      : '(none)'

    const renewLines = renewingSoon.length
      ? renewingSoon.map(s =>
          `- ${s.name}: €${s.cost.toFixed(2)}/${s.period} on ${new Date(s.renewalDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        ).join('\n')
      : '(none)'

    const taskLines = data.completedTasks.length
      ? data.completedTasks.map(t => `- ${t.title}${t.category ? ` [${t.category}]` : ''}`).join('\n')
      : '(none)'

    const apptLines = data.completedAppointments.length
      ? data.completedAppointments.map(a => `- ${a.title} (${a.category}) on ${a.date}`).join('\n')
      : '(none)'

    const memLines = data.newMemories.length
      ? data.newMemories.map(m => `- ${m.title} (${m.category})`).join('\n')
      : '(none)'

    return `Weekly review — ${fmt(weekStart)} to ${fmt(weekEnd)}

TASKS COMPLETED (${data.completedTasks.length}):
${taskLines}

APPOINTMENTS ATTENDED (${data.completedAppointments.length}):
${apptLines}

MEMORIES LOGGED (${data.newMemories.length}):
${memLines}

HABITS (this week):
${habitLines}

GOALS:
${goalLines}

MAINTENANCE ALERTS:
${maintenanceLines}

SUBSCRIPTIONS RENEWING SOON:
${renewLines}

WISHLIST (${wishlistItems.length} added${wishlistItems.length ? `, €${wTotal.toFixed(2)} total` : ''}):
${wLines}

INVENTORY (${inventoryItems.length} added):
${iLines}

PORTFOLIO (${portfolioHoldings.length} added):
${pLines}
${delta}

MY NOTES:
${notes.trim() || '(none)'}

Please identify patterns in this week's activity across habits, goals, and finances. Flag anything I should follow up on, and suggest 2-3 priorities for next week.`
  }

  const dateRange = data
    ? `${new Date(data.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(data.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Review</h1>
          {dateRange && <p className="text-sm text-gray-400 mt-0.5">{dateRange}</p>}
        </div>
        <button
          onClick={() => setShowPrompt(true)}
          disabled={!data}
          className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Generate AI Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <WeekSection title={`Tasks completed (${data?.completedTasks.length ?? 0})`}>
            {data?.completedTasks.length ? (
              <ul className="flex flex-col gap-1">
                {data.completedTasks.map(t => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200 truncate">{t.title}</span>
                    {t.category && <span className="text-xs text-gray-400 shrink-0 ml-2">{t.category}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">No tasks completed this week.</p>}
          </WeekSection>

          <WeekSection title={`Appointments attended (${data?.completedAppointments.length ?? 0})`}>
            {data?.completedAppointments.length ? (
              <ul className="flex flex-col gap-1">
                {data.completedAppointments.map(a => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200 truncate">{a.title}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{a.date}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">No appointments this week.</p>}
          </WeekSection>

          <WeekSection title={`Memories logged (${data?.newMemories.length ?? 0})`}>
            {data?.newMemories.length ? (
              <ul className="flex flex-col gap-1">
                {data.newMemories.map(m => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200 truncate">{m.title}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{m.category}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">No memories added this week.</p>}
          </WeekSection>

          <WeekSection title={`Wishlist added (${data?.wishlistItems.length ?? 0})`}>
            {data?.wishlistItems.length ? (
              <ul className="flex flex-col gap-1">
                {data.wishlistItems.map(i => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{i.name}</span>
                    <span className="text-gray-500">€{i.cost.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
          </WeekSection>

          <WeekSection title={`Inventory added (${data?.inventoryItems.length ?? 0})`}>
            {data?.inventoryItems.length ? (
              <ul className="flex flex-col gap-1">
                {data.inventoryItems.map(i => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{i.name}</span>
                    <span className="text-gray-500">€{i.cost.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
          </WeekSection>

          <WeekSection title={`Portfolio changes (${data?.portfolioHoldings.length ?? 0})`}>
            {data?.portfolioHoldings.length ? (
              <ul className="flex flex-col gap-1">
                {data.portfolioHoldings.map(h => (
                  <li key={h.id} className="text-sm text-gray-800 dark:text-gray-200">
                    {h.name} <span className="text-gray-400">({h.type})</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
            {data?.portfolioDelta != null && (
              <p className={`text-sm font-medium mt-2 ${data.portfolioDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                Delta: {data.portfolioDelta >= 0 ? '+' : ''}€{data.portfolioDelta.toFixed(2)} vs 7 days ago
              </p>
            )}
          </WeekSection>

          <WeekSection title="Habits This Week">
            {habits.length === 0 ? (
              <p className="text-sm text-gray-400">No habits tracked.</p>
            ) : (
              <div>
                {sortedHabits.map(h => <HabitWeekRow key={h.id} habit={h} weekDates={weekDates} onCount={handleWeekCount} />)}
              </div>
            )}
          </WeekSection>

          <WeekSection title="Goal Progress">
            {goalsWithMilestones.length === 0 ? (
              <p className="text-sm text-gray-400">No goals with milestones.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {goalsWithMilestones.map(g => (
                  <div key={g.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.title}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{g.done} / {g.total}</span>
                    </div>
                    <span className="text-xs text-gray-400 block mb-1">{g.areaName}</span>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${g.total > 0 ? Math.round((g.done / g.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WeekSection>

          <WeekSection title="Maintenance Alerts">
            {maintenanceAlerts.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing overdue or due soon.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {maintenanceAlerts.map(({ item, task, status }) => (
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
          </WeekSection>

          {renewingSoon.length > 0 && (
            <WeekSection title="Subscriptions Renewing Soon">
              <div className="flex flex-col gap-1">
                {renewingSoon.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-0.5">
                    <span className="text-sm text-gray-800 dark:text-gray-200">{s.name}</span>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs text-gray-500 block">
                        {new Date(s.renewalDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-xs text-gray-400">
                        €{s.cost.toFixed(2)} / {s.period}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </WeekSection>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => saveNotes(e.target.value)}
            placeholder="What happened this week? What's on your mind?"
            rows={16}
            className="flex-1 border rounded-xl px-4 py-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Saved automatically. Clears at the start of a new week.</p>
        </div>
      </div>

      {showPrompt && data && (
        <PromptModal
          title="Weekly Review AI Prompt"
          prompt={buildPrompt()}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
