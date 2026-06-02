# Todos & Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/tasks` page with Tasks and Appointments tabs, integrating with the wishlist and goals pages, and surfacing upcoming appointments on the dashboard.

**Architecture:** Single `/tasks` route with two tabs — Tasks (subtasks, source links, priority sections) and Appointments (recurring, cost, overdue/upcoming sections). Tabs are link-based following the ItemsTabs pattern. Wishlist and Goals pages open an inline TaskForm modal to add tasks pre-linked to their items. Dashboard adds an Upcoming Appointments widget.

**Tech Stack:** Next.js App Router, Prisma + SQLite, SWR, Tailwind CSS, TypeScript

---

## File Map

**New files:**
- `prisma/schema.prisma` — add Task, Subtask, TaskSourceLink, Appointment models
- `src/app/api/tasks/route.ts` — GET list, POST create
- `src/app/api/tasks/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/tasks/[id]/subtasks/route.ts` — POST add subtask
- `src/app/api/tasks/subtasks/[id]/route.ts` — PUT toggle/rename, DELETE
- `src/app/api/appointments/route.ts` — GET list, POST create
- `src/app/api/appointments/[id]/route.ts` — PUT, DELETE
- `src/components/tasks/TaskForm.tsx` — create/edit modal form for tasks
- `src/components/tasks/AppointmentForm.tsx` — create/edit modal form for appointments
- `src/components/tasks/TasksTab.tsx` — Tasks tab UI
- `src/components/tasks/AppointmentsTab.tsx` — Appointments tab UI
- `src/components/tasks/TasksPage.tsx` — page shell with tab switcher
- `src/app/tasks/page.tsx` — Next.js route

**Modified files:**
- `src/components/Sidebar.tsx` — add Tasks nav entry
- `src/components/dashboard/DashboardPage.tsx` — add Upcoming Appointments widget
- `src/components/wishlist/WishlistPage.tsx` — add "Add to Tasks" button per item
- `src/components/goals/GoalsPage.tsx` — add "Add to Tasks" button per milestone

---

## Task 1: Prisma Schema — Add Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add models to schema**

Append to the end of `prisma/schema.prisma`:

```prisma
model Task {
  id         Int             @id @default(autoincrement())
  title      String
  priority   String          @default("Medium")
  dueDate    DateTime?
  category   String?
  notes      String?
  done       Boolean         @default(false)
  createdAt  DateTime        @default(now())
  subtasks   Subtask[]
  sourceLink TaskSourceLink?
}

model Subtask {
  id     Int     @id @default(autoincrement())
  taskId Int
  task   Task    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  title  String
  done   Boolean @default(false)
}

model TaskSourceLink {
  id         Int    @id @default(autoincrement())
  taskId     Int    @unique
  task       Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  sourceType String
  sourceId   Int
}

model Appointment {
  id                Int      @id @default(autoincrement())
  title             String
  date              String
  time              String?
  location          String?
  category          String   @default("Other")
  notes             String?
  done              Boolean  @default(false)
  cost              Float?
  recurring         Boolean  @default(false)
  recurringInterval String?
  createdAt         DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/than/PersonalAssistant && npx prisma migrate dev --name add-tasks-appointments
```

Expected output: `✔ Generated Prisma Client` and migration applied with no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Task, Subtask, TaskSourceLink, Appointment models"
```

---

## Task 2: Tasks List API

**Files:**
- Create: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { subtasks: true, sourceLink: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const { title, priority, dueDate, category, notes, subtasks = [], sourceLink } = await req.json()
  const task = await prisma.task.create({
    data: {
      title,
      priority: priority ?? 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category ?? null,
      notes: notes ?? null,
      subtasks: subtasks.length > 0
        ? { create: subtasks.map((s: { title: string }) => ({ title: s.title })) }
        : undefined,
      sourceLink: sourceLink
        ? { create: { sourceType: sourceLink.sourceType, sourceId: Number(sourceLink.sourceId) } }
        : undefined,
    },
    include: { subtasks: true, sourceLink: true },
  })
  return NextResponse.json(task, { status: 201 })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat: add GET/POST /api/tasks"
```

