'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { HomeItem, getTaskStatus, TaskStatus } from '@/lib/maintenance'
import type { LifeArea, GiftPerson, Appointment, Document, BucketTrip, BucketExperience, TravelCountry, TravelTrip, Memory, Task, Subscription } from '@/types'
import Modal from '@/components/ui/Modal'
import AppointmentForm from '@/components/tasks/AppointmentForm'
import TripForm from '@/components/travel/TripForm'
import GiftPersonForm from '@/components/gifts/GiftPersonForm'
import GiftIdeaForm from '@/components/gifts/GiftIdeaForm'
import {
  Activity, Wrench, Target, Gift, Calendar, AlertCircle,
  Clock, RefreshCw, Compass, Heart, Map, FileWarning, TrendingUp,
} from 'lucide-react'
import { holdingValue, snapshotNear, fmtEur, type NetWorthSnapshot, type PortfolioHolding } from '@/lib/netWorthUtils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ALL_WIDGETS = [
  'habits', 'maintenance', 'goals', 'gifts',
  'appointments', 'overdue-tasks', 'on-this-day', 'subscriptions',
  'travel', 'memories', 'bucket-list', 'expiring-docs', 'net-worth',
] as const
type WidgetId = typeof ALL_WIDGETS[number]

const WIDGET_LABELS: Record<WidgetId, string> = {
  'habits': 'Habits Today',
  'maintenance': 'Maintenance',
  'goals': 'Goals',
  'gifts': 'Gifts',
  'appointments': 'Upcoming Appointments',
  'overdue-tasks': 'Overdue Tasks',
  'on-this-day': 'On This Day',
  'subscriptions': 'Subscriptions Renewing',
  'travel': 'Travel',
  'memories': 'Memories',
  'bucket-list': 'Bucket List',
  'expiring-docs': 'Expiring Documents',
  'net-worth': 'Net Worth',
}

const LS_KEY = 'dashboard-hidden-widgets'

function loadHidden(): Set<WidgetId> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return new Set(JSON.parse(raw) as WidgetId[])
  } catch { /* ignore */ }
  return new Set()
}

function saveHidden(hidden: Set<WidgetId>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(hidden)))
}

const DOC_CATEGORY_COLOR: Record<string, string> = {
  Identity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function formatTripDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'Date TBD'
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const s = new Date(startDate + 'T00:00:00')
  if (!endDate) return `${MONTHS[s.getMonth()]} ${s.getDate()}`
  const e = new Date(endDate + 'T00:00:00')
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
}

