# Habits + Goals Unified Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Goals/Habits tab switcher on `/life` with a unified view where each LifeArea section shows its goals then its habits, with habits explicitly assigned to a LifeArea.

**Architecture:** Add nullable `lifeAreaId` to the `Habit` schema. Extract `HabitRow` and `HabitForm` from `HabitsPage.tsx` into separate files, and extract goal sub-components into `AreaDetail.tsx`. Rewrite `LifePage.tsx` to fetch both `/api/life-areas` and `/api/habits`, group habits by `lifeAreaId`, and render a unified accordion layout. The existing `/goals` and `/habits` routes are untouched.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Prisma/SQLite, SWR, Tailwind CSS

---

### Task 1: Schema — add lifeAreaId to Habit

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update the Habit and LifeArea models**

In `prisma/schema.prisma`, replace the `LifeArea` model:

```prisma
model LifeArea {
  id        Int      @id @default(autoincrement())
  name      String
  color     String
  goals     Goal[]
  habits    Habit[]
  createdAt DateTime @default(now())
}
```

And replace the `Habit` model:

```prisma
model Habit {
  id         Int             @id @default(autoincrement())
  lifeAreaId Int?
  lifeArea   LifeArea?       @relation(fields: [lifeAreaId], references: [id], onDelete: SetNull)
  name       String
  color      String
  logs       HabitLog[]
  goalLinks  GoalHabitLink[]
  archivedAt DateTime?
  createdAt  DateTime        @default(now())
}
```

- [ ] **Step 2: Push schema and regenerate client**

```bash
cd /home/than/PersonalAssistant
npx prisma db push
npx prisma generate
```

Expected: `Your database is now in sync with your Prisma schema.` and `Generated Prisma Client`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing build errors unrelated to this change).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add lifeAreaId to Habit schema"
```

---

### Task 2: API — habits accept lifeAreaId; update shared Habit type

**Files:**
- Modify: `src/app/api/habits/route.ts`
- Modify: `src/app/api/habits/[id]/route.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update POST /api/habits to accept lifeAreaId**

In `src/app/api/habits/route.ts`, replace the POST handler:

```typescript
export async function POST(req: Request) {
  const { name, color, lifeAreaId } = await req.json()
  const habit = await prisma.habit.create({
    data: { name, color, lifeAreaId: lifeAreaId != null ? Number(lifeAreaId) : null },
  })
  return NextResponse.json(habit, { status: 201 })
}
```

- [ ] **Step 2: Update PUT /api/habits/[id] to accept lifeAreaId**

Replace the entire `src/app/api/habits/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, color, archived, lifeAreaId } = body
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (color !== undefined) data.color = color
  if (archived === true) data.archivedAt = new Date()
  if (archived === false) data.archivedAt = null
  if ('lifeAreaId' in body) data.lifeAreaId = lifeAreaId != null ? Number(lifeAreaId) : null
  const habit = await prisma.habit.update({
    where: { id: Number(params.id) },
    data,
  })
  return NextResponse.json(habit)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.habit.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Add lifeAreaId to the shared Habit type**

In `src/types/index.ts`, replace the `Habit` interface:

```typescript
export interface Habit { id: number; lifeAreaId: number | null; name: string; color: string; goalLinks: GoalLink[]; doneToday?: boolean }
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/habits/route.ts src/app/api/habits/[id]/route.ts src/types/index.ts
git commit -m "feat: habits API accepts lifeAreaId in POST and PUT"
```

---

### Task 3: Extract goals sub-components to AreaDetail.tsx

**Files:**
- Create: `src/components/goals/AreaDetail.tsx`

This file receives the goal-rendering components currently inlined in `GoalsPage.tsx`: the type definitions, helper functions, `GoalForm`, `GoalRow`, and `AreaDetail`. They are extracted verbatim and exported so both `GoalsPage` and the new `LifePage` can import them.

- [ ] **Step 1: Create `src/components/goals/AreaDetail.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/tasks/TaskForm'

// ---- Types (exported for consumers) ----

export interface HabitRef { id: number; name: string; color: string }
export interface GoalHabitLink { id: number; habitId: number; habit: HabitRef }
export interface Milestone {
  id: number
  goalId: number
  title: string
  completedAt: string | null
  targetDate?: string | null
}
export interface Goal {
  id: number
  lifeAreaId: number
  title: string
  timePeriod: string
  notes: string | null
  milestones: Milestone[]
  habitLinks: GoalHabitLink[]
}
export interface LifeArea {
  id: number
  name: string
  color: string
  goals: Goal[]
}