---

## Task 3: Task Detail API

**Files:**
- Create: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: Number(params.id) },
    include: { subtasks: true, sourceLink: true },
  })
  if (!task) return new NextResponse(null, { status: 404 })
  return NextResponse.json(task)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, priority, dueDate, category, notes, done } = await req.json()
  const task = await prisma.task.update({
    where: { id: Number(params.id) },
    data: {
      title,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category ?? null,
      notes: notes ?? null,
      done: done ?? false,
    },
    include: { subtasks: true, sourceLink: true },
  })
  return NextResponse.json(task)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.task.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat: add GET/PUT/DELETE /api/tasks/[id]"
```

---

## Task 4: Subtasks API

**Files:**
- Create: `src/app/api/tasks/[id]/subtasks/route.ts`
- Create: `src/app/api/tasks/subtasks/[id]/route.ts`

- [ ] **Step 1: Create subtasks creation route**

`src/app/api/tasks/[id]/subtasks/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { title } = await req.json()
  const subtask = await prisma.subtask.create({
    data: { taskId: Number(params.id), title },
  })
  return NextResponse.json(subtask, { status: 201 })
}
```

- [ ] **Step 2: Create subtask update/delete route**

`src/app/api/tasks/subtasks/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, done } = await req.json()
  const subtask = await prisma.subtask.update({
    where: { id: Number(params.id) },
    data: {
      ...(title != null ? { title } : {}),
      ...(done != null ? { done } : {}),
    },
  })
  return NextResponse.json(subtask)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.subtask.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/[id]/subtasks/route.ts src/app/api/tasks/subtasks/[id]/route.ts
git commit -m "feat: add subtasks API routes"
```

---

## Task 5: Appointments API

**Files:**
- Create: `src/app/api/appointments/route.ts`
- Create: `src/app/api/appointments/[id]/route.ts`

- [ ] **Step 1: Create appointments list route**

`src/app/api/appointments/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const appointments = await prisma.appointment.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(appointments)
}

export async function POST(req: Request) {
  const { title, date, time, location, category, notes, cost, recurring, recurringInterval } = await req.json()
  const appointment = await prisma.appointment.create({
    data: {
      title,
      date,
      time: time ?? null,
      location: location ?? null,
      category: category ?? 'Other',
      notes: notes ?? null,
      cost: cost != null ? Number(cost) : null,
      recurring: recurring ?? false,
      recurringInterval: recurringInterval ?? null,
    },
  })
  return NextResponse.json(appointment, { status: 201 })
}
```

- [ ] **Step 2: Create appointment detail route**

`src/app/api/appointments/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, date, time, location, category, notes, cost, recurring, recurringInterval, done } = await req.json()
  const appointment = await prisma.appointment.update({
    where: { id: Number(params.id) },
    data: {
      title,
      date,
      time: time ?? null,
      location: location ?? null,
      category,
      notes: notes ?? null,
      cost: cost != null ? Number(cost) : null,
      recurring: recurring ?? false,
      recurringInterval: recurringInterval ?? null,
      done: done ?? false,
    },
  })
  return NextResponse.json(appointment)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.appointment.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/appointments/route.ts src/app/api/appointments/[id]/route.ts
git commit -m "feat: add GET/POST /api/appointments and PUT/DELETE /api/appointments/[id]"
```

---

## Task 6: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append new types**

Add to the end of `src/types/index.ts`:

```typescript
export interface Subtask {
  id: number
  taskId: number
  title: string
  done: boolean
}

export interface TaskSourceLink {
  id: number
  taskId: number
  sourceType: 'wishlist' | 'goal'
  sourceId: number
}

export interface Task {
  id: number
  title: string
  priority: string
  dueDate: string | null
  category: string | null
  notes: string | null
  done: boolean
  createdAt: string
  subtasks: Subtask[]
  sourceLink: TaskSourceLink | null
}

