# Homebase Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified hybrid calendar page, a net worth dashboard widget with sparkline, and month-over-month intelligence to the Finance overview.

**Architecture:** Three UI additions to an existing Next.js 14 + Prisma + SQLite app. The calendar is a new read-only page that pulls from 6 existing API endpoints. The net worth widget adds to the existing dashboard widget system and requires extracting a shared `netWorthUtils.ts` helper. The finance enhancements add two new SWR fetches (appointments, maintenance) and delta/burn-rate calculations to the existing Finance overview component. No new API routes are needed anywhere.

**Tech Stack:** Next.js 14 App Router, React, SWR, Tailwind CSS, TypeScript, Lucide icons, Prisma/SQLite

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `src/app/calendar/page.tsx` | Create | Route wrapper |
| `src/components/calendar/CalendarPage.tsx` | Create | Grid + agenda + filter chips + SWR fetches |
| `src/lib/netWorthUtils.ts` | Create | Shared `holdingValue`, `snapshotNear`, `fmtEur` helpers |
| `src/components/Sidebar.tsx` | Modify | Add Calendar nav entry |
| `src/components/dashboard/DashboardPage.tsx` | Modify | Add `net-worth` widget |
| `src/components/networth/NetWorthPage.tsx` | Modify | Replace local `holdingValue` with import |
| `src/components/finance/FinancePage.tsx` | Modify | Replace local `holdingValue`, add snapshot/appointments/maintenance fetches, deltas, burn rate |

**Implementation order dependency:** Task 6 (extract `netWorthUtils.ts`) must complete before Tasks 7 and 8, which both import from it.

---

### Task 1: Sidebar Entry + Route Scaffold

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Create: `src/app/calendar/page.tsx`
- Create: `src/components/calendar/CalendarPage.tsx`

- [ ] **Step 1: Add CalendarDays to Sidebar imports and nav**

In `src/components/Sidebar.tsx`, add `CalendarDays` to the lucide import:

```typescript
import {
  LayoutDashboard, Sun, CalendarCheck, CalendarDays, CheckSquare, GitFork, FileText,
  TrendingUp, ShoppingBag, Heart, Wrench, Compass, Search, Target, Settings,
} from 'lucide-react'
```

Insert the Calendar entry between Today and Weekly Review in the `NAV` array:

```typescript
const NAV: NavItem[] = [
  { type: 'section', label: 'Planning' },
  { type: 'link', href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'link', href: '/today', label: 'Today', icon: Sun },
  { type: 'link', href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { type: 'link', href: '/weekly-review', label: 'Weekly Review', icon: CalendarCheck },
  // ... rest of NAV unchanged
```

- [ ] **Step 2: Create route wrapper**

Create `src/app/calendar/page.tsx`:

```typescript
import CalendarPage from '@/components/calendar/CalendarPage'

export default function Page() {
  return <CalendarPage />
}
```

- [ ] **Step 3: Create placeholder component**

Create `src/components/calendar/CalendarPage.tsx`:

```typescript
'use client'

export default function CalendarPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Calendar</h1>
      <p className="text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Start the dev server if not running: `npm run dev`. Open http://localhost:3000. Confirm "Calendar" appears in the Planning sidebar section between Today and Weekly Review. Click it — confirm the placeholder loads with no errors in the terminal or browser console.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/app/calendar/page.tsx src/components/calendar/CalendarPage.tsx
git commit -m "feat: add Calendar route and sidebar entry"
```

---

### Task 2: Calendar Grid (Static, No Events)

**Files:**
- Modify: `src/components/calendar/CalendarPage.tsx`

- [ ] **Step 1: Replace placeholder with the full grid layout**

Replace the entire contents of `src/components/calendar/CalendarPage.tsx`:

```typescript
'use client'

import { useState } from 'react'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildCalendarCells(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1)
  // Convert Sun=0 to Mon=0 offset
  let startDow = first.getDay() - 1
  if (startDow < 0) startDow = 6

  const prevMonthDays = new Date(year, month, 0).getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = startDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  const remaining = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })

  return cells
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function CalendarPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date>(today)

  function changeMonth(delta: number) {
    let m = currentMonth + delta
    let y = currentYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

  const cells = buildCalendarCells(currentYear, currentMonth)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Calendar</h1>

      <div className="flex gap-6 items-start">
        {/* Left: Grid */}
        <div className="w-80 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-lg leading-none"
            >‹</button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-lg leading-none"
            >›</button>
          </div>

          <div className="grid grid-cols-7 mb-0.5">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(({ date, isCurrentMonth }, i) => {
              const isToday = isSameDay(date, today)
              const isSelected = isSameDay(date, selectedDay)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(date)}
                  className={`
                    flex flex-col items-center pt-1 pb-1.5 rounded-md min-h-[44px] transition-colors
                    ${!isCurrentMonth ? 'opacity-25' : ''}
                    ${isSelected
                      ? 'bg-blue-600'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
                  `}
                >
                  <span className={`
                    text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full
                    ${isSelected ? 'text-white' : isToday
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'}
                  `}>
                    {date.getDate()}
                  </span>
                  {/* dots rendered in Task 4 */}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Agenda */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            {selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-600">No events</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000/calendar. Confirm:
- Grid renders with Mon–Sun column headers
- Today's date number has a blue-tinted background
- Clicking a different day turns that cell blue
- Prev/next arrows change the month label and rebuild the grid correctly (check February — it should have no padding on some years)

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/CalendarPage.tsx
git commit -m "feat: calendar grid with month navigation and day selection"
```

---

### Task 3: Event Types, API Fetches, and Normalization

**Files:**
- Modify: `src/components/calendar/CalendarPage.tsx`

- [ ] **Step 1: Add imports and type definitions at the top of the file**

Replace the `'use client'` + imports section at the top with:

```typescript
'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export type EventSourceType = 'task' | 'appointment' | 'trip' | 'subscription' | 'document' | 'maintenance'

export interface CalEvent {
  id: string
  type: EventSourceType
  date: Date
  endDate?: Date   // only for trips spanning multiple days
  title: string
  meta: string     // secondary line shown in agenda
}

export const SOURCE_COLOR: Record<EventSourceType, string> = {
  task:         '#3b82f6',
  appointment:  '#10b981',
  trip:         '#f59e0b',
  subscription: '#8b5cf6',
  document:     '#ef4444',
  maintenance:  '#6b7280',
}

export const SOURCE_LABEL: Record<EventSourceType, string> = {
  task:         'Task',
  appointment:  'Appointment',
  trip:         'Travel',
  subscription: 'Subscription',
  document:     'Document',
  maintenance:  'Maintenance',
}

// Raw shapes returned by each API endpoint
interface RawTask        { id: number; title: string; dueDate: string | null; priority: string; category: string | null }
interface RawAppointment { id: number; title: string; date: string; time: string | null; category: string; location: string | null; done: boolean }
interface RawTrip        { id: number; startDate: string | null; endDate: string | null; countryName: string; cities: string[] }
interface RawSubscription{ id: number; name: string; cost: number; period: string; renewalDate: string | null; active: boolean }
interface RawDocument    { id: number; name: string; expiryDate: string | null; category: string }
interface RawMaintItem   { id: number; name: string; tasks: { id: number; description: string; dueDate: string | null }[] }
```

- [ ] **Step 2: Add localStorage-backed filter state inside the component**

Inside `CalendarPage`, replace the existing `useState` block with:

```typescript
const today = new Date()
const [currentYear, setCurrentYear]   = useState(today.getFullYear())
const [currentMonth, setCurrentMonth] = useState(today.getMonth())
const [selectedDay, setSelectedDay]   = useState<Date>(today)

const LS_FILTER_KEY = 'calendar-hidden-sources'
const ALL_TYPES: EventSourceType[] = ['task', 'appointment', 'trip', 'subscription', 'document', 'maintenance']

const [activeTypes, setActiveTypes] = useState<Set<EventSourceType>>(() => {
  if (typeof window === 'undefined') return new Set(ALL_TYPES)
  try {
    const raw = localStorage.getItem(LS_FILTER_KEY)
    if (raw) {
      const hidden = JSON.parse(raw) as EventSourceType[]
      return new Set(ALL_TYPES.filter(t => !hidden.includes(t)))
    }
  } catch { /* ignore */ }
  return new Set(ALL_TYPES)
})

function toggleType(type: EventSourceType) {
  setActiveTypes(prev => {
    const next = new Set(prev)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    const hidden = ALL_TYPES.filter(t => !next.has(t))
    localStorage.setItem(LS_FILTER_KEY, JSON.stringify(hidden))
    return next
  })
}
```

- [ ] **Step 3: Add SWR fetches inside the component**

Add after the state/toggle block:

```typescript
const { data: rawTasks = [] }         = useSWR<RawTask[]>('/api/tasks?done=false', fetcher)
const { data: rawAppointments = [] }  = useSWR<RawAppointment[]>('/api/appointments', fetcher)
const { data: rawTrips = [] }         = useSWR<RawTrip[]>('/api/travel/trips', fetcher)
const { data: rawSubscriptions = [] } = useSWR<RawSubscription[]>('/api/subscriptions', fetcher)
const { data: rawDocuments = [] }     = useSWR<RawDocument[]>('/api/documents', fetcher)
const { data: rawMaint = [] }         = useSWR<RawMaintItem[]>('/api/maintenance/items', fetcher)
```

- [ ] **Step 4: Add event normalization with useMemo**

Add after the SWR hooks:

```typescript
const allEvents = useMemo<CalEvent[]>(() => {
  const events: CalEvent[] = []

  rawTasks.forEach(t => {
    if (!t.dueDate) return
    events.push({
      id: `task-${t.id}`, type: 'task',
      date: new Date(t.dueDate + 'T00:00:00'),
      title: t.title,
      meta: [t.priority + ' priority', t.category].filter(Boolean).join(' · '),
    })
  })

  rawAppointments.forEach(a => {
    if (a.done) return
    events.push({
      id: `appt-${a.id}`, type: 'appointment',
      date: new Date(a.date + 'T00:00:00'),
      title: a.title,
      meta: [a.time, a.category, a.location].filter(Boolean).join(' · '),
    })
  })

  rawTrips.forEach(t => {
    if (!t.startDate) return
    events.push({
      id: `trip-${t.id}`, type: 'trip',
      date: new Date(t.startDate + 'T00:00:00'),
      endDate: t.endDate ? new Date(t.endDate + 'T00:00:00') : undefined,
      title: t.countryName + (t.cities?.length ? ` — ${t.cities.join(', ')}` : ''),
      meta: t.endDate ? `${t.startDate} – ${t.endDate}` : t.startDate,
    })
  })

  rawSubscriptions.forEach(s => {
    if (!s.active || !s.renewalDate) return
    events.push({
      id: `sub-${s.id}`, type: 'subscription',
      date: new Date(s.renewalDate + 'T00:00:00'),
      title: s.name,
      meta: `€${s.cost} · ${s.period}`,
    })
  })

  rawDocuments.forEach(d => {
    if (!d.expiryDate) return
    events.push({
      id: `doc-${d.id}`, type: 'document',
      date: new Date(d.expiryDate + 'T00:00:00'),
      title: d.name,
      meta: d.category,
    })
  })

  rawMaint.forEach(item => {
    item.tasks.forEach(task => {
      if (!task.dueDate) return
      events.push({
        id: `maint-${task.id}`, type: 'maintenance',
        date: new Date(task.dueDate + 'T00:00:00'),
        title: task.description,
        meta: item.name,
      })
    })
  })

  return events
}, [rawTasks, rawAppointments, rawTrips, rawSubscriptions, rawDocuments, rawMaint])
```

- [ ] **Step 5: Verify no errors**

Open http://localhost:3000/calendar. No visual change yet. Open the browser DevTools Network tab — confirm all 6 API calls fire and return successfully. Check the terminal for TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/CalendarPage.tsx
git commit -m "feat: calendar event fetching and normalization for 6 sources"
```

---

### Task 4: Event Dots on Grid + Live Agenda Panel

**Files:**
- Modify: `src/components/calendar/CalendarPage.tsx`

- [ ] **Step 1: Add helper functions above the component**

Add these two functions after `isSameDay` (before `export default function CalendarPage`):

```typescript
function eventOnDay(event: CalEvent, date: Date): boolean {
  if (event.endDate) {
    // Trip spanning multiple days: show on every day in the range
    const d = date.getTime()
    return d >= event.date.getTime() && d <= event.endDate.getTime()
  }
  return isSameDay(event.date, date)
}

function eventsForDay(events: CalEvent[], date: Date, active: Set<EventSourceType>): CalEvent[] {
  return events.filter(e => active.has(e.type) && eventOnDay(e, date))
}
```

- [ ] **Step 2: Add dots to each day cell**

Inside the `cells.map(...)`, find the closing `</span>` of the day-number span and add immediately after it (still inside the `<button>`):

```tsx
{isCurrentMonth && (() => {
  const dots = eventsForDay(allEvents, date, activeTypes)
  if (dots.length === 0) return null
  return (
    <div className="flex flex-wrap gap-[2px] justify-center mt-0.5 px-0.5">
      {dots.slice(0, 5).map(e => (
        <div
          key={e.id}
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ background: isSelected ? 'rgba(255,255,255,0.8)' : SOURCE_COLOR[e.type] }}
        />
      ))}
    </div>
  )
})()}
```

- [ ] **Step 3: Replace the static agenda panel with live events**

Replace the entire `{/* Right: Agenda */}` div with:

```tsx
{/* Right: Agenda */}
<div className="flex-1 min-w-0">
  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
    {selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
  </h2>
  {(() => {
    const dayEvents = eventsForDay(allEvents, selectedDay, activeTypes)
    if (dayEvents.length === 0) {
      return <p className="text-sm text-gray-400 dark:text-gray-600">No events this day.</p>
    }
    return (
      <div className="space-y-2">
        {dayEvents.map(e => (
          <div
            key={e.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
            <div
              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
              style={{ background: SOURCE_COLOR[e.type] }}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {SOURCE_LABEL[e.type]} · {e.meta}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  })()}
</div>
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:3000/calendar. Confirm:
- Days with events show colored dots (one dot per event type color)
- Clicking a day with events populates the agenda panel on the right
- Selected day dots turn semi-transparent white against the blue background
- Clicking a day with no events shows "No events this day."
- Travel trips spanning multiple days show a dot on each day in the range

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/CalendarPage.tsx
git commit -m "feat: calendar event dots on grid and live agenda panel"
```

---

### Task 5: Filter Chips

**Files:**
- Modify: `src/components/calendar/CalendarPage.tsx`

- [ ] **Step 1: Add filter chips to the JSX**

In the return JSX, add this block immediately after the `<h1>` tag and before the `<div className="flex gap-6 items-start">`:

```tsx
{/* Source filter chips */}
<div className="flex flex-wrap gap-2 mb-4">
  {ALL_TYPES.map(type => {
    const active = activeTypes.has(type)
    const color = SOURCE_COLOR[type]
    return (
      <button
        key={type}
        onClick={() => toggleType(type)}
        className="px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all"
        style={{
          borderColor: color,
          background: active ? color + '22' : 'transparent',
          color: active ? color : '#9ca3af',
          opacity: active ? 1 : 0.55,
        }}
      >
        {SOURCE_LABEL[type]}
      </button>
    )
  })}
</div>
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000/calendar. Confirm:
- Six chips appear: Tasks, Appointment, Travel, Subscription, Document, Maintenance
- Clicking a chip fades it and removes that event type's dots from grid cells and entries from the agenda panel
- Clicking it again restores them
- Refresh the page — filter state is preserved from localStorage (chips remain in the same toggle state)

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/CalendarPage.tsx
git commit -m "feat: calendar source-type filter chips with localStorage persistence"
```

---

### Task 6: Extract netWorthUtils.ts

**Files:**
- Create: `src/lib/netWorthUtils.ts`
- Modify: `src/components/networth/NetWorthPage.tsx`
- Modify: `src/components/finance/FinancePage.tsx`

- [ ] **Step 1: Create the shared utility**

Create `src/lib/netWorthUtils.ts`:

```typescript
export interface PortfolioHolding {
  type: string
  quantity?: number | null
  currentPrice?: number | null
  balance?: number | null
}

export interface NetWorthSnapshot {
  id: number
  date: string   // 'YYYY-MM-DD'
  total: number
}

export function holdingValue(h: PortfolioHolding): number {
  if (h.type === 'savings') return h.balance ?? 0
  return (h.currentPrice ?? 0) * (h.quantity ?? 0)
}

/**
 * Returns the snapshot whose date is nearest to targetDate,
 * or null if the closest one is more than maxDaysDiff days away.
 */
export function snapshotNear(
  snapshots: NetWorthSnapshot[],
  targetDate: Date,
  maxDaysDiff = 15,
): NetWorthSnapshot | null {
  if (snapshots.length === 0) return null
  const target = targetDate.getTime()
  let best: NetWorthSnapshot | null = null
  let bestDiff = Infinity
  for (const s of snapshots) {
    const diff = Math.abs(new Date(s.date + 'T00:00:00').getTime() - target)
    if (diff < bestDiff) { bestDiff = diff; best = s }
  }
  return bestDiff <= maxDaysDiff * 86_400_000 ? best : null
}

export function fmtEur(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: decimals,
  }).format(n)
}
```

- [ ] **Step 2: Remove local holdingValue from NetWorthPage.tsx**

Open `src/components/networth/NetWorthPage.tsx`. Find the local `holdingValue` function (around line 45 — it checks `h.quantity != null && h.currentPrice != null`). Delete that function and add this import at the top of the file (with the other imports):

```typescript
import { holdingValue } from '@/lib/netWorthUtils'
```

Check the TypeScript output in the terminal — no errors expected since `PortfolioHolding` in `netWorthUtils` is a structural superset of the local `PortfolioHolding` shape.

- [ ] **Step 3: Remove local holdingValue from FinancePage.tsx**

Open `src/components/finance/FinancePage.tsx`. Find the local `holdingValue` function (around line 33 — same shape). Delete it and add the import:

```typescript
import { holdingValue } from '@/lib/netWorthUtils'
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:3000/finance and http://localhost:3000. Confirm both the Finance page and Dashboard still load with correct numbers. Check the terminal for TypeScript errors — there should be none.

- [ ] **Step 5: Commit**

```bash
git add src/lib/netWorthUtils.ts src/components/networth/NetWorthPage.tsx src/components/finance/FinancePage.tsx
git commit -m "refactor: extract holdingValue, snapshotNear, fmtEur to lib/netWorthUtils"
```

---

### Task 7: Net Worth Dashboard Widget

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Register the widget**

In `DashboardPage.tsx`, add `'net-worth'` to the `ALL_WIDGETS` tuple:

```typescript
const ALL_WIDGETS = [
  'habits', 'maintenance', 'goals', 'gifts',
  'appointments', 'overdue-tasks', 'on-this-day', 'subscriptions',
  'travel', 'memories', 'bucket-list', 'expiring-docs', 'net-worth',
] as const
```

Add to `WIDGET_LABELS`:

```typescript
'net-worth': 'Net Worth',
```

- [ ] **Step 2: Add imports**

Add to the existing import block at the top of `DashboardPage.tsx`:

```typescript
import { holdingValue, snapshotNear, fmtEur, type NetWorthSnapshot, type PortfolioHolding } from '@/lib/netWorthUtils'
import { TrendingUp } from 'lucide-react'
```

- [ ] **Step 3: Add conditional SWR fetches**

Inside the `DashboardPage` component, after the existing SWR hooks, add (the `null` key prevents fetching when the widget is hidden):

```typescript
const isNWVisible = !hidden.has('net-worth')
const { data: nwSnapshots = [] } = useSWR<NetWorthSnapshot[]>(
  isNWVisible ? '/api/net-worth/snapshots' : null, fetcher)
const { data: nwEntries = [] } = useSWR<{ value: number; type: string }[]>(
  isNWVisible ? '/api/net-worth/entries' : null, fetcher)
const { data: nwHoldings = [] } = useSWR<PortfolioHolding[]>(
  isNWVisible ? '/api/portfolio' : null, fetcher)
const { data: nwSubs = [] } = useSWR<{ cost: number; period: string; active: boolean }[]>(
  isNWVisible ? '/api/subscriptions' : null, fetcher)
const { data: nwWishlist = [] } = useSWR<{ cost: number; purchased: boolean }[]>(
  isNWVisible ? '/api/wishlist' : null, fetcher)
```

- [ ] **Step 4: Add net worth calculations**

After the SWR hooks, add:

```typescript
const nwPortfolioTotal = nwHoldings.reduce((s, h) => s + holdingValue(h), 0)
const nwEntryTotal     = nwEntries.reduce((s, e) => s + (e.type === 'asset' ? e.value : -e.value), 0)
const currentNetWorth  = nwPortfolioTotal + nwEntryTotal

const sortedSnaps = [...nwSnapshots].sort((a, b) => a.date.localeCompare(b.date))
const now = new Date()
const latestSnap = sortedSnaps[sortedSnaps.length - 1] ?? null
const snap30 = snapshotNear(sortedSnaps, new Date(now.getTime() - 30 * 86_400_000))
const snap90 = snapshotNear(sortedSnaps, new Date(now.getTime() - 90 * 86_400_000))
const nwDelta30 = latestSnap && snap30 ? latestSnap.total - snap30.total : null
const nwDelta90 = latestSnap && snap90 ? latestSnap.total - snap90.total : null

const nwMonthlySubs = nwSubs
  .filter(s => s.active)
  .reduce((s, sub) => s + (sub.period === 'yearly' ? sub.cost / 12 : sub.cost), 0)
const nwWishlistTotal = nwWishlist
  .filter(i => !i.purchased)
  .reduce((s, i) => s + i.cost, 0)

// Build SVG polyline path from last 6 snapshots
function buildSparkPath(snaps: NetWorthSnapshot[]): string {
  if (snaps.length < 2) return ''
  const vals = snaps.map(s => s.total)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 260, H = 40
  return snaps.map((s, i) => {
    const x = (i / (snaps.length - 1)) * W
    const y = H - ((s.total - min) / range) * (H - 4)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}
const sparkPath = buildSparkPath(sortedSnaps.slice(-6))
```

- [ ] **Step 5: Add the widget JSX**

In the return JSX, find where other widgets are rendered (look for `{!hidden.has('habits') && (`). Add the net worth widget in the same column grid alongside the others:

```tsx
{!hidden.has('net-worth') && (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
    <div className="flex items-center gap-1.5 mb-2">
      <TrendingUp size={13} strokeWidth={2.5} color="#10b981" />
      <span className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
        Net Worth
      </span>
    </div>

    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
      {fmtEur(currentNetWorth)}
    </p>

    {(nwDelta30 !== null || nwDelta90 !== null) && (
      <p className="text-xs mt-1 space-x-1">
        {nwDelta30 !== null && (
          <span className={nwDelta30 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
            {nwDelta30 >= 0 ? '▲' : '▼'} {fmtEur(Math.abs(nwDelta30))} this month
          </span>
        )}
        {nwDelta30 !== null && nwDelta90 !== null && (
          <span className="text-gray-400">·</span>
        )}
        {nwDelta90 !== null && (
          <span className={nwDelta90 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
            {nwDelta90 >= 0 ? '+' : ''}{fmtEur(nwDelta90)} vs 3 mo ago
          </span>
        )}
      </p>
    )}

    {sparkPath && (
      <div className="mt-3 mb-1">
        <svg width="100%" height="40" viewBox="0 0 260 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id="nw-spark-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={sparkPath + ' L260,40 L0,40 Z'} fill="url(#nw-spark-grad)" />
          <path d={sparkPath} stroke="#10b981" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    )}

    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
      Portfolio {fmtEur(nwPortfolioTotal)} · Subs {fmtEur(nwMonthlySubs)}/mo · Wishlist {fmtEur(nwWishlistTotal)} outstanding
    </p>
  </div>
)}
```

- [ ] **Step 6: Verify in browser**

Open http://localhost:3000. Confirm:
- Net Worth widget appears in the dashboard
- Shows your current net worth number
- Delta lines appear if you have ≥2 snapshots (visit Finance → Net Worth tab to generate one if none exist)
- Sparkline renders if ≥2 snapshots exist
- Widget can be hidden/shown via the dashboard "Customise" toggle like all other widgets

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: net worth dashboard widget with sparkline and month-over-month delta"
```

---

### Task 8: Finance Overview — Deltas and Burn Rate

**Files:**
- Modify: `src/components/finance/FinancePage.tsx`

- [ ] **Step 1: Add snapshot and new data fetches**

In `FinancePage.tsx`, add `snapshotNear` and `NetWorthSnapshot` to the existing netWorthUtils import line (already added in Task 6):

```typescript
import { holdingValue, snapshotNear, type NetWorthSnapshot } from '@/lib/netWorthUtils'
```

Inside the component, add three new SWR hooks after the existing ones:

```typescript
const { data: snapshots = [] }    = useSWR<NetWorthSnapshot[]>('/api/net-worth/snapshots', fetcher)
const { data: appointments = [] } = useSWR<{ cost: number | null; date: string }[]>(
  section === 'overview' ? '/api/appointments' : null, fetcher)
const { data: maintItems = [] }   = useSWR<{ logs: { cost: number | null; date: string }[] }[]>(
  section === 'overview' ? '/api/maintenance/items' : null, fetcher)
```

The `section === 'overview'` condition means these only fetch when the Overview tab is active.

- [ ] **Step 2: Add delta and burn rate calculations**

After the existing calculations block (after `monthlySubCost`, `byPriority`, etc.), add:

```typescript
// Net worth deltas
const sortedSnaps = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
const latestSnap  = sortedSnaps[sortedSnaps.length - 1] ?? null
const nowDate     = new Date()
const snap30fin   = snapshotNear(sortedSnaps, new Date(nowDate.getTime() - 30 * 86_400_000))
const snap90fin   = snapshotNear(sortedSnaps, new Date(nowDate.getTime() - 90 * 86_400_000))
const finDelta30  = latestSnap && snap30fin ? latestSnap.total - snap30fin.total : null
const finDelta90  = latestSnap && snap90fin ? latestSnap.total - snap90fin.total : null

// Portfolio % gain
const costBasis      = holdings
  .filter(h => h.quantity != null && h.buyPrice != null)
  .reduce((s, h) => s + (h.buyPrice! * h.quantity!), 0)
const portfolioPctGain = costBasis > 0
  ? ((portfolioTotal - costBasis) / costBasis) * 100
  : null

// Monthly burn rate (12-month trailing average)
const oneYearAgo = new Date(nowDate.getFullYear() - 1, nowDate.getMonth(), nowDate.getDate())
  .toISOString().slice(0, 10)
const todayStr = nowDate.toISOString().slice(0, 10)

const apptMonthly = appointments
  .filter(a => a.date >= oneYearAgo && a.date <= todayStr && a.cost != null)
  .reduce((s, a) => s + (a.cost ?? 0), 0) / 12

const maintMonthly = maintItems
  .flatMap(item => item.logs)
  .filter(l => l.date >= oneYearAgo && l.date <= todayStr && l.cost != null)
  .reduce((s, l) => s + (l.cost ?? 0), 0) / 12

const totalMonthlyBurn = monthlySubCost + apptMonthly + maintMonthly
```

- [ ] **Step 3: Add delta lines to the Net Worth stat card**

In the overview JSX, find the Net Worth stat card (the one rendering `fmt(netWorth)` in green). Add after the main value `<p>`:

```tsx
{finDelta30 !== null && (
  <p className={`text-xs mt-1 font-semibold ${finDelta30 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
    {finDelta30 >= 0 ? '▲' : '▼'} {fmt(Math.abs(finDelta30))} this month
  </p>
)}
{finDelta90 !== null && (
  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
    {finDelta90 >= 0 ? '+' : ''}{fmt(finDelta90)} vs 3 months ago
  </p>
)}
```

- [ ] **Step 4: Add % gain to the Portfolio stat card**

Find the Portfolio stat card (the one with P&L). Add after the existing P&L line:

```tsx
{portfolioPctGain !== null && (
  <p className={`text-xs mt-1 font-semibold ${portfolioPctGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
    {portfolioPctGain >= 0 ? '+' : ''}{portfolioPctGain.toFixed(1)}% since bought
  </p>
)}
```

- [ ] **Step 5: Add burn rate section**

In the overview JSX, find the closing `</div>` of the stat cards `<div className="grid grid-cols-3 gap-4 mb-6">`. Add the burn rate section immediately after it:

```tsx
{/* Monthly Burn Rate */}
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
    Monthly Burn Rate
  </p>
  <div className="divide-y divide-gray-100 dark:divide-gray-800">
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-gray-600 dark:text-gray-400">Subscriptions</span>
      <span className="font-medium text-gray-900 dark:text-white">{fmtDecimal(monthlySubCost)}/mo</span>
    </div>
    {apptMonthly > 0 && (
      <div className="flex justify-between py-1.5 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Appointments (12-mo avg)</span>
        <span className="font-medium text-gray-900 dark:text-white">{fmtDecimal(apptMonthly)}/mo</span>
      </div>
    )}
    {maintMonthly > 0 && (
      <div className="flex justify-between py-1.5 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Maintenance (12-mo avg)</span>
        <span className="font-medium text-gray-900 dark:text-white">{fmtDecimal(maintMonthly)}/mo</span>
      </div>
    )}
    <div className="flex justify-between py-1.5 text-sm font-semibold">
      <span className="text-gray-900 dark:text-white">Total estimated</span>
      <span className="text-gray-900 dark:text-white">{fmtDecimal(totalMonthlyBurn)}/mo</span>
    </div>
  </div>
</div>
```

Note: `fmtDecimal` is the existing 2-decimal formatter already in `FinancePage.tsx` — no new helper needed.

- [ ] **Step 6: Verify in browser**

Open http://localhost:3000/finance (Overview tab). Confirm:
- Net Worth card shows delta lines if snapshot history exists
- Portfolio card shows % gain if holdings have buy prices
- Burn Rate section appears below stat cards with Subscriptions always shown, Appointments/Maintenance only shown if there's 12-month cost history
- Switching to Net Worth / Subscriptions / Costs tabs still works correctly

- [ ] **Step 7: Commit**

```bash
git add src/components/finance/FinancePage.tsx
git commit -m "feat: finance overview deltas, portfolio % gain, and monthly burn rate"
```

---

## Done

All three features complete:
1. ✅ `/calendar` — hybrid grid + agenda, 6 event sources, filter chips with localStorage persistence, month navigation
2. ✅ Dashboard net worth widget — sparkline, month/quarter deltas, graceful degradation if no snapshot history
3. ✅ Finance overview intelligence — net worth deltas, portfolio % gain, monthly burn rate section
