# Shared Types, Maintenance Lib & Dashboard Loading States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicated interfaces and maintenance helpers across 3 components by extracting them into shared modules, then add loading states to the dashboard widgets.

**Architecture:** Create `src/lib/maintenance.ts` (helpers + minimal types) and `src/types/index.ts` (shared display interfaces). Update Dashboard, WeeklyReview, and MaintenancePage to import from these. Tasks 1–2 create the modules; Tasks 3–5 update consumers. Must be done in order: 1 and 2 first, then 3–5 independently.

**Tech Stack:** Next.js 14, React 18, TypeScript, SWR, Tailwind CSS

---

## File Map

| Task | Files |
|------|-------|
| 1. Create maintenance lib | Create `src/lib/maintenance.ts` |
| 2. Create shared types | Create `src/types/index.ts` |
| 3. Update MaintenancePage | Modify `src/components/maintenance/MaintenancePage.tsx` |
| 4. Update DashboardPage | Modify `src/components/dashboard/DashboardPage.tsx` |
| 5. Update WeeklyReviewPage | Modify `src/components/weeklyreview/WeeklyReviewPage.tsx` |

---

## Task 1: Create src/lib/maintenance.ts

**Files:** Create `src/lib/maintenance.ts`

- [ ] **Step 1.1: Create the file**

Create `src/lib/maintenance.ts` with this exact content:

```typescript
export type TaskStatus = 'overdue' | 'due-soon' | 'ok' | 'none'

export interface MaintenanceTask {
  id: number
  description: string
  intervalMonths: number | null
  dueDate: string | null
  lastDoneDate: string | null
  createdAt: string
}

export interface HomeItem {
  id: number
  name: string
  tasks: MaintenanceTask[]
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  if (d.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}

export function getTaskStatus(task: MaintenanceTask): { status: TaskStatus; nextDue: string | null } {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  let nextDue: string | null = null
  if (task.intervalMonths != null) {
    const base = task.lastDoneDate ?? task.createdAt.slice(0, 10)
    nextDue = addMonths(base, task.intervalMonths)
  } else if (task.dueDate != null) {
    if (task.lastDoneDate && task.lastDoneDate >= task.dueDate) {
      return { status: 'none', nextDue: null }
    }
    nextDue = task.dueDate
  }
  if (!nextDue) return { status: 'none', nextDue: null }
  if (nextDue < today) return { status: 'overdue', nextDue }
  if (nextDue <= in30) return { status: 'due-soon', nextDue }
  return { status: 'ok', nextDue }
}
```

Note: `getTaskStatus` returns `{ status, nextDue }` — matching `MaintenancePage`'s existing signature, which is richer than Dashboard/WeeklyReview's simple `TaskStatus` return. Consumers that only need the status will extract `.status` at the call site.

- [ ] **Step 1.2: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 1.3: Commit**

```bash
git add src/lib/maintenance.ts
git commit -m "feat: extract maintenance helpers and types into shared lib"
```

---

## Task 2: Create src/types/index.ts

**Files:** Create `src/types/index.ts`

- [ ] **Step 2.1: Create the file**

Create `src/types/index.ts` with this exact content:

```typescript
export interface Habit { id: number; name: string; color: string }
export interface Milestone { id: number; completedAt: string | null }
export interface Goal { id: number; title: string; milestones: Milestone[] }
export interface LifeArea { id: number; name: string; goals: Goal[] }
export interface GiftIdea { id: number; estimatedCost: number | null; purchased: boolean }
export interface GiftPerson { id: number; name: string; budget: number | null; ideas: GiftIdea[] }
export interface Subscription {
  id: number; name: string; cost: number; period: string
  active: boolean; renewalDate?: string | null
}
```