export interface Appointment {
  id: number
  title: string
  date: string
  time: string | null
  location: string | null
  category: string
  notes: string | null
  done: boolean
  cost: number | null
  recurring: boolean
  recurringInterval: string | null
  createdAt: string
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Task, Subtask, TaskSourceLink, Appointment types"
```

---

## Task 7: TaskForm Component

**Files:**
- Create: `src/components/tasks/TaskForm.tsx`

This form handles both create and edit. In create mode subtasks are drafted locally and sent in the POST body. In edit mode task fields are updated via PUT; subtasks are managed inline in the expanded row (not in this form), so the form only shows existing subtask titles as read-only reference.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Task, TaskSourceLink } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SubtaskDraft { title: string }
interface WishlistOption { id: number; name: string }
interface GoalOption { id: number; name: string }
interface LifeAreaWithGoals { id: number; goals: { id: number; title: string }[] }

interface TaskFormProps {
  initial?: Task
  preTitle?: string
  preSourceLink?: { sourceType: 'wishlist' | 'goal'; sourceId: number }
  onSave: () => void
  onCancel: () => void
}

export default function TaskForm({ initial, preTitle, preSourceLink, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? preTitle ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.slice(0, 10) : ''
  )
  const [category, setCategory] = useState(initial?.category ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [sourceType, setSourceType] = useState<'' | 'wishlist' | 'goal'>(
    initial?.sourceLink?.sourceType ?? preSourceLink?.sourceType ?? ''
  )
  const [sourceId, setSourceId] = useState<number | ''>(
    initial?.sourceLink?.sourceId ?? preSourceLink?.sourceId ?? ''
  )

  const { data: wishlistItems = [] } = useSWR<WishlistOption[]>(
    sourceType === 'wishlist' ? '/api/wishlist' : null,
    fetcher
  )
  const { data: lifeAreas = [] } = useSWR<LifeAreaWithGoals[]>(
    sourceType === 'goal' ? '/api/life-areas' : null,
    fetcher
  )
  const goalOptions: GoalOption[] = lifeAreas.flatMap(a =>
    a.goals.map(g => ({ id: g.id, name: g.title }))
  )
  const sourceOptions: { id: number; name: string }[] =
    sourceType === 'wishlist' ? wishlistItems : goalOptions

  function addSubtask() {
    const t = newSubtask.trim()
    if (!t) return
    setSubtasks(prev => [...prev, { title: t }])
    setNewSubtask('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      title,
      priority,
      dueDate: dueDate || null,
      category: category || null,
      notes: notes || null,
      subtasks,
      sourceLink: sourceType && sourceId
        ? { sourceType, sourceId: Number(sourceId) }
        : null,
    }
    if (initial?.id) {
      await fetch(`/api/tasks/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
        <input required className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
          <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
          <input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <input className={inputCls} placeholder="e.g. Shopping, Learning…" value={category} onChange={e => setCategory(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea rows={2} className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {!initial && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtasks</label>
          <div className="flex flex-col gap-1 mb-2">
            {subtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{s.title}</span>
                <button
                  type="button"
                  onClick={() => setSubtasks(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add subtask…"
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
            />
            <button
              type="button"
              onClick={addSubtask}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to</label>
        <div className="flex gap-2">
          <select
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={sourceType}
            onChange={e => { setSourceType(e.target.value as '' | 'wishlist' | 'goal'); setSourceId('') }}
          >
            <option value="">None</option>
            <option value="wishlist">Wishlist item</option>
            <option value="goal">Goal</option>
          </select>
          {sourceType && (
            <select
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={sourceId}
              onChange={e => setSourceId(Number(e.target.value))}
            >
              <option value="">Select…</option>
              {sourceOptions.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          Save
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/TaskForm.tsx
git commit -m "feat: add TaskForm component"
```

---

## Task 8: AppointmentForm Component

**Files:**
- Create: `src/components/tasks/AppointmentForm.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState } from 'react'
import type { Appointment } from '@/types'

const CATEGORIES = ['Medical', 'Vehicle', 'Personal', 'Other']
const INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: '6months', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
]

interface AppointmentFormProps {
  initial?: Appointment
  onSave: () => void
  onCancel: () => void
}

export default function AppointmentForm({ initial, onSave, onCancel }: AppointmentFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '')
  const [recurring, setRecurring] = useState(initial?.recurring ?? false)
  const [recurringInterval, setRecurringInterval] = useState(initial?.recurringInterval ?? 'yearly')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      title,
      date,
      time: time || null,
      location: location || null,
      category,
      notes: notes || null,
      cost: cost ? Number(cost) : null,
      recurring,
      recurringInterval: recurring ? recurringInterval : null,
    }
    if (initial?.id) {
      await fetch(`/api/appointments/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
        <input required className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
          <input required type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
          <input type="time" className={inputCls} value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
          <select required className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            placeholder="0.00"
            value={cost}
            onChange={e => setCost(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
        <input className={inputCls} placeholder="e.g. Dr. Smith's office" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea rows={2} className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={recurring}
            onChange={e => setRecurring(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring</span>
        </label>
        {recurring && (
          <select
            className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={recurringInterval}
            onChange={e => setRecurringInterval(e.target.value)}
          >
            {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          Save
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/AppointmentForm.tsx
git commit -m "feat: add AppointmentForm component"
```

---

## Task 9: TasksTab Component

**Files:**
- Create: `src/components/tasks/TasksTab.tsx`

`TaskRow` and `Section` are defined at module level (outside `TasksTab`) so they can use hooks legally.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import TaskForm from './TaskForm'
import type { Task, Subtask } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRIORITY_COLOR: Record<string, string> = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

async function toggleSubtaskApi(subtask: Subtask) {
  await fetch(`/api/tasks/subtasks/${subtask.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: !subtask.done }),
  })
}

async function deleteSubtaskApi(id: number) {
  await fetch(`/api/tasks/subtasks/${id}`, { method: 'DELETE' })
}

async function addSubtaskApi(taskId: number, title: string) {
  await fetch(`/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

function TaskRow({
  task,
  onMutate,
  onEdit,
}: {
  task: Task
  onMutate: () => void
  onEdit: (t: Task) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newSub, setNewSub] = useState('')

  const doneCount = task.subtasks.filter(s => s.done).length
  const priorityColor = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.Medium

  async function toggleDone() {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
        category: task.category,
        notes: task.notes,
        done: !task.done,
      }),
    })
    onMutate()
  }

  async function handleDeleteTask() {
    if (!confirm('Delete this task?')) return
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    onMutate()
  }

  async function handleToggleSubtask(subtask: Subtask) {
    await toggleSubtaskApi(subtask)
    onMutate()
  }

  async function handleDeleteSubtask(id: number) {
    await deleteSubtaskApi(id)
    onMutate()
  }

  async function handleAddSubtask() {
    const t = newSub.trim()
    if (!t) return
    await addSubtaskApi(task.id, t)
    setNewSub('')
    onMutate()
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(e => !e)}
      >
        <button
          onClick={e => { e.stopPropagation(); toggleDone() }}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
            task.done
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          }`}
        />
        <span className={`flex-1 text-sm font-medium min-w-0 truncate ${
          task.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
        }`}>
          {task.title}
        </span>
        {task.subtasks.length > 0 && (
          <span className="text-xs text-gray-400 shrink-0">{doneCount}/{task.subtasks.length}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityColor}`}>
          {task.priority}
        </span>
        {task.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
            {task.category}
          </span>
        )}
        {task.dueDate && (
          <span className="text-xs text-gray-400 shrink-0">{task.dueDate.slice(0, 10)}</span>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          {task.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{task.notes}</p>
          )}
          {task.sourceLink && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
              Linked from: {task.sourceLink.sourceType === 'wishlist' ? 'Wishlist' : 'Goal'} #{task.sourceLink.sourceId}
            </p>
          )}

          {/* Subtasks */}
          <div className="flex flex-col gap-1.5 mb-3">
            {task.subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSubtask(s)}
                  className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-white transition-colors ${
                    s.done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                >
                  {s.done && <span className="text-xs leading-none">✓</span>}
                </button>
                <span className={`text-sm flex-1 ${s.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {s.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(s.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add subtask…"
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
            />
            <button
              onClick={handleAddSubtask}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Add
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => onEdit(task)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Edit
            </button>
            <button onClick={handleDeleteTask} className="text-sm text-red-500 hover:underline">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  tasks,
  onMutate,
  onEdit,
  defaultOpen = true,
}: {
  title: string
  tasks: Task[]
  onMutate: () => void
  onEdit: (t: Task) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (tasks.length === 0) return null
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <span className="text-xs">{open ? '▾' : '▸'}</span>
        {title}
        <span className="font-normal text-gray-400">({tasks.length})</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {tasks.map(t => (
            <TaskRow key={t.id} task={t} onMutate={onMutate} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TasksTab() {
  const { data: tasks = [], mutate } = useSWR<Task[]>('/api/tasks', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const active = tasks.filter(t => !t.done)
  const overdue = active.filter(t => t.dueDate && t.dueDate.slice(0, 10) < today)
  const dueSoon = active.filter(
    t => t.dueDate && t.dueDate.slice(0, 10) >= today && t.dueDate.slice(0, 10) <= in7
  )
  const upcoming = active.filter(t => t.dueDate && t.dueDate.slice(0, 10) > in7)
  const noDate = active.filter(t => !t.dueDate)
  const done = tasks.filter(t => t.done)

  function closeModal() {
    setShowAdd(false)
    setEditing(null)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          + Add task
        </button>
      </div>

      {tasks.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No tasks yet. Add your first task!</p>
      )}

      <Section title="Overdue" tasks={overdue} onMutate={mutate} onEdit={setEditing} />
      <Section title="Due soon (7 days)" tasks={dueSoon} onMutate={mutate} onEdit={setEditing} />
      <Section title="Upcoming" tasks={upcoming} onMutate={mutate} onEdit={setEditing} />
      <Section title="No due date" tasks={noDate} onMutate={mutate} onEdit={setEditing} />
      <Section title="Done" tasks={done} onMutate={mutate} onEdit={setEditing} defaultOpen={false} />

      {(showAdd || editing) && (
        <Modal title={editing ? 'Edit task' : 'New task'} onClose={closeModal}>
          <TaskForm
            initial={editing ?? undefined}
            onSave={() => { closeModal(); mutate() }}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/TasksTab.tsx
git commit -m "feat: add TasksTab component"
```

---

## Task 10: AppointmentsTab Component

**Files:**
- Create: `src/components/tasks/AppointmentsTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import AppointmentForm from './AppointmentForm'
import type { Appointment } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORY_COLOR: Record<string, string> = {
  Medical: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function advanceDate(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (interval === '6months') d.setMonth(d.getMonth() + 6)
  else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function ApptRow({
  appt,
  onMutate,
  onEdit,
}: {
  appt: Appointment
  onMutate: () => void
  onEdit: (a: Appointment) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const categoryColor = CATEGORY_COLOR[appt.category] ?? CATEGORY_COLOR.Other

  async function markDone() {
    await fetch(`/api/appointments/${appt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appt, done: true }),
    })
    onMutate()
  }

  async function markDoneAndScheduleNext() {
    await fetch(`/api/appointments/${appt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appt, done: true }),
    })
    const nextDate = advanceDate(appt.date, appt.recurringInterval ?? 'yearly')
    await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: appt.title,
        date: nextDate,
        time: appt.time,
        location: appt.location,
        category: appt.category,
        notes: appt.notes,
        cost: appt.cost,
        recurring: true,
        recurringInterval: appt.recurringInterval,
      }),
    })
    onMutate()
  }

  async function handleDelete() {
    if (!confirm('Delete this appointment?')) return
    await fetch(`/api/appointments/${appt.id}`, { method: 'DELETE' })
    onMutate()
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${categoryColor}`}>
          {appt.category}
        </span>
        <span className={`flex-1 text-sm font-medium min-w-0 truncate ${
          appt.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
        }`}>
          {appt.title}
        </span>
        {appt.recurring && (
          <span className="text-xs text-gray-400 shrink-0">↻</span>
        )}
        {appt.cost != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">€{appt.cost}</span>
        )}
        <span className="text-xs text-gray-400 shrink-0">
          {appt.date}{appt.time ? ` ${appt.time}` : ''}
        </span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          {appt.location && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">📍 {appt.location}</p>
          )}
          {appt.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{appt.notes}</p>
          )}
          {appt.recurring && appt.recurringInterval && (
            <p className="text-xs text-gray-400 mb-3">
              Recurring: {appt.recurringInterval === '6months' ? 'every 6 months' : appt.recurringInterval}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!appt.done && (
              appt.recurring
                ? (
                  <button
                    onClick={markDoneAndScheduleNext}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                  >
                    Mark done & schedule next
                  </button>
                )
                : (
                  <button
                    onClick={markDone}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                  >
                    Mark done
                  </button>
                )
            )}
            <button onClick={() => onEdit(appt)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Edit
            </button>
            <button onClick={handleDelete} className="text-sm text-red-500 hover:underline">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ApptSection({
  title,
  appts,
  onMutate,
  onEdit,
  defaultOpen = true,
}: {
  title: string
  appts: Appointment[]
  onMutate: () => void
  onEdit: (a: Appointment) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (appts.length === 0) return null
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <span className="text-xs">{open ? '▾' : '▸'}</span>
        {title}
        <span className="font-normal text-gray-400">({appts.length})</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {appts.map(a => (
            <ApptRow key={a.id} appt={a} onMutate={onMutate} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppointmentsTab() {
  const { data: appointments = [], mutate } = useSWR<Appointment[]>('/api/appointments', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const active = appointments.filter(a => !a.done)
  const overdue = active.filter(a => a.date < today)
  const thisWeek = active.filter(a => a.date >= today && a.date <= in7)
  const upcoming = active.filter(a => a.date > in7)
  const done = appointments.filter(a => a.done)

  function closeModal() {
    setShowAdd(false)
    setEditing(null)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          + Add appointment
        </button>
      </div>

      {appointments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No appointments yet.</p>
      )}

      <ApptSection title="Overdue" appts={overdue} onMutate={mutate} onEdit={setEditing} />
      <ApptSection title="This week" appts={thisWeek} onMutate={mutate} onEdit={setEditing} />
      <ApptSection title="Upcoming" appts={upcoming} onMutate={mutate} onEdit={setEditing} />
      <ApptSection title="Done" appts={done} onMutate={mutate} onEdit={setEditing} defaultOpen={false} />

      {(showAdd || editing) && (
        <Modal title={editing ? 'Edit appointment' : 'New appointment'} onClose={closeModal}>
          <AppointmentForm
            initial={editing ?? undefined}
            onSave={() => { closeModal(); mutate() }}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/AppointmentsTab.tsx
git commit -m "feat: add AppointmentsTab component"
```

---

## Task 11: TasksPage and Next.js Shell

**Files:**
- Create: `src/components/tasks/TasksPage.tsx`
- Create: `src/app/tasks/page.tsx`

- [ ] **Step 1: Create TasksPage component**

`src/components/tasks/TasksPage.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import TasksTab from './TasksTab'
import AppointmentsTab from './AppointmentsTab'

type TabId = 'tasks' | 'appointments'

export default function TasksPage() {
  const params = useSearchParams()
  const activeTab: TabId = (params.get('tab') as TabId) ?? 'tasks'

  function tabClass(id: TabId) {
    return `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === id
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tasks</h1>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <Link href="/tasks?tab=tasks" className={tabClass('tasks')}>Tasks</Link>
        <Link href="/tasks?tab=appointments" className={tabClass('appointments')}>Appointments</Link>
      </div>

      {activeTab === 'tasks' ? <TasksTab /> : <AppointmentsTab />}
    </div>
  )
}
```

- [ ] **Step 2: Create Next.js page shell**

`src/app/tasks/page.tsx`:

```tsx
import { Suspense } from 'react'
import TasksPage from '@/components/tasks/TasksPage'

export default function Page() {
  return (
    <Suspense>
      <TasksPage />
    </Suspense>
  )
}
```

The `Suspense` boundary is required because `TasksPage` uses `useSearchParams()`, which needs it in the App Router.

- [ ] **Step 3: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/TasksPage.tsx src/app/tasks/page.tsx
git commit -m "feat: add TasksPage and /tasks route"
```

---

## Task 12: Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add Tasks entry**

In `src/components/Sidebar.tsx`, find the NAV array and add the Tasks entry after Goals:

```typescript
const NAV = [
  { href: '/', label: 'Dashboard', active: true },
  { href: '/wishlist', label: 'Items', active: true },
  { href: '/matrices', label: 'Matrices', active: true },
  { href: '/net-worth', label: 'Net Worth', active: true },
  { href: '/finance', label: 'Finance', active: true },
  { href: '/weekly-review', label: 'Weekly Review', active: true },
  { href: '/subscriptions', label: 'Subscriptions', active: true },
  { href: '/habits', label: 'Habits', active: true },
  { href: '/goals', label: 'Goals', active: true },
  { href: '/tasks', label: 'Tasks', active: true },
  { href: '/maintenance', label: 'Maintenance', active: true },
  { href: '/timeline', label: 'Timeline', active: true },
  { href: '/gifts', label: 'Gifts', active: true },
  { href: '/tech-radar', label: 'Tech Radar', active: true },
  { href: '/system', label: 'System', active: true },
]
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Tasks to sidebar"
```

---

## Task 13: Dashboard Upcoming Appointments Widget

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add appointments fetch and widget**

In `src/components/dashboard/DashboardPage.tsx`:

1. Add `Appointment` to the import from `@/types`:

```typescript
import type { Habit, LifeArea, GiftPerson, Appointment } from '@/types'
```

2. Add the `CATEGORY_COLOR` map near the top of the file (after the imports):

```typescript
const APPT_CATEGORY_COLOR: Record<string, string> = {
  Medical: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}
```

3. Inside `DashboardPage`, add the appointments SWR fetch alongside the existing ones:

```typescript
const { data: appointments = [], isLoading: apptLoading } = useSWR<Appointment[]>('/api/appointments', fetcher)
```

4. Add the computed upcoming list (after existing computed values):

```typescript
const today = new Date().toISOString().slice(0, 10)
const upcomingAppts = appointments
  .filter(a => !a.done && a.date >= today)
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(0, 5)
```

5. Add the widget inside the grid (after the Gifts WidgetCard closing tag, before `</div></div>`):

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add upcoming appointments widget to dashboard"
```

---

## Task 14: Wishlist "Add to Tasks" Integration

**Files:**
- Modify: `src/components/wishlist/WishlistPage.tsx`

- [ ] **Step 1: Add state and TaskForm import**

At the top of `src/components/wishlist/WishlistPage.tsx`, add the import:

```typescript
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/tasks/TaskForm'
```

(`Modal` is already imported — check before adding.)

Inside `WishlistPage`, add state for the task creation trigger:

```typescript
const [addToTask, setAddToTask] = useState<{ title: string; sourceId: number } | null>(null)
```

- [ ] **Step 2: Add "Add to Tasks" button on each item row**

In the JSX where each wishlist item is rendered (inside the `.filter(i => !i.purchased)` grouping), add the button alongside the existing edit/delete/markGotIt buttons. Find the section rendering individual item cards and add:

```tsx
<button
  onClick={() => setAddToTask({ title: item.name, sourceId: item.id })}
  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
>
  + Task
</button>
```

- [ ] **Step 3: Add the modal at the bottom of the return JSX**

Before the closing `</div>` of the component return, add:

```tsx
{addToTask && (
  <Modal title="Add to Tasks" onClose={() => setAddToTask(null)}>
    <TaskForm
      preTitle={addToTask.title}
      preSourceLink={{ sourceType: 'wishlist', sourceId: addToTask.sourceId }}
      onSave={() => setAddToTask(null)}
      onCancel={() => setAddToTask(null)}
    />
  </Modal>
)}
```

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/wishlist/WishlistPage.tsx
git commit -m "feat: add 'Add to Tasks' button to wishlist items"
```

---

## Task 15: Goals "Add to Tasks" Integration

**Files:**
- Modify: `src/components/goals/GoalsPage.tsx`

- [ ] **Step 1: Add state and TaskForm import**

At the top of `src/components/goals/GoalsPage.tsx`, add:

```typescript
import TaskForm from '@/components/tasks/TaskForm'
```

Inside `GoalsPage`, add state:

```typescript
const [addToTask, setAddToTask] = useState<{ title: string; goalId: number } | null>(null)
```

- [ ] **Step 2: Add "Add to Tasks" button on each milestone**

In the JSX where milestones are rendered (each milestone row), add a button after the existing milestone toggle/delete controls:

```tsx
<button
  onClick={() => setAddToTask({ title: milestone.title, goalId: milestone.goalId })}
  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-2"
>
  + Task
</button>
```

- [ ] **Step 3: Add the modal**

Before the closing `</div>` of the component return, add:

```tsx
{addToTask && (
  <Modal title="Add to Tasks" onClose={() => setAddToTask(null)}>
    <TaskForm
      preTitle={addToTask.title}
      preSourceLink={{ sourceType: 'goal', sourceId: addToTask.goalId }}
      onSave={() => setAddToTask(null)}
      onCancel={() => setAddToTask(null)}
    />
  </Modal>
)}
```

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/goals/GoalsPage.tsx
git commit -m "feat: add 'Add to Tasks' button to goal milestones"
```

---

## Task 16: Final Verification

- [ ] **Step 1: Start the dev server**

```bash
cd /home/than/PersonalAssistant && npm run dev
```

- [ ] **Step 2: Verify Tasks tab**

Open `http://localhost:3000/tasks`. Confirm:
- Tasks tab is selected by default
- "Add task" button opens modal with all fields (title, priority, due date, category, notes, subtasks, link to)
- Creating a task shows it in the correct section (Overdue / Due soon / Upcoming / No due date)
- Clicking a task row expands it, showing subtasks and edit/delete buttons
- Subtask checkboxes toggle done state
- Adding a subtask from the expanded row works
- Editing a task via the Edit button opens the form pre-filled

- [ ] **Step 3: Verify Appointments tab**

Click "Appointments" tab. Confirm:
- "Add appointment" button opens modal with all fields
- Creating an appointment shows it in the correct section
- Expanding an appointment shows location, notes, recurring info
- "Mark done" works for non-recurring appointments
- "Mark done & schedule next" creates a new appointment with the advanced date for recurring ones
- Category badges use the correct colors

- [ ] **Step 4: Verify Dashboard widget**

Navigate to `http://localhost:3000`. Confirm:
- "Upcoming Appointments" widget is visible
- It shows upcoming (not done, date ≥ today) appointments with category badge and date

- [ ] **Step 5: Verify Wishlist integration**

Navigate to `http://localhost:3000/wishlist`. Confirm:
- Each wishlist item has a "+ Task" button
- Clicking it opens the TaskForm modal pre-filled with the item name
- Saving creates a task visible on `/tasks`

- [ ] **Step 6: Verify Goals integration**

Navigate to `http://localhost:3000/goals`. Confirm:
- Each milestone has a "+ Task" button
- Clicking it opens the TaskForm pre-filled with the milestone title
- Saving creates a task visible on `/tasks`
