# Habit Fetch Consolidation & Got-It Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three issues: the `markGotIt` button not linking inventory to wishlist, and two cases where habit logs are fetched twice (raw `fetch` + SWR) when SWR alone suffices.

**Architecture:** Three independent single-file edits. No new files, no API changes. The SWR fixes replace `useEffect`+raw-fetch patterns with SWR-based sub-component callbacks so requests deduplicate via SWR's cache.

**Tech Stack:** Next.js 14, React 18, SWR, TypeScript, Tailwind CSS

---

## File Map

| Task | File |
|------|------|
| 1. markGotIt fix | `src/components/wishlist/WishlistPage.tsx` |
| 2. Dashboard done-count SWR | `src/components/dashboard/DashboardPage.tsx` |
| 3. Weekly review sort SWR | `src/components/weeklyreview/WeeklyReviewPage.tsx` |

---

## Task 1: Fix `markGotIt` to set upgradeTargetId

**File:** Modify `src/components/wishlist/WishlistPage.tsx`

The `markGotIt` function (around line 49) creates an inventory item without `upgradeTargetId`, so items moved via "Got it" still appear in the "Purchased — not yet in inventory" section indefinitely.

- [ ] **Step 1.1: Add upgradeTargetId to inventory POST**

Find the `markGotIt` function. The second `fetch` call POSTs to `/api/inventory`. Its body currently is:

```typescript
body: JSON.stringify({
  name: item.name, cost: item.cost, quantity: 1,
  purchaseDate: new Date().toISOString(), notes: item.notes,
  categoryId: item.categoryId,
})
```

Add `upgradeTargetId: item.id` to the body:

```typescript
body: JSON.stringify({
  name: item.name, cost: item.cost, quantity: 1,
  purchaseDate: new Date().toISOString(), notes: item.notes,
  categoryId: item.categoryId,
  upgradeTargetId: item.id,
})
```

- [ ] **Step 1.2: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 1.3: Commit**

```bash
git add src/components/wishlist/WishlistPage.tsx
git commit -m "fix: set upgradeTargetId in markGotIt so items leave purchased section"
```

---

## Task 2: Replace HabitsDoneCount raw-fetch with SWR

**File:** Modify `src/components/dashboard/DashboardPage.tsx`

`HabitsDoneCount` uses `useEffect` + raw `fetch()` while `HabitTodayRow` uses `useSWR` for the same URLs — 2N requests on load and a "0 / N done today" flash. Replace with a `HabitDoneCheck` sub-component that uses `useSWR` (same key → SWR deduplicates, no extra requests; cache hit → no flash on subsequent renders).

- [ ] **Step 2.1: Add useCallback to React import**

Find the import line at the top of `src/components/dashboard/DashboardPage.tsx`:

```typescript
import { useState, useEffect } from 'react'
```

Change to:

```typescript
import { useState, useEffect, useCallback } from 'react'
```

- [ ] **Step 2.2: Replace the HabitsDoneCount component**

Find and replace the entire `HabitsDoneCount` component (lines ~52–73, from `function HabitsDoneCount` through its closing `}`):

**Remove** the old component:
```tsx
function HabitsDoneCount({ habits }: { habits: Habit[] }) {
  const [doneCount, setDoneCount] = useState(0)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (habits.length === 0) return
    Promise.allSettled(
      habits.map(h =>
        fetch(`/api/habits/${h.id}/logs`).then(r => r.json()).then((dates: string[]) => dates.includes(today))
      )
    ).then(results => {
      const count = results.filter(r => r.status === 'fulfilled' && r.value).length
      setDoneCount(count)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits.map(h => h.id).join(','), today])

  return (
    <p className="text-xs text-gray-400 mb-2">{doneCount} / {habits.length} done today</p>
  )
}
```

**Replace with** these two components:

```tsx
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
      <p className="text-xs text-gray-400 mb-2">{doneCount} / {habits.length} done today</p>
    </>
  )
}
```