- [ ] **Step 2.2: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 2.3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared display type definitions"
```

---

## Task 3: Update MaintenancePage to import from lib

**Files:** Modify `src/components/maintenance/MaintenancePage.tsx`

Remove the three local definitions and import from `@/lib/maintenance` instead. The local `MaintenanceTask` (with `homeItemId`) and `HomeItem` (with `logs`, `notes`, `createdAt`) stay — they're richer than the lib types and are needed for CRUD. TypeScript structural typing means they're assignable to the lib's types, so `getTaskStatus` will accept them.

- [ ] **Step 3.1: Add import**

Add this import after the existing imports at the top of the file (after `import Modal from '@/components/ui/Modal'`):

```typescript
import { TaskStatus, addMonths, getTaskStatus } from '@/lib/maintenance'
```

- [ ] **Step 3.2: Remove local TaskStatus**

Find and delete this line:
```typescript
type TaskStatus = 'overdue' | 'due-soon' | 'ok' | 'none'
```

- [ ] **Step 3.3: Remove local addMonths**

Find and delete the entire local `addMonths` function:
```typescript
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  // If day overflowed into next month, go back to last day of intended month
  if (d.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setUTCDate(0)
  }
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 3.4: Remove local getTaskStatus**

Find and delete the entire local `getTaskStatus` function:
```typescript
function getTaskStatus(task: MaintenanceTask): { status: TaskStatus; nextDue: string | null } {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let nextDue: string | null = null
  if (task.intervalMonths != null) {
    const base = task.lastDoneDate ?? task.createdAt.slice(0, 10)
    nextDue = addMonths(base, task.intervalMonths)
  } else if (task.dueDate != null) {
    if (task.lastDoneDate && task.lastDoneDate >= task.dueDate) {
      return { status: 'none', nextDue: null }
    }
    nextDue = task.dueDate
  }

  if (!nextDue) return { status: 'none', nextDue: null }
  if (nextDue < today) return { status: 'overdue', nextDue }
  if (nextDue <= in30) return { status: 'due-soon', nextDue }
  return { status: 'ok', nextDue }
}
```

- [ ] **Step 3.5: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output. The local `MaintenanceTask` (with `homeItemId`) passes to the lib's `getTaskStatus` (which expects the minimal shape) because TypeScript uses structural typing — extra fields are fine.

- [ ] **Step 3.6: Commit**

```bash
git add src/components/maintenance/MaintenancePage.tsx
git commit -m "refactor: import maintenance helpers from shared lib"
```

---

## Task 4: Update DashboardPage — shared types, loading states, done-count fix

**Files:** Modify `src/components/dashboard/DashboardPage.tsx`

Three changes in one task (all to the same file):
1. Replace local types and helpers with imports
2. Add `isLoading` to SWR calls and loading states to each widget
3. Fix `HabitsDoneCount` to show `—` while habits are still reporting

- [ ] **Step 4.1: Replace imports at the top of the file**

The file currently starts with:
```typescript
'use client'

import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
```

Change to:
```typescript
'use client'

import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { TaskStatus, MaintenanceTask, HomeItem, addMonths, getTaskStatus } from '@/lib/maintenance'
import type { Habit, Milestone, Goal, LifeArea, GiftIdea, GiftPerson } from '@/types'
```

- [ ] **Step 4.2: Remove all local type and helper definitions**

Delete the entire "Types" section and "Maintenance helpers" section — everything from `// ─── Types` through the closing `}` of `getTaskStatus`. That is, remove these lines:

```typescript
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
```

- [ ] **Step 4.3: Fix HabitsDoneCount to show dash while loading**

Find the paragraph inside `HabitsDoneCount`:
```tsx
<p className="text-xs text-gray-400 mb-2">{doneCount} / {habits.length} done today</p>
```

Replace with:
```tsx
<p className="text-xs text-gray-400 mb-2">
  {Object.keys(doneMap).length < habits.length ? '—' : doneCount} / {habits.length} done today
</p>
```

- [ ] **Step 4.4: Add isLoading to SWR calls in DashboardPage**

Find the four SWR calls inside `DashboardPage`:
```typescript
const { data: habits = [] } = useSWR<Habit[]>('/api/habits', fetcher)
const { data: maintenanceItems = [] } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
const { data: lifeAreas = [] } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
const { data: giftPeople = [] } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
```

Replace with:
```typescript
const { data: habits = [], isLoading: habitsLoading } = useSWR<Habit[]>('/api/habits', fetcher)
const { data: maintenanceItems = [], isLoading: maintenanceLoading } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
const { data: lifeAreas = [], isLoading: goalsLoading } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
const { data: giftPeople = [], isLoading: giftsLoading } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
```

- [ ] **Step 4.5: Update alertItems to extract .status**

The local `getTaskStatus` returned `TaskStatus` directly. The lib version returns `{ status, nextDue }`. Update the `alertItems` computation:

