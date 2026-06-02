# Shared Types, Maintenance Lib & Dashboard Loading States — Design Spec

## Overview

Three improvements: extract duplicated maintenance helpers into a shared lib, extract shared interfaces into a types barrel, and add loading states to the dashboard widgets.

---

## 1. `src/lib/maintenance.ts` (new)

Exports the minimal shared types and pure helper functions used across Dashboard, WeeklyReview, and MaintenancePage.

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

export function addMonths(dateStr: string, months: number): string

export function getTaskStatus(task: MaintenanceTask): { status: TaskStatus; nextDue: string | null }
```

`getTaskStatus` returns `{ status, nextDue }` — matching `MaintenancePage`'s existing signature (Dashboard and WeeklyReview only use `.status`, so they extract that field at the call site).

`MaintenancePage` keeps its own richer local types (`homeItemId`, `logs`, `notes`, `createdAt` on `HomeItem`). TypeScript structural typing lets those pass directly to `getTaskStatus` without any `extends`.

`getItemStatus` stays local to `MaintenancePage` — it's only used there.

---

## 2. `src/types/index.ts` (new)

Exports shared display interfaces used by Dashboard and WeeklyReview.

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

**Scope:** Only `DashboardPage` and `WeeklyReviewPage` are updated. `HabitsPage`, `GoalsPage`, `GiftsPage`, `SubscriptionsPage`, `NetWorthPage` keep their own local types — they have richer shapes needed for CRUD and aren't causing drift problems.

---

## 3. Consumer updates

### `src/components/dashboard/DashboardPage.tsx`

- Remove: all local interface/type definitions (`Habit`, `MaintenanceTask`, `HomeItem`, `TaskStatus`, `Milestone`, `Goal`, `LifeArea`, `GiftIdea`, `GiftPerson`) and helper functions (`addMonths`, `getTaskStatus`)
- Add imports: `import { TaskStatus, MaintenanceTask, HomeItem, addMonths, getTaskStatus } from '@/lib/maintenance'` and `import type { Habit, Milestone, Goal, LifeArea, GiftIdea, GiftPerson } from '@/types'`
- Update `alertItems` derivation: `getTaskStatus(t).status` (was `getTaskStatus(t)` when it returned `TaskStatus` directly)
- Add `isLoading` to each SWR call; show `<p className="text-sm text-gray-400">Loading…</p>` in each widget while loading
- Fix `HabitsDoneCount`: show `— / N done today` until `doneMap` has a result for every habit (guard: `Object.keys(doneMap).length < habits.length`)

### `src/components/weeklyreview/WeeklyReviewPage.tsx`

- Remove: `Habit`, `MaintenanceTask2`, `HomeItem2`, `Milestone2`, `Goal2`, `LifeArea2`, `Subscription2`, `TaskStatus2`, `addMonthsWR`, `getTaskStatusWR`
- Add imports: `import { MaintenanceTask, HomeItem, addMonths, getTaskStatus } from '@/lib/maintenance'` and `import type { Habit, Goal, LifeArea, Subscription } from '@/types'`
- Rename: `HomeItem2` → `HomeItem`, `MaintenanceTask2` → `MaintenanceTask` throughout
- Update `maintenanceAlerts` derivation: `getTaskStatus(t).status`

### `src/components/maintenance/MaintenancePage.tsx`

- Remove local: `type TaskStatus`, `function addMonths`, `function getTaskStatus`
- Add import: `import { TaskStatus, addMonths, getTaskStatus } from '@/lib/maintenance'`
- Keep all local interfaces unchanged (`MaintenanceTask` with `homeItemId`, `HomeItem` with `logs`/`notes`/`createdAt`, `MaintenanceLog`)

---

## Out of Scope

- Sharing types with HabitsPage, GoalsPage, GiftsPage, SubscriptionsPage, NetWorthPage
- A shared `getItemStatus` export
- Loading states on WeeklyReview or other pages
