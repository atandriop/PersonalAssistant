# Four Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four improvement groups: merge Trends into Net Worth, build a Home Dashboard, enhance Weekly Review with 4 new data sections, and apply 3 quick UI fixes.

**Architecture:** All work is purely frontend — no new API routes. Each task modifies or creates one or two `src/components/` files. Tasks are ordered so that files touched by multiple tasks (NetWorthPage, Sidebar) are completed in one pass each.

**Tech Stack:** Next.js 14 (App Router), React 18, SWR, Tailwind CSS, TypeScript

---

## File Map

| Task | Files Modified / Created |
|------|--------------------------|
| 1. Trends → Net Worth | `src/components/networth/NetWorthPage.tsx`, `src/components/Sidebar.tsx`, delete `src/app/trends/page.tsx`, delete `src/components/trends/TrendsPage.tsx` |
| 2. Subscriptions cost in Net Worth | `src/components/networth/NetWorthPage.tsx` |
| 3. Home Dashboard | `src/components/dashboard/DashboardPage.tsx` (new), `src/app/page.tsx`, `src/components/Sidebar.tsx` |
| 4. Weekly Review enhancements | `src/components/weeklyreview/WeeklyReviewPage.tsx` |
| 5. Wishlist → Inventory transfer | `src/components/wishlist/WishlistPage.tsx` |
| 6. Portfolio P&L formatting | `src/components/portfolio/PortfolioPage.tsx` |

---

## Task 1: Merge Trends charts into Net Worth page

**Spec:** `docs/superpowers/specs/2026-06-02-trends-merge-design.md`

**Files:**
- Modify: `src/components/networth/NetWorthPage.tsx`
- Modify: `src/components/Sidebar.tsx`
- Delete: `src/app/trends/page.tsx`
- Delete: `src/components/trends/TrendsPage.tsx`

### What changes in NetWorthPage.tsx

1. The existing `LineChart` has `color` hardcoded to `'#10b981'`. Update it to accept a `color` prop.
2. Add a `Snapshot` interface and a `useSWR` call for `/api/snapshots`.
3. Add a `useEffect` that POSTs to `/api/snapshots` once per session using `sessionStorage.getItem('lastSnapshot')` (exact same key TrendsPage was using — preserves existing snapshot history).
4. Derive `wishlistData` and `portfolioData` from the sorted snapshots.
5. Add two new chart cards below the existing "Net Worth Over Time" card.

- [ ] **Step 1.1: Update LineChart to accept color prop**

In `src/components/networth/NetWorthPage.tsx`, find the `LineChart` function (line ~49) and change its signature and internals:

```typescript
// BEFORE (around line 49):
function LineChart({ data }: { data: { x: number; y: number }[] }) {
  // ...
  const color = '#10b981'
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: SVG_H }}>
      <defs>
        <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">

// AFTER:
function LineChart({ data, color = '#10b981' }: { data: { x: number; y: number }[]; color?: string }) {
  // (remove the `const color = '#10b981'` line)
  const gradId = `nw-grad-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: SVG_H }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
```

Also update the two references to `"nw-grad"` inside the function body:
- `fill="url(#nw-grad)"` → `fill={`url(#${gradId})`}`

- [ ] **Step 1.2: Add Snapshot interface and useSWR + useEffect**

After the existing interfaces (around line 34), add:

```typescript
interface Snapshot {
  id: number; date: string; wishlistTotal: number; portfolioTotal: number
}
```

In the `NetWorthPage` component body (after the existing `useSWR` calls, around line 159), add:

```typescript
const { data: snapshots2 = [], mutate: mutateSnapshots2 } = useSWR<Snapshot[]>('/api/snapshots', fetcher)

useEffect(() => {
  const today = new Date().toDateString()
  if (sessionStorage.getItem('lastSnapshot') === today) return
  fetch('/api/snapshots', { method: 'POST' }).then(() => {
    sessionStorage.setItem('lastSnapshot', today)
    mutateSnapshots2()
  })
}, [mutateSnapshots2])
```

Note: the existing `useEffect` for net worth snapshots uses `'lastNetWorthSnapshot'` — different key, no conflict.

- [ ] **Step 1.3: Derive wishlist and portfolio chart data**

After the `sortedSnapshots` line (around line 180), add:

```typescript
const sortedSnapshots2 = [...snapshots2].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
const wishlistChartData = sortedSnapshots2.map(s => ({ x: new Date(s.date).getTime(), y: s.wishlistTotal }))
const portfolioChartData = sortedSnapshots2.map(s => ({ x: new Date(s.date).getTime(), y: s.portfolioTotal }))
```

- [ ] **Step 1.4: Add two chart sections in JSX**

After the existing "Net Worth Over Time" chart card (around line 219), add:

```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Wishlist Total Over Time</h2>
  <LineChart data={wishlistChartData} color="#3b82f6" />
