'use client'

import useSWR from 'swr'
import { getTaskStatus } from '@/lib/maintenance'
import type { HomeItem } from '@/lib/maintenance'
import type { Subscription } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Types ───────────────────────────────────────────────────────────────────
interface TimelineEntry {
  type: 'maintenance' | 'subscription'
  label: string
  sublabel?: string
  date: string   // YYYY-MM-DD
  status: 'overdue' | 'due-soon' | 'ok'
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayStr(): string { return new Date().toISOString().slice(0, 10) }

function endOfWeekStr(): string {
  const d = new Date()
  const dow = d.getDay() || 7
  d.setDate(d.getDate() + (7 - dow))
  return d.toISOString().slice(0, 10)
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Row ──────────────────────────────────────────────────────────────────────
const TYPE_BG: Record<string, string> = { maintenance: '#3b82f6', subscription: '#8b5cf6' }
const STATUS_CLS: Record<string, string> = {
  overdue: 'text-red-500',
  'due-soon': 'text-amber-500',
  ok: 'text-green-600 dark:text-green-400',
}
const STATUS_LABEL: Record<string, string> = { overdue: 'Overdue', 'due-soon': 'Due soon', ok: 'Upcoming' }

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span
        className="text-xs font-medium px-1.5 py-0.5 rounded text-white shrink-0 mt-0.5"
        style={{ background: TYPE_BG[entry.type] }}
      >
        {entry.type === 'maintenance' ? 'Maint' : 'Sub'}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{entry.label}</span>
        {entry.sublabel && <span className="text-xs text-gray-400 block truncate">{entry.sublabel}</span>}
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs text-gray-500 block">{fmtDate(entry.date)}</span>
        <span className={`text-xs font-medium ${STATUS_CLS[entry.status]}`}>{STATUS_LABEL[entry.status]}</span>
      </div>
    </div>
  )
}

// ─── Bucket section ───────────────────────────────────────────────────────────
function Bucket({ title, entries }: { title: string; entries: TimelineEntry[] }) {
  if (entries.length === 0) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{title} ({entries.length})</h2>
      {entries.map(e => <TimelineRow key={`${e.type}-${e.label}-${e.date}`} entry={e} />)}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const { data: maintenanceItems = [] } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)

  const today = todayStr()
  const eow = endOfWeekStr()
  const in30 = daysFromNow(30)
  const in90 = daysFromNow(90)

  const entries: TimelineEntry[] = []

  for (const item of maintenanceItems) {
    for (const task of item.tasks) {
      const { nextDue } = getTaskStatus(task)
      if (!nextDue || nextDue > in90) continue
      entries.push({
        type: 'maintenance',
        label: item.name,
        sublabel: task.description,
        date: nextDue,
        status: nextDue < today ? 'overdue' : nextDue <= in30 ? 'due-soon' : 'ok',
      })
    }
  }

  for (const sub of subscriptions) {
    if (!sub.active || !sub.renewalDate) continue
    const date = sub.renewalDate.slice(0, 10)
    if (date > in90) continue
    entries.push({
      type: 'subscription',
      label: sub.name,
      date,
      status: date < today ? 'overdue' : date <= in30 ? 'due-soon' : 'ok',
    })
  }

  entries.sort((a, b) => a.date.localeCompare(b.date))

  const overdue = entries.filter(e => e.date < today)
  const thisWeek = entries.filter(e => e.date >= today && e.date <= eow)
  const next30 = entries.filter(e => e.date > eow && e.date <= in30)
  const next90 = entries.filter(e => e.date > in30 && e.date <= in90)
  const total = entries.length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Timeline</h1>
      {total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Nothing due in the next 90 days.</p>
      ) : (
        <>
          <Bucket title="Overdue" entries={overdue} />
          <Bucket title="This week" entries={thisWeek} />
          <Bucket title="Next 30 days" entries={next30} />
          <Bucket title="Next 90 days" entries={next90} />
        </>
      )}
    </div>
  )
}