- [ ] **Step 2.3: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 2.4: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "fix: replace HabitsDoneCount raw fetch with SWR to deduplicate requests"
```

---

## Task 3: Replace useHabitWeekLogs raw-fetch with SWR callback

**File:** Modify `src/components/weeklyreview/WeeklyReviewPage.tsx`

`useHabitWeekLogs` fires N raw `fetch()` calls for sort data while `HabitWeekRow` fires N SWR calls for rendering — 2N requests. Fix: delete `useHabitWeekLogs`, add `onCount` prop to `HabitWeekRow`, and derive sort from counts collected via `useState` + `useCallback`.

- [ ] **Step 3.1: Add useCallback to React import**

Find the import at the top of `src/components/weeklyreview/WeeklyReviewPage.tsx`:

```typescript
import { useState, useEffect } from 'react'
```

Change to:

```typescript
import { useState, useEffect, useCallback } from 'react'
```

- [ ] **Step 3.2: Delete useHabitWeekLogs**

Find and delete the entire `useHabitWeekLogs` function (lines ~85–106):

```typescript
function useHabitWeekLogs(habitIds: number[], weekDates: string[]): Record<number, number> {
  const [counts, setCounts] = useState<Record<number, number>>({})
  useEffect(() => {
    if (habitIds.length === 0) return
    Promise.allSettled(
      habitIds.map(id =>
        fetch(`/api/habits/${id}/logs`).then(r => r.json()).then((dates: string[]) => ({
          id,
          count: weekDates.filter(d => dates.includes(d)).length,
        }))
      )
    ).then(results => {
      const map: Record<number, number> = {}
      results.forEach(r => {
        if (r.status === 'fulfilled') map[r.value.id] = r.value.count
      })
      setCounts(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitIds.join(','), weekDates.join(',')])
  return counts
}
```

Delete it entirely.

- [ ] **Step 3.3: Update HabitWeekRow to accept and call onCount**

Find the `HabitWeekRow` function (currently around line 108 after deletion):

```typescript
function HabitWeekRow({ habit, weekDates }: { habit: Habit; weekDates: string[] }) {
  const { data: logs = [] } = useSWR<string[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const count = weekDates.filter(d => logs.includes(d)).length
  const pct = count / 7
  return (
```

Replace with:

```typescript
function HabitWeekRow({ habit, weekDates, onCount }: {
  habit: Habit; weekDates: string[]
  onCount?: (id: number, count: number) => void
}) {
  const { data: logs = [] } = useSWR<string[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const count = weekDates.filter(d => logs.includes(d)).length
  const pct = count / 7
  useEffect(() => { onCount?.(habit.id, count) }, [habit.id, count, onCount])
  return (
```

The rest of the function body (the JSX return) is unchanged.

- [ ] **Step 3.4: Replace habitWeekCounts / sortedHabits in WeeklyReviewPage**

Inside `WeeklyReviewPage`, find these two lines (around line 148–149):

```typescript
const habitWeekCounts = useHabitWeekLogs(habits.map(h => h.id), weekDates)
const sortedHabits = [...habits].sort((a, b) => (habitWeekCounts[a.id] ?? 0) - (habitWeekCounts[b.id] ?? 0))
```

Replace with:

```typescript
const [weekCounts, setWeekCounts] = useState<Record<number, number>>({})
const handleWeekCount = useCallback((id: number, count: number) => {
  setWeekCounts(prev => prev[id] === count ? prev : { ...prev, [id]: count })
}, [])
const sortedHabits = [...habits].sort((a, b) => (weekCounts[a.id] ?? 0) - (weekCounts[b.id] ?? 0))
```

- [ ] **Step 3.5: Pass handleWeekCount to HabitWeekRow in JSX**

Find the JSX that renders the Habits This Week section. It currently renders:

```tsx
{sortedHabits.map(h => <HabitWeekRow key={h.id} habit={h} weekDates={weekDates} />)}
```

Change to:

```tsx
{sortedHabits.map(h => <HabitWeekRow key={h.id} habit={h} weekDates={weekDates} onCount={handleWeekCount} />)}
```

- [ ] **Step 3.6: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3.7: Commit**

```bash
git add src/components/weeklyreview/WeeklyReviewPage.tsx
git commit -m "fix: replace useHabitWeekLogs raw fetch with SWR callback to deduplicate requests"
```

---

## Self-Review

**Spec coverage:**
- Fix 1 (markGotIt upgradeTargetId): Task 1 ✓
- Fix 2 (Dashboard HabitsDoneCount SWR): Task 2 ✓
- Fix 3 (Weekly Review useHabitWeekLogs SWR): Task 3 ✓

**Placeholder scan:** No TBDs, no vague steps — all code is complete.

**Type consistency:**
- `HabitDoneCheck` props: `habitId: number`, `today: string`, `onResult: (id: number, done: boolean) => void` — consistent with `HabitsDoneCount` usage.
- `HabitWeekRow` gains `onCount?: (id: number, count: number) => void` — matches `handleWeekCount` signature `(id: number, count: number)`.
- `weekCounts` is `Record<number, number>` — matches indexing in `sortedHabits` sort.