// ---- Helpers (exported for consumers) ----

export function parseTimePeriod(tp: string): { start: Date; end: Date } | null {
  const y = tp.match(/^(\d{4})$/)
  if (y) return { start: new Date(`${y[1]}-01-01`), end: new Date(`${y[1]}-12-31`) }
  const q = tp.match(/^Q([1-4])\s+(\d{4})$/i)
  if (q) {
    const qn = Number(q[1]); const yr = Number(q[2])
    const sm = (qn - 1) * 3
    return { start: new Date(yr, sm, 1), end: new Date(yr, sm + 3, 0) }
  }
  const h = tp.match(/^H([12])\s+(\d{4})$/i)
  if (h) {
    const hn = Number(h[1]); const yr = Number(h[2])
    return { start: new Date(yr, hn === 1 ? 0 : 6, 1), end: new Date(yr, hn === 1 ? 5 : 11, hn === 1 ? 30 : 31) }
  }
  return null
}

export function calcProgress(goal: Goal, habitLogs: Record<number, string[]>): number {
  const total = goal.milestones.length
  const done = goal.milestones.filter(m => m.completedAt !== null).length
  const milestoneRate = total === 0 ? 0 : done / total
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const habitRates = goal.habitLinks.map(link => {
    const logs = habitLogs[link.habitId] ?? []
    return logs.filter(d => d.startsWith(monthPrefix)).length / daysInMonth
  })
  const habitRate = habitRates.length === 0 ? null : habitRates.reduce((a, b) => a + b, 0) / habitRates.length
  if (total === 0 && habitRate === null) return 0
  if (total === 0) return habitRate!
  if (habitRate === null) return milestoneRate
  return milestoneRate * 0.6 + habitRate * 0.4
}

export function calcAreaProgress(area: LifeArea, habitLogs: Record<number, string[]>): number {
  if (area.goals.length === 0) return 0
  return area.goals.reduce((acc, g) => acc + calcProgress(g, habitLogs), 0) / area.goals.length
}

export function useHabitLogs(habitIds: number[]): Record<number, string[]> {
  const [logs, setLogs] = useState<Record<number, string[]>>({})
  useEffect(() => {
    if (habitIds.length === 0) return
    Promise.allSettled(
      habitIds.map(id =>
        fetch(`/api/habits/${id}/logs`)
          .then(r => r.json())
          .then((ls: { date: string }[]) => ({ id, dates: ls.map(l => l.date) }))
      )
    ).then(results => {
      const map: Record<number, string[]> = {}
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.dates })
      setLogs(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitIds.join(',')])
  return logs
}

// ---- GoalForm ----

export function GoalForm({ initial, areaId, onSave, onCancel }: {
  initial?: Goal; areaId: number; onSave: () => void; onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [timePeriod, setTimePeriod] = useState(initial?.timePeriod ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/goals/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, timePeriod, notes: notes || null }) })
    } else {
      await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lifeAreaId: areaId, title, timePeriod, notes: notes || null }) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input required value={timePeriod} onChange={e => setTimePeriod(e.target.value)} placeholder="Time period (e.g. 2026, Q2 2026)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add goal'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ---- GoalRow ----