Find:
```typescript
const alertItems = maintenanceItems.flatMap(item =>
  item.tasks
    .map(t => ({ item, task: t, status: getTaskStatus(t) }))
    .filter(x => x.status === 'overdue' || x.status === 'due-soon')
)
```

Replace with:
```typescript
const alertItems = maintenanceItems.flatMap(item =>
  item.tasks
    .map(t => ({ item, task: t, status: getTaskStatus(t).status }))
    .filter(x => x.status === 'overdue' || x.status === 'due-soon')
)
```

- [ ] **Step 4.6: Add loading states to each widget in JSX**

Find the Habits Today widget:
```tsx
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
```

Replace with:
```tsx
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
```

Find the Maintenance widget:
```tsx
<WidgetCard title="Maintenance" borderStyle={maintenanceBorder}>
  {alertItems.length === 0 ? (
    <p className="text-sm text-green-600 dark:text-green-400">All up to date ✓</p>
  ) : (
```

Replace with:
```tsx
<WidgetCard title="Maintenance" borderStyle={maintenanceBorder}>
  {maintenanceLoading ? (
    <p className="text-sm text-gray-400">Loading…</p>
  ) : alertItems.length === 0 ? (
    <p className="text-sm text-green-600 dark:text-green-400">All up to date ✓</p>
  ) : (
```

Find the Goals widget:
```tsx
<WidgetCard title="Goals">
  {lowestGoals.length === 0 ? (
    <p className="text-sm text-gray-400">No goals set up yet.</p>
  ) : (
```

Replace with:
```tsx
<WidgetCard title="Goals">
  {goalsLoading ? (
    <p className="text-sm text-gray-400">Loading…</p>
  ) : lowestGoals.length === 0 ? (
    <p className="text-sm text-gray-400">No goals set up yet.</p>
  ) : (
```

Find the Gifts widget:
```tsx
<WidgetCard title="Gifts">
  {peopleWithIdeas.length === 0 ? (
    <p className="text-sm text-gray-400">No gift ideas yet.</p>
  ) : (
```

Replace with:
```tsx
<WidgetCard title="Gifts">
  {giftsLoading ? (
    <p className="text-sm text-gray-400">Loading…</p>
  ) : peopleWithIdeas.length === 0 ? (
    <p className="text-sm text-gray-400">No gift ideas yet.</p>
  ) : (
```