</div>

<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Portfolio Value Over Time</h2>
  <LineChart data={portfolioChartData} color="#10b981" />
</div>
```

- [ ] **Step 1.5: Remove Trends from Sidebar**

In `src/components/Sidebar.tsx`, remove this line from the `NAV` array:

```typescript
{ href: '/trends', label: 'Trends', active: true },
```

- [ ] **Step 1.6: Delete Trends files**

```bash
rm src/app/trends/page.tsx
rm src/components/trends/TrendsPage.tsx
```

- [ ] **Step 1.7: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this task).

- [ ] **Step 1.8: Commit**

```bash
git add src/components/networth/NetWorthPage.tsx src/components/Sidebar.tsx
git rm src/app/trends/page.tsx src/components/trends/TrendsPage.tsx
git commit -m "feat: merge Trends charts into Net Worth page, remove Trends page"
```

---

## Task 2: Subscriptions annual cost in Net Worth liabilities

**Spec:** `docs/superpowers/specs/2026-06-02-quick-ui-improvements-design.md` (section 3)

**Files:**
- Modify: `src/components/networth/NetWorthPage.tsx`

### What changes

1. Add a `Subscription` interface.
2. Add `useSWR` for `/api/subscriptions`.
3. Compute `subscriptionAnnualTotal` from active subscriptions.
4. Include it in `totalLiabilities` and `netWorth`.
5. Add a read-only row in the Liabilities card.

- [ ] **Step 2.1: Add Subscription interface**

After the `Snapshot` interface added in Task 1, add:

```typescript
interface Subscription {
  id: number; name: string; cost: number; period: string; active: boolean
}
```

- [ ] **Step 2.2: Add useSWR for subscriptions**

After the `mutateSnapshots2` useSWR line, add:

```typescript
const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
```

- [ ] **Step 2.3: Compute annual total**

After the `portfolioChartData` line, add:

```typescript
const subscriptionAnnualTotal = subscriptions
  .filter(s => s.active)
  .reduce((sum, s) => sum + (s.period === 'yearly' ? s.cost : s.cost * 12), 0)