function daysUntilTrip(startDate: string): number {
  const target = new Date(startDate + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}

const APPT_CATEGORY_COLOR: Record<string, string> = {
  Medical: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

interface HabitWithToday {
  id: number; name: string; color: string; doneToday: boolean
}

// Single request for all habits + today status — no N+1
function HabitTodayRow({ habit, onToggle }: { habit: HabitWithToday; onToggle: () => void }) {
  async function toggle() {
    await fetch(`/api/habits/${habit.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    onToggle()
  }

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: habit.color }} />
        {habit.name}
      </span>
      <button
        onClick={toggle}
        title={habit.doneToday ? 'Done today' : 'Mark done'}
        className={`w-5 h-5 rounded-full border-2 transition-colors shrink-0 ${
          habit.doneToday
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
        }`}
      />
    </div>
  )
}

function WidgetCard({ title, icon, accentColor, borderStyle, action, children }: {
  title: string
  icon?: React.ReactNode
  accentColor?: string
  borderStyle?: React.CSSProperties
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border rounded-xl p-4" style={borderStyle ?? {}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <h3
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: accentColor ?? undefined }}
          >
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function buildSparkPath(snaps: NetWorthSnapshot[]): string {
  if (snaps.length < 2) return ''
  const vals = snaps.map(s => s.total)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 260, H = 40
  return snaps.map((s, i) => {
    const x = (i / (snaps.length - 1)) * W
    const y = H - ((s.total - min) / range) * (H - 4)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export default function DashboardPage() {
  const [hidden, setHidden] = useState<Set<WidgetId>>(new Set())
  const [configuring, setConfiguring] = useState(false)
  const [apptToEdit, setApptToEdit] = useState<Appointment | null>(null)
  const [showAddAppt, setShowAddAppt] = useState(false)
  const [tripToEdit, setTripToEdit] = useState<TravelTrip | null>(null)
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [personToEdit, setPersonToEdit] = useState<GiftPerson | null>(null)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [addIdeaForPersonId, setAddIdeaForPersonId] = useState<number | null>(null)

  useEffect(() => { setHidden(loadHidden()) }, [])

  function toggleWidget(id: WidgetId) {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      saveHidden(next)
      return next
    })
  }

  function show(id: WidgetId) { return !hidden.has(id) }

  const { data: habits = [], isLoading: habitsLoading, mutate: mutateHabits } = useSWR<HabitWithToday[]>('/api/habits?includeToday=true', fetcher)
  const { data: maintenanceItems = [], isLoading: maintenanceLoading } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const { data: lifeAreas = [], isLoading: goalsLoading, mutate: mutateAreas } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: giftPeople = [], isLoading: giftsLoading, mutate: mutateGifts } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
  const { data: appointments = [], isLoading: apptLoading, mutate: mutateAppts } = useSWR<Appointment[]>('/api/appointments', fetcher)
  const { data: allDocs = [], isLoading: docsLoading } = useSWR<Document[]>('/api/documents', fetcher)
  const { data: bucketTrips = [], isLoading: tripsLoading } = useSWR<BucketTrip[]>('/api/bucket-list/trips', fetcher)
  const { data: bucketExperiences = [], isLoading: experiencesLoading } = useSWR<BucketExperience[]>('/api/bucket-list/experiences', fetcher)
  const { data: travelCountries = [], isLoading: travelCountriesLoading } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)
  const { data: travelTrips = [], isLoading: travelTripsLoading, mutate: mutateTravelTrips } = useSWR<TravelTrip[]>('/api/travel/trips', fetcher)
  const { data: memories = [] } = useSWR<Memory[]>('/api/memories', fetcher)
  const { data: tasks = [] } = useSWR<Task[]>('/api/tasks?done=false', fetcher)
  const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)

  const isNWVisible = !hidden.has('net-worth')
  const { data: nwSnapshots = [] } = useSWR<NetWorthSnapshot[]>(
    isNWVisible ? '/api/net-worth/snapshots' : null, fetcher)
  const { data: nwEntries = [] } = useSWR<{ value: number; type: string }[]>(
    isNWVisible ? '/api/net-worth/entries' : null, fetcher)
  const { data: nwHoldings = [] } = useSWR<PortfolioHolding[]>(
    isNWVisible ? '/api/portfolio' : null, fetcher)
  const { data: nwWishlist = [] } = useSWR<{ cost: number; purchased: boolean }[]>(
    isNWVisible ? '/api/wishlist' : null, fetcher)

  const today = new Date().toISOString().slice(0, 10)

  // ── Habits ──
  const doneCount = habits.filter(h => h.doneToday).length

  // ── On This Day ──
  const monthDay = today.slice(5) // MM-DD
  const onThisDayMemories = memories
    .filter(m => {
      const mmd = m.date.slice(5, 10)
      return mmd === monthDay && m.date.slice(0, 4) !== today.slice(0, 4)
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  // ── Documents widget ──
  const in90Days = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  const expiringDocs = allDocs
    .filter(d => d.expiryDate != null && d.expiryDate <= in90Days)
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))
    .slice(0, 5)

  // ── Maintenance widget ──
  const alertItems = maintenanceItems.flatMap(item =>
    item.tasks
      .map(t => ({ item, task: t, status: getTaskStatus(t).status }))
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
  const maintenanceAccentColor =
    worstMaintenance === 'overdue' ? '#f87171'
    : worstMaintenance === 'due-soon' ? '#fbbf24'
    : '#34d399'

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

  // ── Overdue tasks ──
  const overdueTasks = tasks
    .filter(t => t.dueDate && t.dueDate.slice(0, 10) < today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 5)

  // ── Subscriptions renewing soon ──
  const today30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const renewingSoon = subscriptions
    .filter(s => s.active && s.renewalDate != null)
    .filter(s => {
      const d = s.renewalDate!.slice(0, 10)
      return d >= today && d <= today30
    })
    .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))

  // ── Appointments widget ──
  const upcomingAppts = appointments
    .filter(a => !a.done && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  // ── Travel upcoming trips ──
  const upcomingTrips = travelTrips
    .filter(t => t.startDate != null && t.startDate >= today)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    .slice(0, 3)

  async function markApptDone(id: number) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    mutateAppts()
  }

  async function toggleMilestone(milestone: { id: number; completedAt: string | null }) {
    await fetch(`/api/milestones/${milestone.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedAt: milestone.completedAt ? null : new Date().toISOString() }),
    })
    mutateAreas()
  }

  // ── Net Worth widget ──
  const nwPortfolioTotal   = nwHoldings.reduce((s, h) => s + holdingValue(h), 0)
  const nwLiabilityTotal   = nwEntries.filter(e => e.type === 'liability').reduce((s, e) => s + e.value, 0)
  const nwSubAnnual        = subscriptions.filter(s => s.active).reduce((s, sub) => s + (sub.period === 'yearly' ? sub.cost : sub.cost * 12), 0)
  const currentNetWorth    = nwPortfolioTotal - nwLiabilityTotal - nwSubAnnual

  const sortedSnaps = [...nwSnapshots].sort((a, b) => a.date.localeCompare(b.date))
  const now = new Date()
  const latestSnap = sortedSnaps[sortedSnaps.length - 1] ?? null
  const snap30 = snapshotNear(sortedSnaps, new Date(now.getTime() - 30 * 86_400_000))
  const snap90 = snapshotNear(sortedSnaps, new Date(now.getTime() - 90 * 86_400_000))
  const nwDelta30 = latestSnap && snap30 ? latestSnap.total - snap30.total : null
  const nwDelta90 = latestSnap && snap90 ? latestSnap.total - snap90.total : null

  const nwMonthlySubs = subscriptions
    .filter(s => s.active)
    .reduce((s, sub) => s + (sub.period === 'yearly' ? sub.cost / 12 : sub.cost), 0)
  const nwWishlistTotal = nwWishlist
    .filter(i => !i.purchased)
    .reduce((s, i) => s + i.cost, 0)

  const sparkPath = buildSparkPath(sortedSnaps.slice(-6))

  // ── Memory counts ──
  const MEMORY_CATEGORIES = ['Career', 'Education', 'Travel', 'Personal', 'Other'] as const
  const memoryCounts = MEMORY_CATEGORIES
    .map(cat => ({ category: cat, count: memories.filter(m => m.category === cat).length }))
    .filter(c => c.count > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <button
          onClick={() => setConfiguring(c => !c)}
          className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {configuring ? 'Done' : 'Configure'}
        </button>
      </div>

      {configuring && (
        <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Show / hide widgets</p>
          <div className="flex flex-wrap gap-2">
            {ALL_WIDGETS.map(id => (
              <button
                key={id}
                onClick={() => toggleWidget(id)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  hidden.has(id)
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {WIDGET_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Habits Today — single request, no N+1 */}
        {show('habits') && (
          <WidgetCard title="Habits Today" icon={<Activity size={13} strokeWidth={2.5} color="#f59e0b" />} accentColor="#f59e0b">
            {habitsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : habits.length === 0 ? (
              <p className="text-sm text-gray-400">No habits set up yet.</p>
            ) : (
              <div className="flex flex-col">
                <p className="text-xs text-gray-400 mb-2">{doneCount} / {habits.length} done today</p>
                {habits.map(h => (
                  <HabitTodayRow key={h.id} habit={h} onToggle={() => mutateHabits()} />
                ))}
              </div>
            )}
          </WidgetCard>
        )}

        {/* Maintenance */}
        {show('maintenance') && (
          <WidgetCard title="Maintenance" icon={<Wrench size={13} strokeWidth={2.5} color={maintenanceAccentColor} />} accentColor={maintenanceAccentColor} borderStyle={maintenanceBorder}>
            {maintenanceLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : alertItems.length === 0 ? (
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
        )}

        {/* Goals */}
        {show('goals') && (
          <WidgetCard title="Goals" icon={<Target size={13} strokeWidth={2.5} color="#10b981" />} accentColor="#10b981">
            {goalsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : lowestGoals.length === 0 ? (
              <p className="text-sm text-gray-400">No goals set up yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {lowestGoals.map(g => (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.title}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{Math.round(g.pct * 100)}%</span>
                    </div>
                    <span className="text-xs text-gray-400">{g.areaName}</span>
                    <div className="mt-1 mb-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(g.pct * 100)}%` }} />
                    </div>
                    {g.milestones.length > 0 && (
                      <div className="flex flex-col gap-1 pl-1">
                        {[...g.milestones]
                          .sort((a, b) => {
                            if (a.completedAt === null && b.completedAt !== null) return -1
                            if (a.completedAt !== null && b.completedAt === null) return 1
                            return 0
                          })
                          .map(m => (
                            <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={m.completedAt !== null}
                                onChange={() => toggleMilestone(m)}
                                className="accent-blue-500 w-3.5 h-3.5 shrink-0"
                              />
                              <span className={`text-xs ${m.completedAt !== null ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {m.title ?? ''}
                              </span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>
        )}

        {/* Gifts */}
        {show('gifts') && (
          <WidgetCard title="Gifts" icon={<Gift size={13} strokeWidth={2.5} color="#a855f7" />} accentColor="#a855f7" action={
            <button onClick={() => setShowAddPerson(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add person</button>
          }>
            {giftsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : giftPeople.length === 0 ? (
              <p className="text-sm text-gray-400">No gift people yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {giftPeople.map(p => {
                  const bought = p.ideas.filter(i => i.purchased).length
                  const total = p.ideas.length
                  const committed = p.ideas.filter(i => i.purchased).reduce((s, i) => s + (i.estimatedCost ?? 0), 0)
                  return (
                    <div key={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-gray-500 shrink-0">{bought} / {total} bought</span>
                        <button onClick={() => setPersonToEdit(p)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">Edit</button>
                        <button onClick={() => setAddIdeaForPersonId(p.id)} className="text-xs text-blue-500 hover:text-blue-600 shrink-0">+ Idea</button>
                      </div>
                      {p.budget != null && p.budget > 0 && (
                        <div className="mt-1">
                          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                            <span>€{committed.toFixed(0)} / €{p.budget.toFixed(0)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (committed / p.budget) * 100).toFixed(0)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </WidgetCard>
        )}

        {/* Upcoming Appointments */}
        {show('appointments') && (
          <WidgetCard title="Upcoming Appointments" icon={<Calendar size={13} strokeWidth={2.5} color="#3b82f6" />} accentColor="#3b82f6" action={
            <button onClick={() => setShowAddAppt(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add</button>
          }>
            {apptLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : upcomingAppts.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming appointments.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingAppts.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">{a.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${APPT_CATEGORY_COLOR[a.category] ?? APPT_CATEGORY_COLOR.Other}`}>
                        {a.category}
                      </span>
                      <span className="text-xs text-gray-400">{a.date}</span>
                      <button onClick={() => markApptDone(a.id)} title="Mark done" className="text-xs text-green-600 hover:text-green-700 font-medium">✓</button>
                      <button onClick={() => setApptToEdit(a)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>
        )}

        {/* Overdue Tasks */}
        {show('overdue-tasks') && (
          <WidgetCard title="Overdue Tasks" icon={<AlertCircle size={13} strokeWidth={2.5} color="#ef4444" />} accentColor="#ef4444" borderStyle={overdueTasks.length > 0 ? { borderColor: '#f87171' } : {}}>
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-green-600 dark:text-green-400">No overdue tasks ✓</p>
            ) : (
              <div className="flex flex-col gap-1">
                {overdueTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        t.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        t.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>{t.priority}</span>
                      <span className="text-xs text-red-500 font-medium">{t.dueDate!.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>
        )}

        {/* On This Day */}
        {show('on-this-day') && onThisDayMemories.length > 0 && (
          <WidgetCard title="On This Day" icon={<Clock size={13} strokeWidth={2.5} color="#f43f5e" />} accentColor="#f43f5e">
            <div className="flex flex-col gap-2">
              {onThisDayMemories.map(m => {
                const yearsAgo = Number(today.slice(0, 4)) - Number(m.date.slice(0, 4))
                return (
                  <a key={m.id} href="/memories" className="flex items-start justify-between gap-2 hover:opacity-80">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-800 dark:text-gray-200 block truncate">{m.title}</span>
                      <span className="text-xs text-gray-400">{m.category} · {m.date.slice(0, 4)}</span>
                    </div>
                    <span className="text-xs text-blue-500 shrink-0 font-medium">
                      {yearsAgo}y ago
                    </span>
                  </a>
                )
              })}
            </div>
          </WidgetCard>
        )}

        {/* Subscriptions Renewing Soon */}
        {show('subscriptions') && renewingSoon.length > 0 && (
          <WidgetCard title="Subscriptions Renewing" icon={<RefreshCw size={13} strokeWidth={2.5} color="#f97316" />} accentColor="#f97316" borderStyle={{ borderColor: '#fbbf24' }}>
            <div className="flex flex-col gap-1">
              {renewingSoon.map(s => {
                const renewDate = s.renewalDate!.slice(0, 10)
                const daysLeft = Math.round(
                  (new Date(renewDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000
                )
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">
                        {daysLeft === 0 ? 'today' : `${daysLeft}d`}
                      </span>
                      <span className="text-xs text-gray-400">€{s.cost.toFixed(2)}/{s.period}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </WidgetCard>
        )}

        {/* Travel */}
        {show('travel') && (
          <WidgetCard title="Travel" icon={<Compass size={13} strokeWidth={2.5} color="#14b8a6" />} accentColor="#14b8a6" action={
            <button onClick={() => setShowAddTrip(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add trip</button>
          }>
            {travelCountriesLoading || travelTripsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : travelCountries.length === 0 && travelTrips.length === 0 ? (
              <p className="text-sm text-gray-400">No trips logged yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{travelCountries.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">countries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{travelTrips.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">trips</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{travelTrips.reduce((s, t) => s + (t.actualCost ?? 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">total spent</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Next up</p>
                  {upcomingTrips.length === 0 ? (
                    <p className="text-xs text-gray-400">No upcoming trips.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {upcomingTrips.map(t => (
                        <div key={t.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{t.countryName}</span>
                            {t.cities.length > 0 && (
                              <span className="text-xs text-gray-400 block truncate">{t.cities.join(', ')}</span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 block">{formatTripDateRange(t.startDate, t.endDate)}</span>
                            <span className="text-xs text-blue-500 block">{daysUntilTrip(t.startDate!)} days away</span>
                          </div>
                          <button onClick={() => setTripToEdit(t)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0" title="Edit trip">✏️</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <a href="/travel" className="text-xs text-blue-500 hover:text-blue-600">View all →</a>
              </div>
            )}
          </WidgetCard>
        )}

        {/* Memories */}
        {show('memories') && (
          <WidgetCard title="Memories" icon={<Heart size={13} strokeWidth={2.5} color="#8b5cf6" />} accentColor="#8b5cf6">
            {memories.length === 0 ? (
              <p className="text-sm text-gray-400">No memories yet.</p>
            ) : (
              <a href="/memories" className="hover:opacity-80 block">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {memoryCounts.map(c => `${c.category} ${c.count}`).join(' · ')}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{memories.length} total</p>
              </a>
            )}
          </WidgetCard>
        )}

        {/* Bucket List */}
        {show('bucket-list') && (
          <WidgetCard title="Bucket List" icon={<Map size={13} strokeWidth={2.5} color="#0ea5e9" />} accentColor="#0ea5e9">
            {tripsLoading || experiencesLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : bucketTrips.length === 0 && bucketExperiences.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing on your bucket list yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <a href="/bucket-list" className="flex flex-col gap-1 hover:opacity-80">
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-0.5">
                    <span>Trips</span>
                    <span className="text-xs text-gray-400">
                      {bucketTrips.filter(t => t.done).length} / {bucketTrips.length} done
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: bucketTrips.length === 0 ? '0%' : `${Math.round((bucketTrips.filter(t => t.done).length / bucketTrips.length) * 100)}%` }} />
                  </div>
                </a>
                <a href="/bucket-list" className="flex flex-col gap-1 hover:opacity-80">
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-0.5">
                    <span>Experiences</span>
                    <span className="text-xs text-gray-400">
                      {bucketExperiences.filter(e => e.done).length} / {bucketExperiences.length} done
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: bucketExperiences.length === 0 ? '0%' : `${Math.round((bucketExperiences.filter(e => e.done).length / bucketExperiences.length) * 100)}%` }} />
                  </div>
                </a>
              </div>
            )}
          </WidgetCard>
        )}

        {/* Net Worth */}
        {!hidden.has('net-worth') && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={13} strokeWidth={2.5} color="#10b981" />
              <span className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
                Net Worth
              </span>
            </div>

            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {fmtEur(currentNetWorth)}
            </p>

            {(nwDelta30 !== null || nwDelta90 !== null) && (
              <p className="text-xs mt-1 space-x-1">
                {nwDelta30 !== null && (
                  <span className={nwDelta30 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                    {nwDelta30 >= 0 ? '▲' : '▼'} {fmtEur(Math.abs(nwDelta30))} this month
                  </span>
                )}
                {nwDelta30 !== null && nwDelta90 !== null && (
                  <span className="text-gray-400">·</span>
                )}
                {nwDelta90 !== null && (
                  <span className={nwDelta90 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                    {nwDelta90 >= 0 ? '▲' : '▼'} {fmtEur(Math.abs(nwDelta90))} vs 3 mo ago
                  </span>
                )}
              </p>
            )}

            {sparkPath && (
              <div className="mt-3 mb-1">
                <svg width="100%" height="40" viewBox="0 0 260 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="nw-spark-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkPath + ' L260,40 L0,40 Z'} fill="url(#nw-spark-grad)" />
                  <path d={sparkPath} stroke="#10b981" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              Portfolio {fmtEur(nwPortfolioTotal)} · Subs {fmtEur(nwMonthlySubs)}/mo · Wishlist {fmtEur(nwWishlistTotal)} outstanding
            </p>
          </div>
        )}

        {/* Expiring Documents */}
        {show('expiring-docs') && (
          <WidgetCard title="Expiring Documents" icon={<FileWarning size={13} strokeWidth={2.5} color="#eab308" />} accentColor="#eab308">
            {docsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : expiringDocs.length === 0 ? (
              <p className="text-sm text-gray-400">No documents expiring soon.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {expiringDocs.map(d => {
                  const now = new Date(); now.setHours(0, 0, 0, 0)
                  const exp = new Date(d.expiryDate! + 'T00:00:00')
                  const days = Math.round((exp.getTime() - now.getTime()) / 86400000)
                  return (
                    <a key={d.id} href="/documents" className="flex items-center justify-between gap-2 hover:opacity-80">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{d.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${DOC_CATEGORY_COLOR[d.category] ?? DOC_CATEGORY_COLOR.Other}`}>
                          {d.category}
                        </span>
                        <span className={`text-xs font-medium ${days < 0 ? 'text-red-500' : days <= 30 ? 'text-red-500' : 'text-orange-500'}`}>
                          {days < 0 ? 'Expired' : `${days}d`}
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </WidgetCard>
        )}

      </div>

      {showAddAppt && <Modal title="Add appointment" onClose={() => setShowAddAppt(false)}><AppointmentForm onSave={() => { setShowAddAppt(false); mutateAppts() }} onCancel={() => setShowAddAppt(false)} /></Modal>}
      {apptToEdit && <Modal title="Edit appointment" onClose={() => setApptToEdit(null)}><AppointmentForm initial={apptToEdit} onSave={() => { setApptToEdit(null); mutateAppts() }} onCancel={() => setApptToEdit(null)} /></Modal>}
      {showAddTrip && <TripForm onSave={() => { setShowAddTrip(false); mutateTravelTrips() }} onCancel={() => setShowAddTrip(false)} />}
      {tripToEdit && <TripForm initial={tripToEdit} onSave={() => { setTripToEdit(null); mutateTravelTrips() }} onCancel={() => setTripToEdit(null)} />}
      {showAddPerson && <Modal title="Add person" onClose={() => setShowAddPerson(false)}><GiftPersonForm onSave={() => { setShowAddPerson(false); mutateGifts() }} onCancel={() => setShowAddPerson(false)} /></Modal>}
      {personToEdit && <Modal title="Edit person" onClose={() => setPersonToEdit(null)}><GiftPersonForm initial={personToEdit} onSave={() => { setPersonToEdit(null); mutateGifts() }} onCancel={() => setPersonToEdit(null)} /></Modal>}
      {addIdeaForPersonId != null && <Modal title="Add gift idea" onClose={() => setAddIdeaForPersonId(null)}><GiftIdeaForm personId={addIdeaForPersonId} onSave={() => { setAddIdeaForPersonId(null); mutateGifts() }} onCancel={() => setAddIdeaForPersonId(null)} /></Modal>}
    </div>
  )
}
