'use client'

import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { TaskStatus, HomeItem, getTaskStatus } from '@/lib/maintenance'
import type { Habit, LifeArea, GiftPerson, Appointment, Document, BucketTrip, BucketExperience } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DOC_CATEGORY_COLOR: Record<string, string> = {
  Identity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const APPT_CATEGORY_COLOR: Record<string, string> = {
  Medical: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

// ─── Habits Done Count ──────────────────────────────────────────────────────
function HabitDoneCheck({ habitId, today, onResult }: {
  habitId: number; today: string
  onResult: (id: number, done: boolean) => void
}) {
  const { data: logs = [] } = useSWR<string[]>(`/api/habits/${habitId}/logs`, fetcher)
  useEffect(() => { onResult(habitId, logs.includes(today)) }, [habitId, today, logs, onResult])
  return null
}

function HabitsDoneCount({ habits }: { habits: Habit[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const [doneMap, setDoneMap] = useState<Record<number, boolean>>({})
  const handleResult = useCallback((id: number, done: boolean) => {
    setDoneMap(prev => prev[id] === done ? prev : { ...prev, [id]: done })
  }, [])
  const doneCount = Object.values(doneMap).filter(Boolean).length
  return (
    <>
      {habits.map(h => (
        <HabitDoneCheck key={h.id} habitId={h.id} today={today} onResult={handleResult} />
      ))}
      <p className="text-xs text-gray-400 mb-2">
        {Object.keys(doneMap).length < habits.length ? '—' : doneCount} / {habits.length} done today
      </p>
    </>
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
  const { data: habits = [], isLoading: habitsLoading } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: maintenanceItems = [], isLoading: maintenanceLoading } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const { data: lifeAreas = [], isLoading: goalsLoading } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: giftPeople = [], isLoading: giftsLoading } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
  const { data: appointments = [], isLoading: apptLoading } = useSWR<Appointment[]>('/api/appointments', fetcher)
  const { data: allDocs = [], isLoading: docsLoading } = useSWR<Document[]>('/api/documents', fetcher)
  const { data: bucketTrips = [], isLoading: tripsLoading } = useSWR<BucketTrip[]>('/api/bucket-list/trips', fetcher)
  const { data: bucketExperiences = [], isLoading: experiencesLoading } = useSWR<BucketExperience[]>('/api/bucket-list/experiences', fetcher)

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

  // ── Appointments widget ──
  const today = new Date().toISOString().slice(0, 10)
  const upcomingAppts = appointments
    .filter(a => !a.done && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Habits Today */}
        <WidgetCard title="Habits Today">
          {habitsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : habits.length === 0 ? (
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

        {/* Goals */}
        <WidgetCard title="Goals">
          {goalsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : lowestGoals.length === 0 ? (
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
          {giftsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : peopleWithIdeas.length === 0 ? (
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

        {/* Upcoming Appointments */}
        <WidgetCard title="Upcoming Appointments">
          {apptLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : upcomingAppts.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming appointments.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingAppts.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{a.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${APPT_CATEGORY_COLOR[a.category] ?? APPT_CATEGORY_COLOR.Other}`}>
                      {a.category}
                    </span>
                    <span className="text-xs text-gray-400">{a.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        {/* Bucket List */}
        <WidgetCard title="Bucket List">
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
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: bucketTrips.length === 0
                        ? '0%'
                        : `${Math.round((bucketTrips.filter(t => t.done).length / bucketTrips.length) * 100)}%`
                    }}
                  />
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
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: bucketExperiences.length === 0
                        ? '0%'
                        : `${Math.round((bucketExperiences.filter(e => e.done).length / bucketExperiences.length) * 100)}%`
                    }}
                  />
                </div>
              </a>
            </div>
          )}
        </WidgetCard>

        {/* Expiring Documents */}
        <WidgetCard title="Expiring Documents">
          {docsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : expiringDocs.length === 0 ? (
            <p className="text-sm text-gray-400">No documents expiring soon.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {expiringDocs.map(d => {
                const now = new Date()
                now.setHours(0, 0, 0, 0)
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

      </div>
    </div>
  )
}
