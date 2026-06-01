# Phase 4: Subscriptions, Habits & Tech Radar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new pages — Subscriptions Tracker, Habits Tracker with 12-week heatmaps, and Tech Radar with four-ring grid.

**Architecture:** Three independent Prisma models added in one migration. Each page follows the existing SWR + API route pattern. Habits requires a `HabitLog` join table and a toggle endpoint. Heatmap is pure client-side SVG/CSS using stored date strings. Tech Radar uses a 2×2 grid with inline add/edit/move-ring controls.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Prisma v7 + better-sqlite3, SWR, TypeScript

---

## File Map

| File | Action |
|---|---|
| `prisma/schema.prisma` | Modify — add 4 models |
| `src/app/api/subscriptions/route.ts` | Create — GET, POST |
| `src/app/api/subscriptions/[id]/route.ts` | Create — PUT, DELETE |
| `src/components/subscriptions/SubscriptionsPage.tsx` | Create |
| `src/app/subscriptions/page.tsx` | Create |
| `src/app/api/habits/route.ts` | Create — GET, POST |
| `src/app/api/habits/[id]/route.ts` | Create — PUT, DELETE |
| `src/app/api/habits/[id]/logs/route.ts` | Create — GET (last 84 days), POST (toggle today) |
| `src/components/habits/HabitsPage.tsx` | Create |
| `src/app/habits/page.tsx` | Create |
| `src/app/api/tech-radar/route.ts` | Create — GET, POST |
| `src/app/api/tech-radar/[id]/route.ts` | Create — PUT, DELETE |
| `src/components/techradar/TechRadarPage.tsx` | Create |
| `src/app/tech-radar/page.tsx` | Create |
| `src/components/Sidebar.tsx` | Modify — add 3 entries |

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] Append these four models to the end of `prisma/schema.prisma`:
```prisma
model Subscription {
  id          Int       @id @default(autoincrement())
  name        String
  cost        Float
  period      String
  renewalDate DateTime?
  url         String?
  notes       String?
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
}

model Habit {
  id        Int        @id @default(autoincrement())
  name      String
  color     String
  logs      HabitLog[]
  createdAt DateTime   @default(now())
}

model HabitLog {
  id      Int    @id @default(autoincrement())
  habitId Int
  habit   Habit  @relation(fields: [habitId], references: [id], onDelete: Cascade)
  date    String
  @@unique([habitId, date])
}

model TechRadarItem {
  id        Int      @id @default(autoincrement())
  name      String
  ring      String
  category  String
  notes     String?
  createdAt DateTime @default(now())
}
```

- [ ] Run migration:
```bash
npx prisma migrate dev --name add-subscriptions-habits-techradar
```
Expected: Migration file created, `dev.db` updated, Prisma client regenerated.

- [ ] Commit:
```bash
git add prisma/ && git commit -m "feat: add Subscription, Habit, HabitLog, TechRadarItem models"
```

---

### Task 2: Subscriptions API routes

**Files:**
- Create: `src/app/api/subscriptions/route.ts`
- Create: `src/app/api/subscriptions/[id]/route.ts`

- [ ] Create `src/app/api/subscriptions/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ renewalDate: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(subscriptions)
}

export async function POST(req: Request) {
  const { name, cost, period, renewalDate, url, notes, active } = await req.json()
  const subscription = await prisma.subscription.create({
    data: {
      name, cost: Number(cost), period,
      renewalDate: renewalDate ? new Date(renewalDate) : null,
      url: url ?? null, notes: notes ?? null,
      active: active ?? true,
    },
  })
  return NextResponse.json(subscription, { status: 201 })
}
```

- [ ] Create `src/app/api/subscriptions/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const subscription = await prisma.subscription.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name, cost: Number(data.cost), period: data.period,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      url: data.url ?? null, notes: data.notes ?? null, active: data.active,
    },
  })
  return NextResponse.json(subscription)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.subscription.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Commit:
```bash
git add src/app/api/subscriptions && git commit -m "feat: add subscriptions API routes"
```

---

### Task 3: SubscriptionsPage

**Files:**
- Create: `src/components/subscriptions/SubscriptionsPage.tsx`
- Create: `src/app/subscriptions/page.tsx`

- [ ] Create `src/components/subscriptions/SubscriptionsPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Subscription {
  id: number; name: string; cost: number; period: string
  renewalDate?: string | null; url?: string | null; notes?: string | null; active: boolean
}