function GoalRow({ goal, allHabits, habitLogs, onMutate }: {
  goal: Goal; allHabits: HabitRef[]; habitLogs: Record<number, string[]>; onMutate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [showLinkHabit, setShowLinkHabit] = useState(false)
  const [addToTask, setAddToTask] = useState<{ title: string; goalId: number } | null>(null)

  const pct = Math.round(calcProgress(goal, habitLogs) * 100)
  const now = new Date()
  const period = parseTimePeriod(goal.timePeriod)
  const timeElapsedPct = period
    ? Math.min(100, Math.max(0, Math.round(((now.getTime() - period.start.getTime()) / (period.end.getTime() - period.start.getTime())) * 100)))
    : null
  const isOverdue = period ? now > period.end : false

  async function toggleMilestone(m: Milestone) {
    await fetch(`/api/milestones/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completedAt: m.completedAt ? null : new Date().toISOString() }) })
    onMutate()
  }

  async function deleteMilestone(id: number) {
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    onMutate()
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newMilestone.trim()) return
    await fetch(`/api/goals/${goal.id}/milestones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newMilestone.trim(), targetDate: newMilestoneDate || null }) })
    setNewMilestone(''); setNewMilestoneDate(''); setAddingMilestone(false); onMutate()
  }

  async function linkHabit(habitId: number) {
    await fetch(`/api/goals/${goal.id}/habits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habitId }) })
    setShowLinkHabit(false); onMutate()
  }

  async function unlinkHabit(linkId: number) {
    await fetch(`/api/goal-habits/${linkId}`, { method: 'DELETE' })
    onMutate()
  }

  const linkedHabitIds = new Set(goal.habitLinks.map(l => l.habitId))
  const linkableHabits = allHabits.filter(h => !linkedHabitIds.has(h.id))

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{goal.title}</span>
          <span className="ml-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{goal.timePeriod}</span>
          {timeElapsedPct !== null && (
            <div className="mt-1.5">
              <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                <span>Time elapsed</span>
                <span className={isOverdue ? 'text-red-500' : ''}>{timeElapsedPct}%</span>
              </div>
              <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isOverdue ? 'bg-red-400' : timeElapsedPct > 75 ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-500'}`} style={{ width: `${timeElapsedPct}%` }} />
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{pct}%</span>
        <span className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-l-2 ml-4" style={{ borderColor: 'transparent' }}>
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Milestones</p>
            <div className="flex flex-col gap-1.5">
              {goal.milestones.map(m => {
                const today = new Date().toISOString().slice(0, 10)
                const overdue = !m.completedAt && m.targetDate && m.targetDate < today
                const daysLeft = m.targetDate && !m.completedAt
                  ? Math.round((new Date(m.targetDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
                  : null
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <button onClick={() => toggleMilestone(m)} className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${m.completedAt ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}>
                      {m.completedAt && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className={`text-sm flex-1 ${m.completedAt ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{m.title}</span>
                    {daysLeft !== null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${overdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {overdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'today' : `${daysLeft}d`}
                      </span>
                    )}
                    <button onClick={() => setAddToTask({ title: m.title, goalId: m.goalId })} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-2">+ Task</button>
                    <button onClick={() => deleteMilestone(m.id)} className="text-xs text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400">×</button>
                  </div>
                )
              })}
            </div>
            {addingMilestone ? (
              <form onSubmit={addMilestone} className="flex flex-col gap-1.5 mt-2">
                <div className="flex gap-2">
                  <input autoFocus value={newMilestone} onChange={e => setNewMilestone(e.target.value)} placeholder="Milestone title" className="flex-1 text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                  <input type="date" value={newMilestoneDate} onChange={e => setNewMilestoneDate(e.target.value)} className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white" title="Target date (optional)" />
                </div>
                <div className="flex gap-1">
                  <button type="submit" className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                  <button type="button" onClick={() => setAddingMilestone(false)} className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setAddingMilestone(true)} className="mt-2 text-xs text-blue-500 hover:text-blue-600">+ Add milestone</button>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Linked habits</p>
            <div className="flex flex-wrap gap-2">
              {goal.habitLinks.map(link => (
                <span key={link.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white" style={{ background: link.habit.color }}>
                  {link.habit.name}
                  <button onClick={() => unlinkHabit(link.id)} className="opacity-70 hover:opacity-100 ml-0.5">×</button>
                </span>
              ))}
              {showLinkHabit ? (
                <div className="flex flex-col gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2 shadow-sm">
                  {linkableHabits.length === 0 ? (
                    <p className="text-xs text-gray-400 px-1">All habits already linked</p>
                  ) : (
                    linkableHabits.map(h => (
                      <button key={h.id} onClick={() => linkHabit(h.id)} className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: h.color }} />
                        {h.name}
                      </button>
                    ))
                  )}
                  <button onClick={() => setShowLinkHabit(false)} className="text-xs text-gray-400 mt-1 hover:text-gray-600">Close</button>
                </div>
              ) : (
                <button onClick={() => setShowLinkHabit(true)} className="text-xs text-blue-500 hover:text-blue-600">+ Link habit</button>
              )}
            </div>
          </div>
        </div>
      )}
      {addToTask && (
        <Modal title="Add to Tasks" onClose={() => setAddToTask(null)}>
          <TaskForm preTitle={addToTask.title} preSourceLink={{ sourceType: 'goal', sourceId: addToTask.goalId }} onSave={() => setAddToTask(null)} onCancel={() => setAddToTask(null)} />
        </Modal>
      )}
    </div>
  )
}

// ---- AreaDetail (default export) ----

export default function AreaDetail({ area, allHabits, habitLogs, onMutate }: {
  area: LifeArea; allHabits: HabitRef[]; habitLogs: Record<number, string[]>; onMutate: () => void
}) {
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  async function deleteGoal(id: number) {
    if (!confirm('Delete this goal and all its milestones?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    onMutate()
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700">
      {area.goals.map(goal => (
        <div key={goal.id} className="relative group">
          <GoalRow goal={goal} allHabits={allHabits} habitLogs={habitLogs} onMutate={onMutate} />
          <div className="absolute top-2.5 right-10 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditingGoal(goal)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900">Edit</button>
            <button onClick={() => deleteGoal(goal.id)} className="text-xs px-1.5 py-0.5 text-red-400 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 bg-white dark:bg-gray-900">Del</button>
          </div>
        </div>
      ))}
      {area.goals.length === 0 && <p className="text-sm text-gray-400 px-4 py-3">No goals yet.</p>}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
        <button onClick={() => setShowAddGoal(true)} className="text-sm text-blue-500 hover:text-blue-600">+ Add goal</button>
      </div>
      {showAddGoal && <Modal title="Add goal" onClose={() => setShowAddGoal(false)}><GoalForm areaId={area.id} onSave={() => { setShowAddGoal(false); onMutate() }} onCancel={() => setShowAddGoal(false)} /></Modal>}
      {editingGoal && <Modal title="Edit goal" onClose={() => setEditingGoal(null)}><GoalForm initial={editingGoal} areaId={area.id} onSave={() => { setEditingGoal(null); onMutate() }} onCancel={() => setEditingGoal(null)} /></Modal>}
    </div>
  )
}
```

- [ ] **Step 2: Verify file compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/goals/AreaDetail.tsx
git commit -m "feat: extract GoalRow, GoalForm, AreaDetail to goals/AreaDetail.tsx"
```

---

### Task 4: Update GoalsPage to import from AreaDetail.tsx

**Files:**
- Modify: `src/components/goals/GoalsPage.tsx`

- [ ] **Step 1: Replace GoalsPage.tsx**

The existing `GoalsPage.tsx` defines its own copies of the types, helpers, and components now in `AreaDetail.tsx`. Replace the full file:

```typescript
'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import AreaDetail, { LifeArea, HabitRef, GoalForm, calcAreaProgress, useHabitLogs } from './AreaDetail'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function AreaForm({ initial, onSave, onCancel }: { initial?: LifeArea; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/life-areas/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
    } else {
      await fetch('/api/life-areas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Area name (e.g. Health, Career)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <div className="flex gap-2 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
            style={{ background: c }} />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add area'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function GoalsPage() {
  const { data: areas = [], mutate } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: allHabits = [] } = useSWR<HabitRef[]>('/api/habits', fetcher)
  const [expandedAreaId, setExpandedAreaId] = useState<number | null>(null)
  const [showAddArea, setShowAddArea] = useState(false)
  const [editingArea, setEditingArea] = useState<LifeArea | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const allLinkedHabitIds = useMemo(
    () => Array.from(new Set(areas.flatMap(a => a.goals.flatMap(g => g.habitLinks.map(l => l.habitId))))),
    [areas]
  )
  const habitLogs = useHabitLogs(allLinkedHabitIds)

  function buildGoalsPrompt(): string {
    const now = new Date()
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const areaLines = areas.map(area => {
      const goalLines = area.goals.map(goal => {
        const done = goal.milestones.filter(m => m.completedAt !== null).length
        const total = goal.milestones.length
        const milestonesStr = total > 0
          ? `Milestones: ${done}/${total} done` + '\n      ' + goal.milestones.map(m => `[${m.completedAt ? 'x' : ' '}] ${m.title}`).join('\n      ')
          : 'No milestones'
        const habitStr = goal.habitLinks.length > 0
          ? 'Habits: ' + goal.habitLinks.map(l => {
              const logs = habitLogs[l.habitId] ?? []
              const count = logs.filter(d => d.startsWith(monthPrefix)).length
              return `${l.habit.name} (${count}/${daysInMonth} days this month)`
            }).join(', ')
          : 'No linked habits'
        return `  Goal: ${goal.title} [${goal.timePeriod}]\n    ${milestonesStr}\n    ${habitStr}`
      }).join('\n')
      return `Area: ${area.name}\n${goalLines || '  No goals yet'}`
    }).join('\n\n')
    return `Here is my current goals snapshot as of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\n${areaLines}\n\nPlease analyse this snapshot. Identify which areas or goals are on track versus at risk, flag any goals with no milestones or habits backing them up, and suggest 2-3 concrete actions I should focus on this week to make the most progress.`
  }

  async function deleteArea(id: number) {
    if (!confirm('Delete this area and all its goals?')) return
    await fetch(`/api/life-areas/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
        <div className="flex gap-2">
          {areas.length > 0 && (
            <button onClick={() => setShowPrompt(true)} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Generate AI Prompt</button>
          )}
          <button onClick={() => setShowAddArea(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add area</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map(area => {
          const progress = calcAreaProgress(area, habitLogs)
          const pct = Math.round(progress * 100)
          const isExpanded = expandedAreaId === area.id
          return (
            <div key={area.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-4 cursor-pointer flex items-center gap-3" onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: area.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{area.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{area.goals.length} goal{area.goals.length !== 1 ? 's' : ''} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: area.color }} />
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingArea(area)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => deleteArea(area.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? '▾' : '▸'}</span>
              </div>
              {isExpanded && <AreaDetail area={area} allHabits={allHabits} habitLogs={habitLogs} onMutate={mutate} />}
            </div>
          )
        })}
      </div>

      {areas.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No life areas yet. Add one to get started.</p>}

      {showAddArea && <Modal title="Add life area" onClose={() => setShowAddArea(false)}><AreaForm onSave={() => { setShowAddArea(false); mutate() }} onCancel={() => setShowAddArea(false)} /></Modal>}
      {editingArea && <Modal title="Edit life area" onClose={() => setEditingArea(null)}><AreaForm initial={editingArea} onSave={() => { setEditingArea(null); mutate() }} onCancel={() => setEditingArea(null)} /></Modal>}
      {showPrompt && <PromptModal title="Goals AI Prompt" prompt={buildGoalsPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript and confirm /goals page still works**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Navigate to `http://localhost:3000/goals` in a browser. Confirm areas, goals, milestones, and habit links render and interact correctly.

- [ ] **Step 3: Commit**

```bash
git add src/components/goals/GoalsPage.tsx
git commit -m "refactor: GoalsPage imports from AreaDetail.tsx"
```

---

### Task 5: Extract HabitRow to its own file

**Files:**
- Create: `src/components/habits/HabitRow.tsx`

- [ ] **Step 1: Create `src/components/habits/HabitRow.tsx`**

```typescript
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
  return d.toISOString().slice(0, 10)
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

  const weeks: Date[][] = []
  for (let i = 0; i < 12; i++) weeks.push(heatmapDates.slice(i * 7, i * 7 + 7))

  const isDone = loggedSet.has(today)
  const todayNote = logMap.get(today)?.note ?? null

  async function toggle(note?: string | null) {
    await fetch(`/api/habits/${habit.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note ?? null }),
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

      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
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
                  className={`w-3 h-3 rounded-sm transition-colors ${isToday ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''} ${isFuture ? 'invisible' : ''}`}
                  style={{ backgroundColor: done ? habit.color : 'rgb(229 231 235)' }}
                />
              )
            })}
          </div>
        ))}
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitRow.tsx
git commit -m "feat: extract HabitRow component to its own file"
```

---

### Task 6: Extract HabitForm with LifeArea picker

**Files:**
- Create: `src/components/habits/HabitForm.tsx`

- [ ] **Step 1: Create `src/components/habits/HabitForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface HabitForForm {
  id: number
  name: string
  color: string
  lifeAreaId?: number | null
}

interface LifeAreaOption { id: number; name: string }

export default function HabitForm({ initial, defaultLifeAreaId, onSave, onCancel }: {
  initial?: HabitForForm
  defaultLifeAreaId?: number | null
  onSave: () => void
  onCancel: () => void
}) {
  const { data: lifeAreas = [] } = useSWR<LifeAreaOption[]>('/api/life-areas', fetcher)
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [lifeAreaId, setLifeAreaId] = useState<number | null>(
    initial?.lifeAreaId !== undefined ? (initial.lifeAreaId ?? null) : (defaultLifeAreaId ?? null)
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, color, lifeAreaId }
    if (initial?.id) {
      await fetch(`/api/habits/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Life Area</label>
        <select
          value={lifeAreaId ?? ''}
          onChange={e => setLifeAreaId(e.target.value ? Number(e.target.value) : null)}
          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="">None (unassigned)</option>
          {lifeAreas.map(area => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/habits/HabitForm.tsx
git commit -m "feat: extract HabitForm with LifeArea picker"
```

---

### Task 7: Update HabitsPage to use extracted components

**Files:**
- Modify: `src/components/habits/HabitsPage.tsx`

- [ ] **Step 1: Replace HabitsPage.tsx**

```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import HabitRow, { Habit } from './HabitRow'
import HabitForm from './HabitForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface HabitLog { date: string; note: string | null }

export default function HabitsPage() {
  const { data: habits = [], mutate } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: archivedHabits = [], mutate: mutateArchived } = useSWR<Habit[]>('/api/habits?archived=true', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [loadingPrompt, setLoadingPrompt] = useState(false)

  async function del(id: number) {
    if (!confirm('Delete this habit and all its history?')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    mutate()
  }

  async function archive(id: number) {
    if (!confirm('Archive this habit? You can restore it later from the Archived section.')) return
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) })
    mutate(); mutateArchived()
  }

  async function restore(id: number) {
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) })
    mutate(); mutateArchived()
  }

  async function openPrompt() {
    setLoadingPrompt(true)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const cutoffStr = new Date(now.getTime() - 83 * 86400000).toISOString().slice(0, 10)
    const todayStr = now.toISOString().slice(0, 10)

    const lines = await Promise.all(
      habits.map(async h => {
        const logs: HabitLog[] = await fetch(`/api/habits/${h.id}/logs`).then(r => r.json())
        const logSet = new Set(logs.map(l => l.date))
        let streak = 0
        let cursor = new Date(logSet.has(todayStr) ? now : new Date(now.getTime() - 86400000))
        while (logSet.has(cursor.toISOString().slice(0, 10))) {
          streak++
          cursor = new Date(cursor.getTime() - 86400000)
        }
        const recent = logs.filter(l => l.date >= cutoffStr)
        const pct = Math.round((recent.length / 84) * 100)
        return `- ${h.name}: ${streak} day streak · ${pct}% consistency over last 12 weeks (${recent.length}/84 days)`
      })
    )

    const prompt = `Here is my habit tracking snapshot as of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:\n\n${lines.join('\n')}\n\nPlease analyse this. For each habit: call out whether the consistency is strong, inconsistent, or struggling. Identify which habit has the best momentum and which is at most risk of being abandoned. Suggest one concrete change I could make this week to improve the weakest habit without disrupting the strongest.`

    setPromptText(prompt)
    setLoadingPrompt(false)
    setShowPrompt(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habits</h1>
        <div className="flex gap-2">
          {habits.length > 0 && (
            <button onClick={openPrompt} disabled={loadingPrompt} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {loadingPrompt ? 'Loading…' : 'Generate AI Prompt'}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add habit</button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {habits.map(h => (
          <HabitRow key={h.id} habit={h} onEdit={() => setEditing(h)} onDelete={() => del(h.id)} onArchive={() => archive(h.id)} />
        ))}
      </div>

      {habits.length === 0 && archivedHabits.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No habits yet. Add one to start tracking.</p>
      )}

      {archivedHabits.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowArchived(v => !v)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <span>{showArchived ? '▾' : '▸'}</span>
            Archived ({archivedHabits.length})
          </button>
          {showArchived && (
            <div className="flex flex-col gap-2 mt-2">
              {archivedHabits.map(h => (
                <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.color }} />
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{h.name}</span>
                  <button onClick={() => restore(h.id)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && <Modal title="Add habit" onClose={() => setShowAdd(false)}><HabitForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit habit" onClose={() => setEditing(null)}><HabitForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
      {showPrompt && <PromptModal title="Habits AI Prompt" prompt={promptText} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript and that /habits page still works**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Navigate to `http://localhost:3000/habits`. Confirm habits list, mark done, archive, and add habit (including new LifeArea dropdown) all work.

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitsPage.tsx
git commit -m "refactor: HabitsPage imports HabitRow and HabitForm from separate files"
```

---

### Task 8: Rewrite LifePage as unified view

**Files:**
- Modify: `src/components/life/LifePage.tsx`

- [ ] **Step 1: Replace LifePage.tsx**

```typescript
'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import AreaDetail, { LifeArea, HabitRef, calcAreaProgress, useHabitLogs } from '@/components/goals/AreaDetail'
import HabitRow, { Habit } from '@/components/habits/HabitRow'
import HabitForm, { PRESET_COLORS } from '@/components/habits/HabitForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function AreaForm({ initial, onSave, onCancel }: { initial?: LifeArea; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/life-areas/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
    } else {
      await fetch('/api/life-areas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Area name (e.g. Health, Career)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <div className="flex gap-2 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
            style={{ background: c }} />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add area'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function LifePage() {
  const { data: areas = [], mutate: mutateAreas } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: allHabits = [], mutate: mutateHabits } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: archivedHabits = [], mutate: mutateArchived } = useSWR<Habit[]>('/api/habits?archived=true', fetcher)

  const [expandedAreaId, setExpandedAreaId] = useState<number | null>(null)
  const [showAddArea, setShowAddArea] = useState(false)
  const [editingArea, setEditingArea] = useState<LifeArea | null>(null)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [addingHabitToArea, setAddingHabitToArea] = useState<number | null>(null)
  const [showUnassigned, setShowUnassigned] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  const habitsByArea = useMemo(() => {
    const map = new Map<number, Habit[]>()
    for (const h of allHabits) {
      if (h.lifeAreaId != null) {
        if (!map.has(h.lifeAreaId)) map.set(h.lifeAreaId, [])
        map.get(h.lifeAreaId)!.push(h)
      }
    }
    return map
  }, [allHabits])

  const unassignedHabits = useMemo(() => allHabits.filter(h => h.lifeAreaId == null), [allHabits])

  const allLinkedHabitIds = useMemo(
    () => Array.from(new Set(areas.flatMap(a => a.goals.flatMap(g => g.habitLinks.map(l => l.habitId))))),
    [areas]
  )
  const habitLogs = useHabitLogs(allLinkedHabitIds)

  const allHabitsAsRef: HabitRef[] = useMemo(
    () => allHabits.map(h => ({ id: h.id, name: h.name, color: h.color })),
    [allHabits]
  )

  function mutateAll() { mutateAreas(); mutateHabits(); mutateArchived() }

  async function deleteArea(id: number) {
    if (!confirm('Delete this area and all its goals?')) return
    await fetch(`/api/life-areas/${id}`, { method: 'DELETE' })
    mutateAreas()
  }

  async function deleteHabit(id: number) {
    if (!confirm('Delete this habit and all its history?')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    mutateHabits(); mutateArchived()
  }

  async function archiveHabit(id: number) {
    if (!confirm('Archive this habit? You can restore it later from the Archived section.')) return
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) })
    mutateHabits(); mutateArchived()
  }

  async function restoreHabit(id: number) {
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) })
    mutateHabits(); mutateArchived()
  }

  function buildPrompt(): string {
    const now = new Date()
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const areaLines = areas.map(area => {
      const goalLines = area.goals.map(goal => {
        const done = goal.milestones.filter(m => m.completedAt !== null).length
        const total = goal.milestones.length
        const milestonesStr = total > 0
          ? `Milestones: ${done}/${total} done\n      ` + goal.milestones.map(m => `[${m.completedAt ? 'x' : ' '}] ${m.title}`).join('\n      ')
          : 'No milestones'
        const habitStr = goal.habitLinks.length > 0
          ? 'Habits: ' + goal.habitLinks.map(l => {
              const logs = habitLogs[l.habitId] ?? []
              return `${l.habit.name} (${logs.filter(d => d.startsWith(monthPrefix)).length}/${daysInMonth} days this month)`
            }).join(', ')
          : 'No linked habits'
        return `  Goal: ${goal.title} [${goal.timePeriod}]\n    ${milestonesStr}\n    ${habitStr}`
      }).join('\n')
      const areaHabits = (habitsByArea.get(area.id) ?? []).map(h => `  - Habit: ${h.name}`).join('\n')
      return `Area: ${area.name}\n${goalLines || '  No goals yet'}${areaHabits ? '\n' + areaHabits : ''}`
    }).join('\n\n')
    return `Here is my current life snapshot as of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\n${areaLines}\n\nPlease analyse this snapshot. Identify which areas or goals are on track versus at risk, flag goals with no milestones or habits backing them up, and suggest 2-3 concrete actions to focus on this week.`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Life</h1>
        <div className="flex gap-2">
          {(areas.length > 0 || allHabits.length > 0) && (
            <button onClick={() => setShowPrompt(true)} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Generate AI Prompt</button>
          )}
          <button onClick={() => setShowAddArea(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add area</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map(area => {
          const progress = calcAreaProgress(area, habitLogs)
          const pct = Math.round(progress * 100)
          const isExpanded = expandedAreaId === area.id
          const areaHabits = habitsByArea.get(area.id) ?? []

          return (
            <div key={area.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-4 cursor-pointer flex items-center gap-3" onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: area.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{area.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {area.goals.length} goal{area.goals.length !== 1 ? 's' : ''} · {areaHabits.length} habit{areaHabits.length !== 1 ? 's' : ''} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: area.color }} />
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingArea(area)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => deleteArea(area.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? '▾' : '▸'}</span>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <p className="px-4 pt-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Goals</p>
                  <AreaDetail area={area} allHabits={allHabitsAsRef} habitLogs={habitLogs} onMutate={mutateAreas} />

                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Habits</p>
                    <div className="px-3 pb-2 flex flex-col gap-2">
                      {areaHabits.map(h => (
                        <HabitRow key={h.id} habit={h} onEdit={() => setEditingHabit(h)} onDelete={() => deleteHabit(h.id)} onArchive={() => archiveHabit(h.id)} />
                      ))}
                      {areaHabits.length === 0 && <p className="text-sm text-gray-400 py-1 px-1">No habits in this area yet.</p>}
                    </div>
                    <div className="px-4 pb-3">
                      <button onClick={() => setAddingHabitToArea(area.id)} className="text-sm text-blue-500 hover:text-blue-600">+ Add habit</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {areas.length === 0 && unassignedHabits.length === 0 && archivedHabits.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No life areas yet. Add one to get started.</p>
      )}

      {unassignedHabits.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowUnassigned(v => !v)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <span>{showUnassigned ? '▾' : '▸'}</span>
            Unassigned habits ({unassignedHabits.length})
          </button>
          {showUnassigned && (
            <div className="flex flex-col gap-2 mt-2">
              {unassignedHabits.map(h => (
                <HabitRow key={h.id} habit={h} onEdit={() => setEditingHabit(h)} onDelete={() => deleteHabit(h.id)} onArchive={() => archiveHabit(h.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {archivedHabits.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowArchived(v => !v)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <span>{showArchived ? '▾' : '▸'}</span>
            Archived habits ({archivedHabits.length})
          </button>
          {showArchived && (
            <div className="flex flex-col gap-2 mt-2">
              {archivedHabits.map(h => (
                <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.color }} />
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{h.name}</span>
                  <button onClick={() => restoreHabit(h.id)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddArea && <Modal title="Add life area" onClose={() => setShowAddArea(false)}><AreaForm onSave={() => { setShowAddArea(false); mutateAreas() }} onCancel={() => setShowAddArea(false)} /></Modal>}
      {editingArea && <Modal title="Edit life area" onClose={() => setEditingArea(null)}><AreaForm initial={editingArea} onSave={() => { setEditingArea(null); mutateAreas() }} onCancel={() => setEditingArea(null)} /></Modal>}
      {editingHabit && <Modal title="Edit habit" onClose={() => setEditingHabit(null)}><HabitForm initial={editingHabit} onSave={() => { setEditingHabit(null); mutateAll() }} onCancel={() => setEditingHabit(null)} /></Modal>}
      {addingHabitToArea != null && <Modal title="Add habit" onClose={() => setAddingHabitToArea(null)}><HabitForm defaultLifeAreaId={addingHabitToArea} onSave={() => { setAddingHabitToArea(null); mutateAll() }} onCancel={() => setAddingHabitToArea(null)} /></Modal>}
      {showPrompt && <PromptModal title="Life AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Visual verification**

Navigate to `http://localhost:3000/life`. Confirm:
- No tabs visible
- Area cards show goal count + habit count + progress %
- Expanding an area shows Goals subsection then Habits subsection
- "Mark done" works on habits within an area
- "+ Add habit" inside an area opens HabitForm with that area pre-selected
- Existing habits with no lifeAreaId appear in the "Unassigned habits" section
- Archived habits section appears at the bottom
- "Generate AI Prompt" opens a combined prompt modal

Also confirm `/goals` and `/habits` routes still work independently.

- [ ] **Step 4: Commit**

```bash
git add src/components/life/LifePage.tsx
git commit -m "feat: unified Life page with goals and habits per area"
```
