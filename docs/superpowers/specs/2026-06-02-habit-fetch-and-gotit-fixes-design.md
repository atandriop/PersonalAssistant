# Habit Fetch Consolidation & Got-It Fix — Design Spec

## Overview

Three targeted fixes to address issues surfaced during code review of the four-improvements branch.

---

## Fix 1: `markGotIt` sets `upgradeTargetId`

**File:** `src/components/wishlist/WishlistPage.tsx`

The `markGotIt` function creates an inventory item without setting `upgradeTargetId`, so items moved via "Got it" have no back-link to the wishlist item and will permanently appear in the "Purchased — not yet in inventory" section.

**Change:** Add `upgradeTargetId: item.id` to the inventory POST body in `markGotIt`:

```typescript
body: JSON.stringify({
  name: item.name, cost: item.cost, quantity: 1,
  purchaseDate: new Date().toISOString(), notes: item.notes,
  categoryId: item.categoryId,
  upgradeTargetId: item.id,   // ← add this
})
```

---

## Fix 2: Eliminate double-fetch in Dashboard `HabitsDoneCount`

**File:** `src/components/dashboard/DashboardPage.tsx`

`HabitsDoneCount` uses `useEffect` + raw `fetch()` while `HabitTodayRow` uses `useSWR` for the same `/api/habits/:id/logs` URLs. This fires 2N requests on load and causes a "0 / N done today" flash before the effect resolves.

**Change:** Replace with a `HabitDoneCheck` sub-component pattern. Each `HabitDoneCheck` calls `useSWR` with the same URL key as `HabitTodayRow` (SWR deduplicates — no extra network requests) and reports its done state to the parent via an `onResult` callback. `HabitsDoneCount` aggregates via `useState` and renders the count.

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
      {habits.map(h => <HabitDoneCheck key={h.id} habitId={h.id} today={today} onResult={handleResult} />)}
      <p className="text-xs text-gray-400 mb-2">{doneCount} / {habits.length} done today</p>
    </>
  )
}
```

Requires adding `useCallback` to the React import.

---

## Fix 3: Eliminate double-fetch in Weekly Review `useHabitWeekLogs`

**File:** `src/components/weeklyreview/WeeklyReviewPage.tsx`

`useHabitWeekLogs` fires N raw `fetch()` calls for sorting, while `HabitWeekRow` fires N SWR calls for rendering — 2N total requests for the same data.

**Change:** Delete `useHabitWeekLogs`. Instead, add an `onCount` callback prop to `HabitWeekRow`. The parent collects counts via `useState` + `useCallback`, derives `sortedHabits` from those counts, and removes the now-unused `habitWeekCounts` variable.

```tsx
// HabitWeekRow gains an optional onCount prop:
function HabitWeekRow({ habit, weekDates, onCount }: {
  habit: Habit; weekDates: string[]
  onCount?: (id: number, count: number) => void
}) {
  const { data: logs = [] } = useSWR<string[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const count = weekDates.filter(d => logs.includes(d)).length
  useEffect(() => { onCount?.(habit.id, count) }, [habit.id, count, weekDates, onCount])
  // ... existing render unchanged
}

// In WeeklyReviewPage, replace useHabitWeekLogs usage:
const [weekCounts, setWeekCounts] = useState<Record<number, number>>({})
const handleWeekCount = useCallback((id: number, count: number) => {
  setWeekCounts(prev => prev[id] === count ? prev : { ...prev, [id]: count })
}, [])
const sortedHabits = [...habits].sort((a, b) => (weekCounts[a.id] ?? 0) - (weekCounts[b.id] ?? 0))
```

Initial render order is API order; re-sorts once SWR data loads (same behaviour as before, but using only N requests instead of 2N).

Requires adding `useCallback` to the React import in `WeeklyReviewPage.tsx`.

## Out of Scope

- Batch habit-logs endpoint
- Persistent sort order for habits