```

- [ ] **Step 2.4: Include in totalLiabilities**

Find the existing line:
```typescript
const totalLiabilities = liabilityEntries.reduce((s, e) => s + e.value, 0)
```

Replace with:
```typescript
const totalLiabilities = liabilityEntries.reduce((s, e) => s + e.value, 0) + subscriptionAnnualTotal
```

- [ ] **Step 2.5: Add Subscriptions row in Liabilities card JSX**

Find the liabilities section — the closing part before the empty-state paragraph:
```tsx
{liabilityEntries.length === 0 && (
  <p className="text-sm text-gray-400">No liabilities yet.</p>
)}
```

Add the subscriptions row above the empty-state check:

```tsx
{subscriptionAnnualTotal > 0 && (
  <div className="mb-3">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Subscriptions</p>
    <div className="flex justify-between items-center py-1">
      <div>
        <span className="text-sm text-gray-700 dark:text-gray-300">Subscriptions (annual)</span>
        <p className="text-xs text-gray-400 italic">estimated annual cost</p>
      </div>
      <span className="text-sm text-gray-900 dark:text-white mr-3">{fmt(subscriptionAnnualTotal)}</span>
    </div>
  </div>
)}
```

- [ ] **Step 2.6: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 2.7: Commit**

```bash
git add src/components/networth/NetWorthPage.tsx
git commit -m "feat: add subscriptions annual cost to net worth liabilities"
```

---

## Task 3: Home Dashboard

**Spec:** `docs/superpowers/specs/2026-06-02-home-dashboard-design.md`

**Files:**
- Create: `src/components/dashboard/DashboardPage.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/Sidebar.tsx`

### Component structure

`DashboardPage.tsx` has:
- `HabitTodayRow` sub-component — fetches its own logs via `useSWR` (same pattern as `HabitRow` in HabitsPage)
- Helper functions `addMonths`, `getTaskStatus` copied from `MaintenancePage.tsx`
- Main `DashboardPage` component with 4 widgets in a 2×2 grid

- [ ] **Step 3.1: Create DashboardPage.tsx**

Create `src/components/dashboard/DashboardPage.tsx` with the following content:

```tsx
'use client'

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

  // ── Habits widget ──
  const today = new Date().toISOString().slice(0, 10)
  // Done count is computed inside HabitTodayRow per habit via SWR — shown as subtitle below

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
              {alertItems.map(({ item, task, status }, i) => (
                <div key={i} className="flex items-start justify-between gap-2 py-0.5">
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
```

- [ ] **Step 3.2: Update src/app/page.tsx**

Replace the entire file content:

```tsx
import DashboardPage from '@/components/dashboard/DashboardPage'

export default function Home() {
  return <DashboardPage />
}
```

- [ ] **Step 3.3: Add Dashboard to Sidebar**

In `src/components/Sidebar.tsx`, add `{ href: '/', label: 'Dashboard', active: true }` as the **first** entry in the `NAV` array:

```typescript
const NAV = [
  { href: '/', label: 'Dashboard', active: true },
  { href: '/wishlist', label: 'Wishlist', active: true },
  // ... rest unchanged
]
```

- [ ] **Step 3.4: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 3.5: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx src/app/page.tsx src/components/Sidebar.tsx
git commit -m "feat: add home dashboard with habits, maintenance, goals, and gifts widgets"
```

---

## Task 4: Weekly Review enhancements

**Spec:** `docs/superpowers/specs/2026-06-02-weekly-review-enhancement-design.md`

**Files:**
- Modify: `src/components/weeklyreview/WeeklyReviewPage.tsx`

### What changes

Add 4 new `WeekSection` blocks at the bottom of the left column (after Portfolio):
1. Habits This Week — per-habit log fetching via `Promise.allSettled`
2. Goal Progress — milestone-only progress bars
3. Maintenance Alerts — same `getTaskStatus`/`addMonths` helpers
4. Subscriptions Renewing Soon — renewalDate within 30 days

- [ ] **Step 4.1: Add new interfaces at the top of WeeklyReviewPage.tsx**

After the existing interfaces (after line 23 — after `WeeklyData`), add:

```typescript
interface Habit { id: number; name: string; color: string }
interface MaintenanceTask2 {
  id: number; description: string; intervalMonths: number | null
  dueDate: string | null; lastDoneDate: string | null; createdAt: string
}
interface HomeItem2 { id: number; name: string; tasks: MaintenanceTask2[] }
interface Milestone2 { id: number; completedAt: string | null }
interface Goal2 { id: number; title: string; milestones: Milestone2[] }
interface LifeArea2 { id: number; name: string; goals: Goal2[] }
interface Subscription2 { id: number; name: string; cost: number; period: string; renewalDate: string | null; active: boolean }
```

(Using suffix `2` to avoid collision with `WeeklyData` interface names which already define some similar shapes.)

- [ ] **Step 4.2: Add helper functions for maintenance and habits**

After the `getWeekKey` function, add:

```typescript
function addMonthsWR(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  if (d.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}

type TaskStatus2 = 'overdue' | 'due-soon' | 'ok' | 'none'

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
```

- [ ] **Step 4.3: Add new useSWR calls and derived data inside WeeklyReviewPage**

After the existing `const { data } = useSWR<WeeklyData>(...)` line, add:

```typescript
const { data: habits = [] } = useSWR<Habit[]>('/api/habits', fetcher)
const { data: maintenanceItems = [] } = useSWR<HomeItem2[]>('/api/maintenance/items', fetcher)
const { data: lifeAreas = [] } = useSWR<LifeArea2[]>('/api/life-areas', fetcher)
const { data: subscriptions = [] } = useSWR<Subscription2[]>('/api/subscriptions', fetcher)

// Habit logs — fetch all via SWR (one key per habit)
// Use a sub-component pattern to handle individual habit log fetching
```

Note: for habit logs, use a sub-component (see Step 4.4) rather than Promise.allSettled to avoid hook count issues.

- [ ] **Step 4.4: Add HabitWeekRow sub-component**

Before the `WeekSection` function, add:

```typescript
function HabitWeekRow({ habit, weekDates }: { habit: Habit; weekDates: string[] }) {
  const { data: logs = [] } = useSWR<string[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const count = weekDates.filter(d => logs.includes(d)).length
  const pct = count / 7
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
```

- [ ] **Step 4.5: Add derived data for new sections inside WeeklyReviewPage**

After the `useSWR` calls added in Step 4.3, add:

```typescript
const weekDates = getWeekDates()

const maintenanceAlerts = maintenanceItems.flatMap(item =>
  item.tasks
    .map(t => ({ item, task: t, status: getTaskStatusWR(t) }))
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

const today30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const todayStr = new Date().toISOString().slice(0, 10)
const renewingSoon = subscriptions
  .filter(s => s.active && s.renewalDate != null && s.renewalDate >= todayStr && s.renewalDate <= today30)
  .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))

// Sort habits by completion ascending
const habitsWithCount = habits.map(h => h) // ordering handled in HabitWeekRow
```

- [ ] **Step 4.6: Add the 4 new WeekSection blocks in JSX**

In the JSX, find the end of the left column (after the Portfolio WeekSection closing tag, before the `</div>` that closes the left column):

```tsx
          {/* existing Portfolio WeekSection here */}

          <WeekSection title="Habits This Week">
            {habits.length === 0 ? (
              <p className="text-sm text-gray-400">No habits tracked.</p>
            ) : (
              <div>
                {habits.map(h => <HabitWeekRow key={h.id} habit={h} weekDates={weekDates} />)}
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
                {maintenanceAlerts.map(({ item, task, status }, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 py-0.5">
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
```

- [ ] **Step 4.7: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 4.8: Commit**

```bash
git add src/components/weeklyreview/WeeklyReviewPage.tsx
git commit -m "feat: add habits, goals, maintenance, and subscriptions sections to weekly review"
```

---

## Task 5: Wishlist → Inventory quick transfer

**Spec:** `docs/superpowers/specs/2026-06-02-quick-ui-improvements-design.md` (section 1)

**Files:**
- Modify: `src/components/wishlist/WishlistPage.tsx`

### What changes

Show a "Purchased" section at the bottom of WishlistPage listing purchased items that have no inventory entry (`inventoryUpgrades.length === 0`). Each row has a "→ Inventory" button that opens a Modal with InventoryForm pre-filled.

Note: `InventoryForm`'s `initial` prop has no `id` → form will POST (create), not PUT. Passing `upgradeTargetId: item.id` pre-selects the wishlist item as the upgrade target.

- [ ] **Step 5.1: Import InventoryForm**

At the top of `src/components/wishlist/WishlistPage.tsx`, add:

```typescript
import InventoryForm from '@/components/inventory/InventoryForm'
```

- [ ] **Step 5.2: Add state for the to-inventory modal**

Inside `WishlistPage`, after the existing `useState` declarations, add:

```typescript
const [toInventory, setToInventory] = useState<WishlistItem | null>(null)
```

- [ ] **Step 5.3: Compute purchasedNeedingInventory**

After the `grouped` computation, add:

```typescript
const purchasedNeedingInventory = items.filter(i => i.purchased && i.inventoryUpgrades.length === 0)
```

- [ ] **Step 5.4: Add the "Purchased – not yet in Inventory" section in JSX**

Find the empty-state paragraph:
```tsx
{filtered.length === 0 && (
  <p className="text-sm text-gray-400 text-center py-12">No wishlist items yet. Add one to get started.</p>
)}
```

Add the purchased section after it (but before the Modal blocks):

```tsx
{purchasedNeedingInventory.length > 0 && (
  <div className="mt-8">
    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
      Purchased — not yet in inventory ({purchasedNeedingInventory.length})
    </h2>
    <div className="flex flex-col gap-2">
      {purchasedNeedingInventory.map(item => (
        <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-gray-900 dark:text-white truncate block">{item.name}</span>
            {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
          </div>
          <span className="font-semibold text-gray-900 dark:text-white shrink-0">€{item.cost.toFixed(2)}</span>
          <button
            onClick={() => setToInventory(item)}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 shrink-0"
          >
            → Inventory
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5.5: Add the → Inventory modal**

After the existing modals (after the `showPrompt` Modal), add:

```tsx
{toInventory && (
  <Modal title={`Add "${toInventory.name}" to Inventory`} onClose={() => setToInventory(null)}>
    <InventoryForm
      initial={{
        name: toInventory.name,
        cost: toInventory.cost,
        quantity: 1,
        categoryId: toInventory.categoryId,
        upgradeTargetId: toInventory.id,
      }}
      onSave={() => { setToInventory(null); mutate() }}
      onCancel={() => setToInventory(null)}
    />
  </Modal>
)}
```

- [ ] **Step 5.6: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 5.7: Commit**

```bash
git add src/components/wishlist/WishlistPage.tsx
git commit -m "feat: add → Inventory quick transfer for purchased wishlist items"
```

---

## Task 6: Portfolio P&L formatting

**Spec:** `docs/superpowers/specs/2026-06-02-quick-ui-improvements-design.md` (section 2)

**Files:**
- Modify: `src/components/portfolio/PortfolioPage.tsx`

### What changes

The existing code already shows P&L for non-savings holdings, but doesn't handle the `—` case (when `quantity`, `currentPrice`, or `buyPrice` is null) and uses a slightly different format. Replace the inline P&L display with a helper that returns the correctly formatted string and CSS class.

- [ ] **Step 6.1: Add fmtPnl helper function**

After the `holdingPnl` function (around line 29), add:

```typescript
function pnlDisplay(h: Holding): { text: string; cls: string } {
  if (h.quantity == null || h.currentPrice == null || h.buyPrice == null) {
    return { text: '—', cls: 'text-gray-400' }
  }
  const pnl = (h.currentPrice - h.buyPrice) * h.quantity
  if (pnl === 0) return { text: '€0', cls: 'text-gray-400' }
  if (pnl > 0) return { text: `+€${pnl.toFixed(2)}`, cls: 'text-green-600 dark:text-green-400' }
  return { text: `−€${Math.abs(pnl).toFixed(2)}`, cls: 'text-red-500' }
}
```

(`−` is the Unicode minus sign `−`, distinct from ASCII hyphen `-`.)

- [ ] **Step 6.2: Replace existing P&L display in the card**

Find the existing inline P&L block (around line 184):

```tsx
{!isSavings && (
  <div className={`text-xs font-medium ${p >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
    {p >= 0 ? '+' : ''}€{p.toFixed(2)}
  </div>
)}
```

Replace with:

```tsx
{(() => {
  const { text, cls } = pnlDisplay(h)
  return <div className={`text-xs font-medium ${cls}`}>{text}</div>
})()}
```

This unconditionally shows the P&L cell for every holding — savings and balance-type get `—`, holdings with all three fields get the formatted value.

- [ ] **Step 6.3: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 6.4: Commit**

```bash
git add src/components/portfolio/PortfolioPage.tsx
git commit -m "feat: improve portfolio P&L display with dash for incomplete holdings"
```

---

## Self-review against specs

### Spec coverage check

| Spec requirement | Task | Status |
|-----------------|------|--------|
| Wishlist Total Over Time chart in Net Worth | Task 1 | ✓ Step 1.4 |
| Portfolio Value Over Time chart in Net Worth | Task 1 | ✓ Step 1.4 |
| Session-based snapshot POST (same key) | Task 1 | ✓ Step 1.2 |
| Delete Trends page and component | Task 1 | ✓ Step 1.6 |
| Remove Trends from sidebar | Task 1 | ✓ Step 1.5 |
| Subscriptions annual cost row | Task 2 | ✓ Steps 2.1–2.5 |
| Included in totalLiabilities / netWorth | Task 2 | ✓ Step 2.4 |
| 2×2 dashboard with 4 widgets | Task 3 | ✓ Step 3.1 |
| Habits toggle in dashboard | Task 3 | ✓ HabitTodayRow |
| Maintenance alerts with border color | Task 3 | ✓ Step 3.1 |
| Goals (up to 4, lowest %) | Task 3 | ✓ Step 3.1 |
| Gifts with budget bar | Task 3 | ✓ Step 3.1 |
| Dashboard added first in sidebar | Task 3 | ✓ Step 3.3 |
| page.tsx → DashboardPage | Task 3 | ✓ Step 3.2 |
| Habits This Week section | Task 4 | ✓ Step 4.6 |
| Goal Progress section (milestones only) | Task 4 | ✓ Step 4.6 |
| Maintenance Alerts section | Task 4 | ✓ Step 4.6 |
| Subscriptions Renewing Soon (hide if empty) | Task 4 | ✓ Step 4.6 |
| → Inventory button on purchased items | Task 5 | ✓ Step 5.4 |
| Pre-filled InventoryForm | Task 5 | ✓ Step 5.5 |
| Hide if already in inventory (inventoryUpgrades check) | Task 5 | ✓ Step 5.3 |
| Portfolio P&L — dash for null fields | Task 6 | ✓ Step 6.2 |
| Portfolio P&L — +€X / −€X / €0 formatting | Task 6 | ✓ Steps 6.1–6.2 |

All spec requirements are covered.