- [ ] **Step 4.7: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4.8: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "refactor: import shared types/helpers in dashboard, add widget loading states"
```

---

## Task 5: Update WeeklyReviewPage — remove *2 duplicates, import shared modules

**Files:** Modify `src/components/weeklyreview/WeeklyReviewPage.tsx`

- [ ] **Step 5.1: Add imports**

After the existing imports at the top (after `import PromptModal from '@/components/ui/PromptModal'`), add:

```typescript
import { MaintenanceTask, HomeItem, addMonths, getTaskStatus } from '@/lib/maintenance'
import type { Habit, Goal, LifeArea, Subscription } from '@/types'
```

- [ ] **Step 5.2: Remove duplicated local definitions**

Delete these 9 definitions (they're now covered by imports):

1. `interface Habit { id: number; name: string; color: string }` (line ~25)

2. The entire `MaintenanceTask2` interface:
```typescript
interface MaintenanceTask2 {
  id: number; description: string; intervalMonths: number | null
  dueDate: string | null; lastDoneDate: string | null; createdAt: string
}
```

3. `interface HomeItem2 { id: number; name: string; tasks: MaintenanceTask2[] }`

4. `interface Milestone2 { id: number; completedAt: string | null }`

5. `interface Goal2 { id: number; title: string; milestones: Milestone2[] }`

6. `interface LifeArea2 { id: number; name: string; goals: Goal2[] }`

7. The entire `Subscription2` interface:
```typescript
interface Subscription2 {
  id: number; name: string; cost: number; period: string
  renewalDate: string | null; active: boolean
}
```

8. `type TaskStatus2 = 'overdue' | 'due-soon' | 'ok' | 'none'`

9. The entire `addMonthsWR` function:
```typescript
function addMonthsWR(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  if (d.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}
```

10. `type TaskStatus2 = 'overdue' | 'due-soon' | 'ok' | 'none'` (already listed above as #8, confirm it's gone)

11. The entire `getTaskStatusWR` function:
```typescript
function getTaskStatusWR(task: MaintenanceTask2): TaskStatus2 {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  let nextDue: string | null = null
  if (task.intervalMonths != null) {
    const base = task.lastDoneDate ?? task.createdAt.slice(0, 10)
    nextDue = addMonthsWR(base, task.intervalMonths)
  } else if (task.dueDate != null) {
    if (task.lastDoneDate && task.lastDoneDate >= task.dueDate) return 'none'
    nextDue = task.dueDate
  }
  if (!nextDue) return 'none'
  if (nextDue < today) return 'overdue'
  if (nextDue <= in30) return 'due-soon'
  return 'ok'
}
```

- [ ] **Step 5.3: Fix SWR type annotations — rename *2 types to shared names**

Find:
```typescript
const { data: maintenanceItems = [] } = useSWR<HomeItem2[]>('/api/maintenance/items', fetcher)
const { data: lifeAreas = [] } = useSWR<LifeArea2[]>('/api/life-areas', fetcher)
const { data: subscriptions = [] } = useSWR<Subscription2[]>('/api/subscriptions', fetcher)
```

Replace with:
```typescript
const { data: maintenanceItems = [] } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
const { data: lifeAreas = [] } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
```

- [ ] **Step 5.4: Fix maintenanceAlerts to use shared getTaskStatus**

Find:
```typescript
const maintenanceAlerts = maintenanceItems.flatMap(item =>
  item.tasks
    .map(t => ({ item, task: t, status: getTaskStatusWR(t) }))
    .filter(x => x.status === 'overdue' || x.status === 'due-soon')
)
```

Replace with:
```typescript
const maintenanceAlerts = maintenanceItems.flatMap(item =>
  item.tasks
    .map(t => ({ item, task: t, status: getTaskStatus(t).status }))
    .filter(x => x.status === 'overdue' || x.status === 'due-soon')
)
```

- [ ] **Step 5.5: Fix goalsWithMilestones type annotation if present**

Search for `LifeArea2` or `Goal2` or `Milestone2` in the file. If any remain in type annotations or comments, rename them to `LifeArea`, `Goal`, `Milestone` respectively.

Also find the `useState` for `weekCounts` — it uses `Record<number, number>` which is fine. Check for any `HomeItem2` or `MaintenanceTask2` remaining in the file and rename to `HomeItem` / `MaintenanceTask`.

- [ ] **Step 5.6: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5.7: Commit**

```bash
git add src/components/weeklyreview/WeeklyReviewPage.tsx
git commit -m "refactor: import shared types/helpers in weekly review, remove *2 duplicates"
```

---

## Self-Review

**Spec coverage:**
- `src/lib/maintenance.ts` with `TaskStatus`, `MaintenanceTask`, `HomeItem`, `addMonths`, `getTaskStatus({ status, nextDue })`: Task 1 ✓
- `src/types/index.ts` with `Habit`, `Milestone`, `Goal`, `LifeArea`, `GiftIdea`, `GiftPerson`, `Subscription`: Task 2 ✓
- `MaintenancePage` imports helpers from lib, keeps richer local types: Task 3 ✓
- `DashboardPage` imports from both modules, removes local defs: Task 4 ✓
- `DashboardPage` `alertItems` uses `.status` extraction: Task 4 Step 4.5 ✓
- `DashboardPage` loading states on all 4 widgets: Task 4 Step 4.6 ✓
- `HabitsDoneCount` shows `—` until all habits reported: Task 4 Step 4.3 ✓
- `WeeklyReviewPage` removes all `*2` types and `addMonthsWR`/`getTaskStatusWR`: Task 5 ✓
- `WeeklyReviewPage` `maintenanceAlerts` uses `.status` extraction: Task 5 Step 5.4 ✓

**Type consistency:**
- `getTaskStatus` returns `{ status: TaskStatus; nextDue: string | null }` in Tasks 1, 3, 4, 5 — consistent ✓
- `HomeItem` (lib) is `{ id, name, tasks: MaintenanceTask[] }` used in Tasks 4, 5 — consistent ✓
- `Subscription` (shared type) has `renewalDate?: string | null` — compatible with WeeklyReview's previous `string | null` since optional makes it a superset ✓