const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

function monthlyEquiv(cost: number, period: string): number {
  return period === 'yearly' ? cost / 12 : cost
}

function daysUntil(renewalDate: string | null | undefined): number | null {
  if (!renewalDate) return null
  return Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000)
}

interface FormProps { initial?: Subscription; onSave: () => void; onCancel: () => void }

function SubscriptionForm({ initial, onSave, onCancel }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [period, setPeriod] = useState(initial?.period ?? 'monthly')
  const [renewalDate, setRenewalDate] = useState(initial?.renewalDate ? initial.renewalDate.slice(0, 10) : '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [active, setActive] = useState(initial?.active ?? true)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, cost: Number(cost), period, renewalDate: renewalDate || null, url: url || null, notes: notes || null, active }
    if (initial?.id) {
      await fetch(`/api/subscriptions/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Netflix)" className={field} />
      <div className="flex gap-2">
        <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className={field} />
        <select value={period} onChange={e => setPeriod(e.target.value)} className={field}>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className={field} />
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" className={field} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={field} />
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add subscription'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function SubscriptionsPage() {
  const { data: all = [], mutate } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [showActive, setShowActive] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)

  const active = all.filter(s => s.active)
  const items = showActive ? active : all
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyEquiv(s.cost, s.period), 0)
  const soonCount = active.filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d >= 0 && d <= 14 }).length

  function buildPrompt(): string {
    const lines = active.map(s => {
      const mo = monthlyEquiv(s.cost, s.period)
      const suffix = s.period === 'yearly' ? ` — €${mo.toFixed(2)}/mo equivalent` : ''
      return `- ${s.name}: €${s.cost.toFixed(2)}/${s.period}${suffix}`
    }).join('\n')
    return `Here are my active subscriptions:\n${lines}\n\nTotal monthly spend: €${monthlyTotal.toFixed(2)}\n\nIdentify any likely redundancies, suggest cuts, and flag anything that seems overpriced for what it provides.`
  }

  async function del(id: number) {
    if (!confirm('Delete this subscription?')) return
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPrompt(true)} disabled={active.length === 0}
            className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            AI Prompt
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly: €{monthlyTotal.toFixed(2)}</span>
        <Badge color="#6b7280">{active.length} active</Badge>
        {soonCount > 0 && <Badge color="#f59e0b">{soonCount} renewing soon</Badge>}
      </div>

      <div className="flex gap-2 mb-4">
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => setShowActive(v)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${showActive === v ? 'bg-blue-600 text-white border-blue-600' : 'dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {v ? 'Active' : 'All'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {items.map(s => {
          const days = daysUntil(s.renewalDate)
          const soon = days !== null && days >= 0 && days <= 14
          const mo = monthlyEquiv(s.cost, s.period)
          return (
            <div key={s.id} className={`bg-white dark:bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${soon ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'} ${!s.active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                  {soon && days !== null && <Badge color="#f59e0b">Renewing in {days}d</Badge>}
                  {!s.active && <Badge color="#6b7280">Inactive</Badge>}
                </div>
                {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{s.url}</a>}
                {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                {s.renewalDate && <p className="text-xs text-gray-400">Renews {new Date(s.renewalDate).toLocaleDateString()}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">€{s.cost.toFixed(2)}/{s.period === 'monthly' ? 'mo' : 'yr'}</p>
                {s.period === 'yearly' && <p className="text-xs text-gray-400">€{mo.toFixed(2)}/mo</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(s)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                <button onClick={() => del(s.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
              </div>
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No subscriptions yet. Add one to get started.</p>
      )}

      {showAdd && <Modal title="Add subscription" onClose={() => setShowAdd(false)}><SubscriptionForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit subscription" onClose={() => setEditing(null)}><SubscriptionForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
      {showPrompt && <PromptModal title="Subscriptions AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
```

- [ ] Create `src/app/subscriptions/page.tsx`:
```tsx
import SubscriptionsPage from '@/components/subscriptions/SubscriptionsPage'
export default function Page() { return <SubscriptionsPage /> }
```

- [ ] Commit:
```bash
git add src/components/subscriptions src/app/subscriptions && git commit -m "feat: add Subscriptions page"
```

---

### Task 4: Habits API routes

**Files:**
- Create: `src/app/api/habits/route.ts`
- Create: `src/app/api/habits/[id]/route.ts`
- Create: `src/app/api/habits/[id]/logs/route.ts`

- [ ] Create `src/app/api/habits/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const habits = await prisma.habit.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(habits)
}

export async function POST(req: Request) {
  const { name, color } = await req.json()
  const habit = await prisma.habit.create({ data: { name, color } })
  return NextResponse.json(habit, { status: 201 })
}
```

- [ ] Create `src/app/api/habits/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, color } = await req.json()
  const habit = await prisma.habit.update({
    where: { id: Number(params.id) },
    data: { name, color },
  })
  return NextResponse.json(habit)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.habit.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Create `src/app/api/habits/[id]/logs/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const since = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000)
  const sinceStr = since.toISOString().slice(0, 10)
  const logs = await prisma.habitLog.findMany({
    where: { habitId, date: { gte: sinceStr } },
    select: { date: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(logs.map(l => l.date))
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const today = new Date().toISOString().slice(0, 10)
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: 'deleted' })
  }
  await prisma.habitLog.create({ data: { habitId, date: today } })
  return NextResponse.json({ action: 'created' }, { status: 201 })
}
```

- [ ] Commit:
```bash
git add src/app/api/habits && git commit -m "feat: add habits API routes with toggle log endpoint"
```

---

### Task 5: HabitsPage

**Files:**
- Create: `src/components/habits/HabitsPage.tsx`
- Create: `src/app/habits/page.tsx`

- [ ] Create `src/components/habits/HabitsPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface Habit { id: number; name: string; color: string }

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

function HabitRow({ habit, onEdit, onDelete }: { habit: Habit; onEdit: () => void; onDelete: () => void }) {
  const { data: logDates = [], mutate } = useSWR<string[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const loggedSet = new Set(logDates)
  const today = toDateStr(new Date())
  const streak = getStreak(loggedSet)
  const heatmapDates = buildHeatmapDates()

  const weeks: Date[][] = []
  for (let i = 0; i < 12; i++) weeks.push(heatmapDates.slice(i * 7, i * 7 + 7))

  async function toggle() {
    await fetch(`/api/habits/${habit.id}/logs`, { method: 'POST' })
    mutate()
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: habit.color }} />
        <span className="font-medium text-gray-900 dark:text-white flex-1">{habit.name}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {streak > 0 ? `🔥 ${streak} day${streak !== 1 ? 's' : ''}` : '—'}
        </span>
        <button onClick={toggle}
          className="text-xs px-2 py-1 rounded-md border transition-colors"
          style={loggedSet.has(today)
            ? { background: habit.color, borderColor: habit.color, color: 'white' }
            : { borderColor: habit.color, color: habit.color }
          }>
          {loggedSet.has(today) ? '✓ Done' : 'Mark done'}
        </button>
        <button onClick={onEdit} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
        <button onClick={onDelete} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(d => {
              const ds = toDateStr(d)
              const done = loggedSet.has(ds)
              const isToday = ds === today
              const isFuture = d > new Date()
              return (
                <div
                  key={ds}
                  title={ds}
                  className={`w-3 h-3 rounded-sm transition-colors ${isToday ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''} ${isFuture ? 'invisible' : ''}`}
                  style={{ backgroundColor: done ? habit.color : 'rgb(229 231 235)' }}
                />
              )
            })}
          </div>
        ))}
      </div>
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
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)

  async function del(id: number) {
    if (!confirm('Delete this habit and all its history?')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habits</h1>
        <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Add habit
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {habits.map(h => (
          <HabitRow key={h.id} habit={h} onEdit={() => setEditing(h)} onDelete={() => del(h.id)} />
        ))}
      </div>

      {habits.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No habits yet. Add one to start tracking.</p>
      )}

      {showAdd && <Modal title="Add habit" onClose={() => setShowAdd(false)}><HabitForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit habit" onClose={() => setEditing(null)}><HabitForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
    </div>
  )
}
```

- [ ] Create `src/app/habits/page.tsx`:
```tsx
import HabitsPage from '@/components/habits/HabitsPage'
export default function Page() { return <HabitsPage /> }
```

- [ ] Commit:
```bash
git add src/components/habits src/app/habits && git commit -m "feat: add Habits page with 12-week heatmap and streaks"
```

---

### Task 6: Tech Radar API routes

**Files:**
- Create: `src/app/api/tech-radar/route.ts`
- Create: `src/app/api/tech-radar/[id]/route.ts`

- [ ] Create `src/app/api/tech-radar/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await prisma.techRadarItem.findMany({
    orderBy: [{ ring: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { name, ring, category, notes } = await req.json()
  const item = await prisma.techRadarItem.create({
    data: { name, ring, category, notes: notes ?? null },
  })
  return NextResponse.json(item, { status: 201 })
}
```

- [ ] Create `src/app/api/tech-radar/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, ring, category, notes } = await req.json()
  const item = await prisma.techRadarItem.update({
    where: { id: Number(params.id) },
    data: { name, ring, category, notes: notes ?? null },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.techRadarItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Commit:
```bash
git add src/app/api/tech-radar && git commit -m "feat: add tech radar API routes"
```

---

### Task 7: TechRadarPage

**Files:**
- Create: `src/components/techradar/TechRadarPage.tsx`
- Create: `src/app/tech-radar/page.tsx`

- [ ] Create `src/components/techradar/TechRadarPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Badge from '@/components/ui/Badge'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface TechRadarItem {
  id: number; name: string; ring: string; category: string; notes?: string | null
}

const RINGS = [
  { key: 'adopt', label: 'Adopt', color: '#10b981', desc: 'Using confidently in production' },
  { key: 'trial', label: 'Trial', color: '#f59e0b', desc: 'Actively evaluating' },
  { key: 'assess', label: 'Assess', color: '#3b82f6', desc: 'Worth watching' },
  { key: 'hold', label: 'Hold', color: '#6b7280', desc: 'Moving away from' },
] as const

const CATEGORIES = ['language', 'framework', 'tool', 'platform'] as const
const CAT_COLOR: Record<string, string> = {
  language: '#6366f1', framework: '#ec4899', tool: '#14b8a6', platform: '#f97316',
}

function InlineAddForm({ ringKey, onSave, onCancel }: {
  ringKey: string
  onSave: (data: { name: string; ring: string; category: string; notes: string | null }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('tool')
  const [notes, setNotes] = useState('')
  const f = 'border rounded-lg px-2 py-1.5 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white w-full'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, ring: ringKey, category, notes: notes || null })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={f} />
      <select value={category} onChange={e => setCategory(e.target.value)} className={f}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
      </select>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className={f} />
      <div className="flex gap-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded px-2 py-1 text-xs font-medium hover:bg-blue-700">Add</button>
        <button type="button" onClick={onCancel} className="px-2 py-1 text-xs border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function TechRadarPage() {
  const { data: items = [], mutate } = useSWR<TechRadarItem[]>('/api/tech-radar', fetcher)
  const [filterCat, setFilterCat] = useState('')
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())

  const filtered = filterCat ? items.filter(i => i.category === filterCat) : items

  async function addItem(data: { name: string; ring: string; category: string; notes: string | null }) {
    await fetch('/api/tech-radar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setAddingTo(null)
    mutate()
  }

  async function moveRing(item: TechRadarItem, newRing: string) {
    await fetch(`/api/tech-radar/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, ring: newRing }),
    })
    mutate()
  }

  function startEdit(item: TechRadarItem) {
    setEditingId(item.id); setEditName(item.name)
    setEditCategory(item.category); setEditNotes(item.notes ?? '')
  }

  async function saveEdit(item: TechRadarItem) {
    await fetch(`/api/tech-radar/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, ring: item.ring, category: editCategory, notes: editNotes || null }),
    })
    setEditingId(null); mutate()
  }

  async function del(id: number) {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/tech-radar/${id}`, { method: 'DELETE' })
    mutate()
  }

  function toggleNotes(id: number) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function buildPrompt(): string {
    const sections = RINGS.map(r => {
      const ring = items.filter(i => i.ring === r.key)
      if (!ring.length) return `${r.label.toUpperCase()}:\n(none)`
      return `${r.label.toUpperCase()}:\n${ring.map(i => `- ${i.name} (${i.category})${i.notes ? `: ${i.notes}` : ''}`).join('\n')}`
    }).join('\n\n')
    return `Here is my tech radar:\n\n${sections}\n\nBased on current industry trends (2026), what am I missing in each ring? Flag anything in Adopt that may be worth reconsidering, and suggest 2-3 technologies I should move from Assess to Trial.`
  }

  const ef = 'border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tech Radar</h1>
        <button onClick={() => setShowPrompt(true)} disabled={items.length === 0}
          className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
          AI Prompt
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterCat === cat ? 'bg-blue-600 text-white border-blue-600' : 'dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {RINGS.map(ring => {
          const ringItems = filtered.filter(i => i.ring === ring.key)
          return (
            <div key={ring.key} className="bg-white dark:bg-gray-900 border rounded-xl p-4" style={{ borderColor: ring.color + '40' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-sm" style={{ color: ring.color }}>● {ring.label}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{ring.desc}</p>
                </div>
                <button onClick={() => setAddingTo(addingTo === ring.key ? null : ring.key)}
                  className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  + Add
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {ringItems.map(item => (
                  <div key={item.id} className="group">
                    {editingId === item.id ? (
                      <div className="flex flex-col gap-1.5 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className={ef} />
                        <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className={ef}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                        <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes" className={ef} />
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(item)} className="flex-1 bg-blue-600 text-white rounded px-2 py-1 text-xs">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                            <Badge color={CAT_COLOR[item.category]}>{item.category}</Badge>
                            {item.notes && (
                              <button onClick={() => toggleNotes(item.id)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                {expandedNotes.has(item.id) ? '▲' : '▼'}
                              </button>
                            )}
                          </div>
                          {item.notes && expandedNotes.has(item.id) && (
                            <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select value={item.ring} onChange={e => moveRing(item, e.target.value)}
                            className="text-xs border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
                            {RINGS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                          </select>
                          <button onClick={() => startEdit(item)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">✎</button>
                          <button onClick={() => del(item.id)} className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {ringItems.length === 0 && addingTo !== ring.key && (
                  <p className="text-xs text-gray-400">Nothing here yet.</p>
                )}
              </div>

              {addingTo === ring.key && (
                <InlineAddForm ringKey={ring.key} onSave={addItem} onCancel={() => setAddingTo(null)} />
              )}
            </div>
          )
        })}
      </div>

      {showPrompt && (
        <PromptModal title="Tech Radar AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />
      )}
    </div>
  )
}
```

- [ ] Create `src/app/tech-radar/page.tsx`:
```tsx
import TechRadarPage from '@/components/techradar/TechRadarPage'
export default function Page() { return <TechRadarPage /> }
```

- [ ] Commit:
```bash
git add src/components/techradar src/app/tech-radar && git commit -m "feat: add Tech Radar page with four-ring grid"
```

---

### Task 8: Sidebar + build verification

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] In `src/components/Sidebar.tsx`, replace the NAV array with:
```tsx
const NAV = [
  { href: '/wishlist', label: 'Wishlist', active: true },
  { href: '/inventory', label: 'Inventory', active: true },
  { href: '/matrices', label: 'Matrices', active: true },
  { href: '/portfolio', label: 'Portfolio', active: true },
  { href: '/trends', label: 'Trends', active: true },
  { href: '/weekly-review', label: 'Weekly Review', active: true },
  { href: '/subscriptions', label: 'Subscriptions', active: true },
  { href: '/habits', label: 'Habits', active: true },
  { href: '/tech-radar', label: 'Tech Radar', active: true },
  { href: '/system', label: 'System', active: true },
]
```

- [ ] Run type check:
```bash
npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] Run build:
```bash
npx next build 2>&1 | tail -20
```
Expected: all pages compile including `/subscriptions`, `/habits`, `/tech-radar`.

- [ ] Fix any errors, then commit:
```bash
git add src/components/Sidebar.tsx && git commit -m "feat: add Subscriptions, Habits, Tech Radar to sidebar"
```
If build fixes needed: `git add -A && git commit -m "fix: resolve Phase 4 build errors"`
