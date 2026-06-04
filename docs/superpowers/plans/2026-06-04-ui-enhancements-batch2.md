# UI Enhancements Batch 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 9 UI improvements across 6 pages: fix a crash, add trend charts, restructure Experiences/BucketList/Items layouts, add auto-price refresh, renewals in Today, and more.

**Architecture:** All changes are purely frontend React components plus one new Next.js API route (`/api/portfolio/refresh-prices`). No database schema changes. Four independent sub-projects that can each be committed separately.

**Tech Stack:** Next.js 14 App Router, React, TypeScript (strict), Prisma/SQLite, SWR, Tailwind CSS. No test framework — verification uses `npx tsc --noEmit` plus manual browser checks.

**Spec:** `docs/superpowers/specs/2026-06-04-ui-enhancements-batch2-design.md`

---

## Files touched

| Task | File | Change |
|------|------|--------|
| 1 | `src/components/networth/NetWorthPage.tsx` | Fix infinite recursion in `formatCategory` |
| 2 | `src/components/life/LifePage.tsx` | All areas expanded by default |
| 3 | `src/components/subscriptions/SubscriptionsPage.tsx` | Category spend breakdown row |
| 4 | `src/components/portfolio/PortfolioPage.tsx` | P&L % in display + Refresh button |
| 5 | `src/components/travel/TravelPage.tsx` | Remove inner tabs, add stacked sections |
| 6 | `src/components/bucket-list/BucketListPage.tsx` | Remove inner tabs, add stacked sections |
| 7 | `src/components/experiences/ExperiencesPage.tsx` | Add Timeline tab |
| 7 | `src/components/timeline/TimelinePage.tsx` | Create new |
| 8 | `src/components/today/TodayPage.tsx` | Add renewals + gifts sections |
| 9 | `src/app/api/portfolio/refresh-prices/route.ts` | Create new |
| 10 | `src/components/portfolio/PortfolioPage.tsx` | Refresh button UI (same file as Task 4) |
| 11 | `src/components/items/ItemsPage.tsx` | Swap columns, collapsible cats, collectibles inline |

---

## SUB-PROJECT A — Quick wins

---

### Task 1: Fix `formatCategory` infinite recursion (NetWorthPage)

**Files:**
- Modify: `src/components/networth/NetWorthPage.tsx:56–58`

The function `formatCategory` calls itself for every category that isn't `'credit_card'` — infinite recursion. Fix it with a generic formatter.

- [ ] **Step 1: Replace the broken function**

In `src/components/networth/NetWorthPage.tsx`, find (lines 55–58):
```tsx
function formatCategory(cat: string): string {
  if (cat === 'credit_card') return 'Credit Card'
  return formatCategory(cat)
}
```
Replace with:
```tsx
function formatCategory(cat: string): string {
  if (cat === 'credit_card') return 'Credit Card'
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no new errors (only pre-existing `timeline/page.tsx` error if any remain).

- [ ] **Step 3: Manual check**

Navigate to Finance → Net Worth. Confirm the page loads without crashing. Verify the "Net Worth Over Time" chart is visible. Verify liability categories display correctly (e.g. `Credit Card`, `Mortgage`).

- [ ] **Step 4: Commit**

```bash
git add src/components/networth/NetWorthPage.tsx
git commit -m "fix: formatCategory infinite recursion in NetWorthPage"
```

---

### Task 2: Life boxes expanded by default (LifePage)

**Files:**
- Modify: `src/components/life/LifePage.tsx:50,149,154`

Change from tracking a single expanded area ID to tracking a set of collapsed area IDs. Default set is empty → all areas show as expanded.

- [ ] **Step 1: Replace the state declaration**

In `src/components/life/LifePage.tsx`, find line 50:
```tsx
const [expandedAreaId, setExpandedAreaId] = useState<number | null>(null)
```
Replace with:
```tsx
const [collapsedAreaIds, setCollapsedAreaIds] = useState<Set<number>>(new Set())
```

- [ ] **Step 2: Update the isExpanded check**

Find line 149:
```tsx
const isExpanded = expandedAreaId === area.id
```
Replace with:
```tsx
const isExpanded = !collapsedAreaIds.has(area.id)
```

- [ ] **Step 3: Update the click handler**

Find line 154:
```tsx
onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
```
Replace with:
```tsx
onClick={() => setCollapsedAreaIds(prev => {
  const next = new Set(prev)
  next.has(area.id) ? next.delete(area.id) : next.add(area.id)
  return next
})}
```

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Manual check**

Navigate to `/life`. Confirm all area cards render expanded on first load. Click a card header to collapse it. Click again to expand. Confirm independent toggle works per card.

- [ ] **Step 6: Commit**

```bash
git add src/components/life/LifePage.tsx
git commit -m "feat: expand all Life area cards by default"
```

---

### Task 3: Subscription category spend breakdown (SubscriptionsPage)

**Files:**
- Modify: `src/components/subscriptions/SubscriptionsPage.tsx`

Add a compact row below the monthly/annual totals strip showing spend per category.

- [ ] **Step 1: Add the breakdown computation**

In `src/components/subscriptions/SubscriptionsPage.tsx`, find the line that declares `soonCount` (around line 106):
```tsx
const soonCount = active.filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d >= 0 && d <= 14 }).length
```
After it, add:
```tsx
const categoryBreakdown = SUBSCRIPTION_CATEGORIES
  .map(cat => ({
    cat,
    monthly: active.filter(s => s.category === cat).reduce((sum, s) => sum + monthlyEquiv(s.cost, s.period), 0),
  }))
  .filter(x => x.monthly > 0)
  .sort((a, b) => b.monthly - a.monthly)
```

- [ ] **Step 2: Add the breakdown JSX**

Find the closing `</div>` of the summary strip (the one containing `Monthly:`, `Annual:`, badges — around line 188):
```tsx
</div>
```
Insert a new row after it:
```tsx
{categoryBreakdown.length > 0 && (
  <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
    {categoryBreakdown.map(({ cat, monthly }) => (
      <span key={cat} className="text-xs text-gray-500 dark:text-gray-400">
        {cat} <span className="font-medium text-gray-700 dark:text-gray-300">€{monthly.toFixed(2)}/mo</span>
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 3: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Manual check**

Navigate to Subscriptions. Confirm a row like `Software & Services €45.00/mo · Insurance €12.00/mo` appears below the totals. Confirm it's sorted by descending monthly spend. Confirm it's hidden when there are no active subscriptions.

- [ ] **Step 5: Commit**

```bash
git add src/components/subscriptions/SubscriptionsPage.tsx
git commit -m "feat: category spend breakdown in Subscriptions header"
```

---

### Task 4: P&L percentage per holding (PortfolioPage)

**Files:**
- Modify: `src/components/portfolio/PortfolioPage.tsx:31–39`

Extend `pnlDisplay` to append a percentage when `buyPrice > 0`.

- [ ] **Step 1: Update `pnlDisplay`**

In `src/components/portfolio/PortfolioPage.tsx`, find the complete `pnlDisplay` function (lines 31–39):
```tsx
function pnlDisplay(h: Holding): { text: string; cls: string } {
  if (h.quantity == null || h.currentPrice == null || h.buyPrice == null) {
    return { text: '—', cls: 'text-gray-400' }
  }
  const pnl = h.currentPrice * h.quantity - h.buyPrice
  if (pnl === 0) return { text: '€0', cls: 'text-gray-400' }
  if (pnl > 0) return { text: `+€${pnl.toFixed(2)}`, cls: 'text-green-600 dark:text-green-400' }
  return { text: `−€${Math.abs(pnl).toFixed(2)}`, cls: 'text-red-500' }
}
```
Replace with:
```tsx
function pnlDisplay(h: Holding): { text: string; cls: string } {
  if (h.quantity == null || h.currentPrice == null || h.buyPrice == null) {
    return { text: '—', cls: 'text-gray-400' }
  }
  const pnl = h.currentPrice * h.quantity - h.buyPrice
  if (pnl === 0) return { text: '€0', cls: 'text-gray-400' }
  const pct = h.buyPrice > 0 ? ` (${pnl > 0 ? '+' : ''}${((pnl / h.buyPrice) * 100).toFixed(1)}%)` : ''
  if (pnl > 0) return { text: `+€${pnl.toFixed(2)}${pct}`, cls: 'text-green-600 dark:text-green-400' }
  return { text: `−€${Math.abs(pnl).toFixed(2)}${pct}`, cls: 'text-red-500' }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Manual check**

Open Portfolio. Find a holding with both a total buy price and current price set. Confirm the P&L line shows `+€200.00 (+13.3%)` format (or negative equivalent). Confirm zero P&L still shows `€0`. Confirm holdings without buy price show `—`.

- [ ] **Step 4: Commit**

```bash
git add src/components/portfolio/PortfolioPage.tsx
git commit -m "feat: show P&L percentage alongside absolute in portfolio"
```

---

## SUB-PROJECT B — Experiences restructure

---

### Task 5: Travel page — sections instead of inner tabs

**Files:**
- Modify: `src/components/travel/TravelPage.tsx`

Remove the inner `tab: 'countries' | 'trips'` state and tab bar. Replace with two stacked sections: Trips first, Countries below. Also removes the `useSearchParams` dependency (no longer needed).

- [ ] **Step 1: Replace TravelPage.tsx**

Write the full file:

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { TravelCountry, TravelTrip } from '@/types'
import CountryCard from './CountryCard'
import CountryForm from './CountryForm'
import TripCard from './TripCard'
import TripForm from './TripForm'
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TravelPage() {
  const { data: countries = [], mutate: mutateCountries } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)
  const { data: trips = [], mutate: mutateTrips } = useSWR<TravelTrip[]>('/api/travel/trips', fetcher)

  const [countriesFilter, setCountriesFilter] = useState('All')
  const [countryFilter, setCountryFilter] = useState('All')
  const [addingCountry, setAddingCountry] = useState(false)
  const [addingTrip, setAddingTrip] = useState(false)
  const [editCountry, setEditCountry] = useState<TravelCountry | null>(null)
  const [editTrip, setEditTrip] = useState<TravelTrip | null>(null)
  const [bulkTrips, setBulkTrips] = useState(false)

  const TRIP_COLUMNS: ColumnDef[] = [
    { key: 'countryName', label: 'Country', type: 'text', required: true },
    { key: 'cities', label: 'Cities (comma-separated)', type: 'text' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'actualCost', label: 'Cost (€)', type: 'number' },
    { key: 'rating', label: 'Rating (1–5)', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ]

  async function handleTripsBulkSave({ upserted, deletedIds }: BulkChanges) {
    await Promise.all([
      ...upserted.map(row => {
        const cities = typeof row.cities === 'string'
          ? row.cities.split(',').map((c: string) => c.trim()).filter(Boolean)
          : []
        const body = { ...row, cities }
        return typeof row.id === 'number'
          ? fetch(`/api/travel/trips/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          : fetch('/api/travel/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }),
      ...deletedIds.map(id => fetch(`/api/travel/trips/${id}`, { method: 'DELETE' })),
    ])
    mutateTrips()
    mutateCountries()
    setBulkTrips(false)
  }

  const filteredCountries = countries.filter(c => {
    if (countriesFilter === 'With Trips') return c.tripCount > 0
    if (countriesFilter === 'Standalone') return c.tripCount === 0
    return true
  })

  const filteredTrips = trips.filter(t =>
    countryFilter === 'All' || t.countryName === countryFilter
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Travel</h1>

      {/* Trips section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Trips <span className="text-sm font-normal text-gray-400 ml-1">({trips.length})</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkTrips(true)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Edit All
            </button>
            <button
              onClick={() => setAddingTrip(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + Add Trip
            </button>
          </div>
        </div>

        {!bulkTrips && (
          <div className="flex gap-2 flex-wrap mb-4">
            {['All', ...countries.map(c => c.name)].map(f => (
              <button
                key={f}
                onClick={() => setCountryFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  countryFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {bulkTrips ? (
          <BulkEditor
            columns={TRIP_COLUMNS}
            rows={trips.map(t => ({
              id: t.id,
              countryName: t.countryName,
              cities: t.cities.join(', '),
              startDate: t.startDate ?? '',
              endDate: t.endDate ?? '',
              actualCost: t.actualCost,
              rating: t.rating,
              notes: t.notes ?? '',
            }))}
            csvHint="countryName,cities,startDate,endDate,actualCost,rating,notes"
            onSave={handleTripsBulkSave}
            onCancel={() => setBulkTrips(false)}
          />
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
            {countryFilter === 'All' ? "No trips yet. Click '+ Add Trip' to log your first." : `No trips to ${countryFilter}.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />)}
          </div>
        )}
      </div>

      {/* Countries section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Countries <span className="text-sm font-normal text-gray-400 ml-1">({countries.length})</span>
          </h2>
          <button
            onClick={() => setAddingCountry(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Add Country
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {['All', 'With Trips', 'Standalone'].map(f => (
            <button
              key={f}
              onClick={() => setCountriesFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                countriesFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filteredCountries.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
            {countriesFilter === 'All' ? 'No countries yet.' : `No ${countriesFilter.toLowerCase()} countries.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCountries.map(c => (
              <CountryCard
                key={c.id}
                country={c}
                onClick={() => setEditCountry(c)}
                onFilterTrips={() => setCountryFilter(c.name)}
              />
            ))}
          </div>
        )}
      </div>

      {addingCountry && <CountryForm onSave={() => { mutateCountries(); setAddingCountry(false) }} onCancel={() => setAddingCountry(false)} />}
      {addingTrip && <TripForm onSave={() => { mutateTrips(); mutateCountries(); setAddingTrip(false) }} onCancel={() => setAddingTrip(false)} />}
      {editCountry && <CountryForm initial={editCountry} onSave={() => { mutateCountries(); mutateTrips(); setEditCountry(null) }} onCancel={() => setEditCountry(null)} />}
      {editTrip && <TripForm initial={editTrip} onSave={() => { mutateTrips(); mutateCountries(); setEditTrip(null) }} onCancel={() => setEditTrip(null)} />}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Manual check**

Navigate to Experiences → Travel. Confirm both Trips and Countries sections are visible stacked. Confirm all existing functionality works: country filter pills (clicking a country name filters trips), Add Trip, Add Country, Edit All, editing a card.

- [ ] **Step 4: Commit**

```bash
git add src/components/travel/TravelPage.tsx
git commit -m "feat: Travel page — trips and countries as stacked sections"
```

---

### Task 6: Bucket List — sections instead of inner tabs

**Files:**
- Modify: `src/components/bucket-list/BucketListPage.tsx`

Remove the inner `tab` state. Show Trips section first, Experiences section below.

- [ ] **Step 1: Replace BucketListPage.tsx**

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { BucketTrip, BucketExperience } from '@/types'
import PromptModal from '@/components/ui/PromptModal'
import TripCard from './TripCard'
import TripForm from './TripForm'
import ExperienceCard from './ExperienceCard'
import ExperienceForm from './ExperienceForm'
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TRIP_FILTERS = ['All', 'Not Done', 'Done']
const EXP_STATUS_FILTERS = ['All', 'Not Done', 'Done']
const EXP_CATEGORY_FILTERS = ['Adventure', 'Learning', 'Career', 'Relationships', 'Health', 'Creative', 'Other']

export default function BucketListPage() {
  const { data: trips = [], mutate: mutateTrips } = useSWR<BucketTrip[]>('/api/bucket-list/trips', fetcher)
  const { data: experiences = [], mutate: mutateExperiences } = useSWR<BucketExperience[]>('/api/bucket-list/experiences', fetcher)

  const [tripFilter, setTripFilter] = useState('All')
  const [expFilter, setExpFilter] = useState('All')
  const [addingTrip, setAddingTrip] = useState(false)
  const [addingExperience, setAddingExperience] = useState(false)
  const [editTrip, setEditTrip] = useState<BucketTrip | null>(null)
  const [editExperience, setEditExperience] = useState<BucketExperience | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [bulkTrips, setBulkTrips] = useState(false)

  const BUCKET_TRIP_COLUMNS: ColumnDef[] = [
    { key: 'destination', label: 'Destination', type: 'text', required: true },
    { key: 'budget', label: 'Budget (€)', type: 'number' },
    { key: 'targetYear', label: 'Target Year', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text' },
    { key: 'done', label: 'Done', type: 'boolean' },
  ]

  async function handleBucketTripsBulkSave({ upserted, deletedIds }: BulkChanges) {
    await Promise.all([
      ...upserted.map(row =>
        typeof row.id === 'number'
          ? fetch(`/api/bucket-list/trips/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) })
          : fetch('/api/bucket-list/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) })
      ),
      ...deletedIds.map(id => fetch(`/api/bucket-list/trips/${id}`, { method: 'DELETE' })),
    ])
    mutateTrips()
    setBulkTrips(false)
  }

  function buildBucketListPrompt(): string {
    const pendingTrips = trips.filter(t => !t.done)
    const doneTrips = trips.filter(t => t.done)
    const tripLines = pendingTrips.map(t => {
      const year = t.targetYear ? ` (target: ${t.targetYear})` : ''
      const budget = t.budget ? ` · budget: €${t.budget.toLocaleString()}` : ''
      const cities = t.cities.length > 0 ? ` — ${t.cities.join(', ')}` : ''
      return `  - ${t.destination}${cities}${year}${budget}`
    }).join('\n')
    const pendingExp = experiences.filter(e => !e.done)
    const doneExp = experiences.filter(e => e.done)
    const expByCategory: Record<string, BucketExperience[]> = {}
    pendingExp.forEach(e => { if (!expByCategory[e.category]) expByCategory[e.category] = []; expByCategory[e.category].push(e) })
    const expLines = Object.entries(expByCategory).map(([cat, items]) =>
      `  ${cat}:\n` + items.map(e => `    - ${e.title}${e.targetYear ? ` (target: ${e.targetYear})` : ''}`).join('\n')
    ).join('\n')
    return `Here is my bucket list as of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:\n\nTrips — ${pendingTrips.length} pending, ${doneTrips.length} completed:\n${tripLines || '  None'}\n\nExperiences — ${pendingExp.length} pending, ${doneExp.length} completed:\n${expLines || '  None'}\n\nPlease reflect on this bucket list. Identify any themes or patterns. Suggest which 2–3 items look most achievable in the next 12 months. Flag any categories that seem underrepresented.`
  }

  const filteredTrips = trips.filter(t => {
    if (tripFilter === 'Done') return t.done
    if (tripFilter === 'Not Done') return !t.done
    return true
  })

  const filteredExperiences = experiences.filter(e => {
    if (expFilter === 'Done') return e.done
    if (expFilter === 'Not Done') return !e.done
    if (EXP_CATEGORY_FILTERS.includes(expFilter)) return e.category === expFilter
    return true
  })

  async function toggleTripDone(trip: BucketTrip) {
    await fetch(`/api/bucket-list/trips/${trip.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: trip.destination, cities: trip.cities, budget: trip.budget, targetYear: trip.targetYear, notes: trip.notes, done: !trip.done }),
    })
    mutateTrips()
  }

  async function toggleExperienceDone(experience: BucketExperience) {
    await fetch(`/api/bucket-list/experiences/${experience.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: experience.title, category: experience.category, notes: experience.notes, targetYear: experience.targetYear, done: !experience.done }),
    })
    mutateExperiences()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bucket List</h1>
        {(trips.length > 0 || experiences.length > 0) && (
          <button onClick={() => setShowPrompt(true)} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
            Generate AI Prompt
          </button>
        )}
      </div>

      {/* Trips section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Trips <span className="text-sm font-normal text-gray-400 ml-1">({trips.length})</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setBulkTrips(true)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              Edit All
            </button>
            <button onClick={() => setAddingTrip(true)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              + Add Trip
            </button>
          </div>
        </div>

        {!bulkTrips && (
          <div className="flex gap-2 flex-wrap mb-4">
            {TRIP_FILTERS.map(f => (
              <button key={f} onClick={() => setTripFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  tripFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>{f}</button>
            ))}
          </div>
        )}

        {bulkTrips ? (
          <BulkEditor
            columns={BUCKET_TRIP_COLUMNS}
            rows={trips.map(t => ({ id: t.id, destination: t.destination, budget: t.budget, targetYear: t.targetYear, notes: t.notes ?? '', done: t.done }))}
            csvHint="destination,budget,targetYear,notes,done"
            onSave={handleBucketTripsBulkSave}
            onCancel={() => setBulkTrips(false)}
          />
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
            {tripFilter === 'All' ? 'No trips yet. Click "+ Add Trip" to add your first.' : `No ${tripFilter.toLowerCase()} trips.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map(t => <TripCard key={t.id} trip={t} onToggleDone={() => toggleTripDone(t)} onClick={() => setEditTrip(t)} />)}
          </div>
        )}
      </div>

      {/* Experiences section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Experiences <span className="text-sm font-normal text-gray-400 ml-1">({experiences.length})</span>
          </h2>
          <button onClick={() => setAddingExperience(true)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + Add Experience
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {[...EXP_STATUS_FILTERS, ...EXP_CATEGORY_FILTERS].map(f => (
            <button key={f} onClick={() => setExpFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                expFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>{f}</button>
          ))}
        </div>

        {filteredExperiences.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
            {expFilter === 'All' ? 'No experiences yet. Click "+ Add Experience" to add your first.' : `No ${expFilter} experiences.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExperiences.map(e => <ExperienceCard key={e.id} experience={e} onToggleDone={() => toggleExperienceDone(e)} onClick={() => setEditExperience(e)} />)}
          </div>
        )}
      </div>

      {addingTrip && <TripForm onSave={() => { mutateTrips(); setAddingTrip(false) }} onCancel={() => setAddingTrip(false)} />}
      {addingExperience && <ExperienceForm onSave={() => { mutateExperiences(); setAddingExperience(false) }} onCancel={() => setAddingExperience(false)} />}
      {editTrip && <TripForm initial={editTrip} onSave={() => { mutateTrips(); setEditTrip(null) }} onCancel={() => setEditTrip(null)} />}
      {editExperience && <ExperienceForm initial={editExperience} onSave={() => { mutateExperiences(); setEditExperience(null) }} onCancel={() => setEditExperience(null)} />}
      {showPrompt && <PromptModal title="Bucket List AI Prompt" prompt={buildBucketListPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Manual check**

Navigate to Experiences → Bucket List. Confirm Trips section appears first, Experiences below. Confirm filters, Edit All, toggle done, add/edit forms all work.

- [ ] **Step 4: Commit**

```bash
git add src/components/bucket-list/BucketListPage.tsx
git commit -m "feat: Bucket List — trips and experiences as stacked sections"
```

---

### Task 7: Timeline tab in ExperiencesPage

**Files:**
- Create: `src/components/timeline/TimelinePage.tsx`
- Modify: `src/components/experiences/ExperiencesPage.tsx`

- [ ] **Step 1: Create TimelinePage.tsx**

```bash
mkdir -p /home/than/PersonalAssistant/src/components/timeline
```

Create `src/components/timeline/TimelinePage.tsx`:

```tsx
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface TripEntry {
  id: number
  countryName: string
  cities: string[]
  startDate: string | null
  notes: string | null
}

interface MemoryEntry {
  id: number
  title: string
  date: string
  category: string
  location: string | null
  notes: string | null
}

type TimelineItem =
  | { kind: 'trip'; date: string; data: TripEntry }
  | { kind: 'memory'; date: string; data: MemoryEntry }

export default function TimelinePage() {
  const { data: trips = [] } = useSWR<TripEntry[]>('/api/travel/trips', fetcher)
  const { data: memories = [] } = useSWR<MemoryEntry[]>('/api/memories', fetcher)

  const items: TimelineItem[] = [
    ...trips
      .filter(t => t.startDate)
      .map(t => ({ kind: 'trip' as const, date: t.startDate!, data: t })),
    ...memories.map(m => ({ kind: 'memory' as const, date: m.date, data: m })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        No trips or memories yet. Add some to build your timeline.
      </p>
    )
  }

  const rendered: Array<{ type: 'separator'; label: string } | { type: 'item'; item: TimelineItem }> = []
  let lastYM = ''
  for (const item of items) {
    const ym = item.date.slice(0, 7)
    if (ym !== lastYM) {
      const [y, m] = ym.split('-')
      rendered.push({
        type: 'separator',
        label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      })
      lastYM = ym
    }
    rendered.push({ type: 'item', item })
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {rendered.map((entry, idx) => {
        if (entry.type === 'separator') {
          return (
            <div key={`sep-${idx}`} className="flex items-center gap-2 mt-4 mb-1 first:mt-0">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{entry.label}</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            </div>
          )
        }
        const { item } = entry
        return (
          <div key={`${item.kind}-${item.data.id}`} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
              item.kind === 'trip'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            }`}>
              {item.kind === 'trip' ? 'Trip' : 'Memory'}
            </span>
            <div className="min-w-0 flex-1">
              {item.kind === 'trip' ? (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.data.countryName}</p>
                  {item.data.cities.length > 0 && (
                    <p className="text-xs text-gray-400">{item.data.cities.join(', ')}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.data.title}</p>
                  {item.data.location && <p className="text-xs text-gray-400">{item.data.location}</p>}
                </>
              )}
              {item.data.notes && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {item.data.notes.length > 100 ? item.data.notes.slice(0, 100) + '…' : item.data.notes}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {new Date(item.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Add the timeline tab to ExperiencesPage**

In `src/components/experiences/ExperiencesPage.tsx`, replace the entire file:

```tsx
'use client'

import { useState } from 'react'
import TravelPage from '@/components/travel/TravelPage'
import BucketListPage from '@/components/bucket-list/BucketListPage'
import MemoriesPage from '@/components/memories/MemoriesPage'
import TimelinePage from '@/components/timeline/TimelinePage'

type ExperiencesTab = 'travel' | 'bucket-list' | 'memories' | 'timeline'

const TABS: { id: ExperiencesTab; label: string }[] = [
  { id: 'travel', label: 'Travel' },
  { id: 'bucket-list', label: 'Bucket List' },
  { id: 'memories', label: 'Memories' },
  { id: 'timeline', label: 'Timeline' },
]

export default function ExperiencesPage({ defaultTab = 'travel' }: { defaultTab?: ExperiencesTab }) {
  const [tab, setTab] = useState<ExperiencesTab>(defaultTab)

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'travel' && <TravelPage />}
      {tab === 'bucket-list' && <BucketListPage />}
      {tab === 'memories' && <MemoriesPage />}
      {tab === 'timeline' && <TimelinePage />}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Manual check**

Navigate to Experiences. Confirm four tabs: Travel, Bucket List, Memories, Timeline. Click Timeline. Confirm a chronological list of trips and memories appears. Confirm month/year separators appear between groups. Confirm Trip entries show country + cities, Memory entries show title + location.

- [ ] **Step 5: Commit**

```bash
git add src/components/timeline/TimelinePage.tsx src/components/experiences/ExperiencesPage.tsx
git commit -m "feat: Timeline tab in Experiences showing trips and memories chronologically"
```

---

## SUB-PROJECT C — Dashboard + Portfolio

---

### Task 8: Renewals and Gifts sections in Today page

**Files:**
- Modify: `src/components/today/TodayPage.tsx`

- [ ] **Step 1: Add interfaces and data fetches**

In `src/components/today/TodayPage.tsx`, after the existing interfaces (after `APPT_CATEGORY_COLOR`), add:

```tsx
interface Subscription {
  id: number; name: string; cost: number; period: string; active: boolean; renewalDate?: string | null
}

interface GiftIdea {
  id: number; purchased: boolean
}

interface GiftPerson {
  id: number; name: string; ideas: GiftIdea[]
}
```

In the `TodayPage` component body, after the existing `useSWR` calls, add:

```tsx
const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
const { data: giftPeople = [] } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
```

- [ ] **Step 2: Add computed values**

After `const doneCount = habits.filter(h => h.doneToday).length`, add:

```tsx
function daysUntilRenewal(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

const upcomingRenewals = subscriptions
  .filter(s => {
    if (!s.active || !s.renewalDate) return false
    const d = daysUntilRenewal(s.renewalDate)
    return d !== null && d >= 0 && d <= 30
  })
  .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))

const pendingGiftPeople = giftPeople.filter(p => p.ideas.some(i => !i.purchased))
```

- [ ] **Step 3: Add Renewals section JSX**

In the return JSX, after the Habits section (after the closing `</div>` of the habits card), add:

```tsx
{/* Upcoming Renewals */}
{upcomingRenewals.length > 0 && (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
    <SectionHeader title="Upcoming Renewals" count={upcomingRenewals.length} />
    <div className="flex flex-col gap-1.5">
      {upcomingRenewals.map(s => {
        const days = daysUntilRenewal(s.renewalDate)!
        const suffix = s.period === 'monthly' ? 'mo' : s.period === 'quarterly' ? 'qtr' : 'yr'
        return (
          <div key={s.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">€{s.cost.toFixed(2)}/{suffix}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                days <= 7
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {days === 0 ? 'today' : `in ${days}d`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 4: Add Gifts section JSX**

After the Renewals section, add:

```tsx
{/* Pending Gifts */}
{pendingGiftPeople.length > 0 && (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
    <SectionHeader title="Pending Gifts" count={pendingGiftPeople.length} />
    <div className="flex flex-col gap-1">
      {pendingGiftPeople.map(p => {
        const count = p.ideas.filter(i => !i.purchased).length
        return (
          <div key={p.id} className="flex items-center justify-between py-0.5">
            <span className="text-sm text-gray-700 dark:text-gray-300">{p.name}</span>
            <span className="text-xs text-gray-400">{count} idea{count !== 1 ? 's' : ''}</span>
          </div>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 5: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 6: Manual check**

Navigate to Today. If you have subscriptions with renewal dates within 30 days, confirm they appear in the "Upcoming Renewals" section with the correct badge color (amber ≤ 7 days, gray ≤ 30 days). If you have gift people with unpurchased ideas, confirm they appear in "Pending Gifts" with idea count. Confirm both sections are hidden when empty.

- [ ] **Step 7: Commit**

```bash
git add src/components/today/TodayPage.tsx
git commit -m "feat: upcoming renewals and pending gifts sections in Today page"
```

---

### Task 9: Auto-fetch prices API route

**Files:**
- Create: `src/app/api/portfolio/refresh-prices/route.ts`

- [ ] **Step 1: Create the directory and route file**

```bash
mkdir -p /home/than/PersonalAssistant/src/app/api/portfolio/refresh-prices
```

Create `src/app/api/portfolio/refresh-prices/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function fetchCryptoPrice(name: string): Promise<number | null> {
  try {
    const searchRes = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json() as { coins?: { id: string }[] }
    const coinId = searchData.coins?.[0]?.id
    if (!coinId) return null

    const priceRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`,
      { headers: { Accept: 'application/json' } }
    )
    if (!priceRes.ok) return null
    const priceData = await priceRes.json() as Record<string, { eur?: number }>
    return priceData[coinId]?.eur ?? null
  } catch {
    return null
  }
}

async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json() as { quoteResponse?: { result?: { regularMarketPrice?: number }[] } }
    return data.quoteResponse?.result?.[0]?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

export async function POST() {
  const holdings = await prisma.portfolioHolding.findMany({
    where: { NOT: { type: 'savings' } },
  })

  const updated: string[] = []
  const failed: string[] = []

  await Promise.all(
    holdings.map(async h => {
      const price = h.type === 'crypto'
        ? await fetchCryptoPrice(h.name)
        : await fetchStockPrice(h.name)

      if (price !== null) {
        await prisma.portfolioHolding.update({
          where: { id: h.id },
          data: { currentPrice: price },
        })
        updated.push(h.name)
      } else {
        failed.push(h.name)
      }
    })
  )

  return NextResponse.json({ updated, failed })
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/portfolio/refresh-prices/route.ts
git commit -m "feat: POST /api/portfolio/refresh-prices — fetch live prices from CoinGecko and Yahoo Finance"
```

---

### Task 10: Portfolio — Refresh prices button UI

**Files:**
- Modify: `src/components/portfolio/PortfolioPage.tsx`

- [ ] **Step 1: Add state for refresh**

In `PortfolioPage`, after the existing `useState` declarations (around line 49), add:

```tsx
const [refreshing, setRefreshing] = useState(false)
const [refreshResult, setRefreshResult] = useState<string | null>(null)
```

- [ ] **Step 2: Add the refresh handler**

After the `del` function, add:

```tsx
async function refreshPrices() {
  setRefreshing(true)
  setRefreshResult(null)
  try {
    const res = await fetch('/api/portfolio/refresh-prices', { method: 'POST' })
    const data = await res.json() as { updated: string[]; failed: string[] }
    mutate()
    const parts: string[] = []
    if (data.updated.length > 0) parts.push(`Refreshed ${data.updated.length} price${data.updated.length !== 1 ? 's' : ''}`)
    if (data.failed.length > 0) parts.push(`${data.failed.length} failed (${data.failed.join(', ')})`)
    setRefreshResult(parts.join(' · ') || 'No holdings to refresh')
    setTimeout(() => setRefreshResult(null), 6000)
  } finally {
    setRefreshing(false)
  }
}
```

- [ ] **Step 3: Add the button and result display to the header**

Find the header buttons div (around line 116):
```tsx
<button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  + Add holding
</button>
```
Before that button, add:
```tsx
<button
  onClick={refreshPrices}
  disabled={refreshing}
  className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
>
  {refreshing ? 'Refreshing…' : 'Refresh prices'}
</button>
```

After the header `</div>`, and before the Summary strip `<div>`, add:
```tsx
{refreshResult && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{refreshResult}</p>
)}
```

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Manual check**

Open Portfolio. Confirm "Refresh prices" button appears. Click it — button shows "Refreshing…" while loading. After completion, confirm result text like "Refreshed 3 prices · 1 failed (MSFT)" appears and fades after 6 seconds. Confirm `currentPrice` values update in the holdings list.

- [ ] **Step 6: Commit**

```bash
git add src/components/portfolio/PortfolioPage.tsx
git commit -m "feat: Refresh prices button in Portfolio — fetches live crypto and stock prices"
```

---

## SUB-PROJECT D — Items/Collectibles restructure

---

### Task 11: Items page — swap columns, collapsible categories, collectibles inline

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

This task makes three changes: (1) swap Wishlist/Inventory column order so Wishlist is left, (2) make category rows collapsible, (3) remove the Collectibles tab and inline CollectiblesTab below the category list.

- [ ] **Step 1: Add `collapsedCats` state and `toggleCat` helper**

In `src/components/items/ItemsPage.tsx`, find the block of useState declarations (around lines 39–51). After `const [bulkInv, setBulkInv] = useState(false)`, add:

```tsx
const [collapsedCats, setCollapsedCats] = useState<Set<number>>(new Set())

function toggleCat(id: number) {
  setCollapsedCats(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```

- [ ] **Step 2: Remove the `activeView` state and tab bar JSX**

Find and delete:
```tsx
const [activeView, setActiveView] = useState<'items' | 'collectibles'>('items')
```

Find and delete the entire "View tabs" block (the `<div>` containing the "Inventory & Wishlist" and "Collectibles" tab buttons, around lines 201–225):
```tsx
{/* View tabs */}
<div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
  ...
</div>

{activeView === 'collectibles' && <CollectiblesTab />}

{activeView === 'items' && <>
```

Also delete the matching closing `</>}` at the end of the items section (around line 384: `</div>{/* end hidden wrapper */}`). Replace with just `</div>` closing the hidden wrapper.

- [ ] **Step 3: Swap column headers**

Find the "Column headers" block (around lines 256–265):
```tsx
{/* Column headers */}
<div className="grid grid-cols-2 gap-4 mb-2">
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Inventory</span>
    <span className="text-xs text-gray-400">{filteredInv.length} items</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wishlist</span>
    <span className="text-xs text-gray-400">{filteredWish.length} items</span>
  </div>
</div>
```
Replace with (swap Inventory ↔ Wishlist):
```tsx
{/* Column headers */}
<div className="grid grid-cols-2 gap-4 mb-2">
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wishlist</span>
    <span className="text-xs text-gray-400">{filteredWish.length} items</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Inventory</span>
    <span className="text-xs text-gray-400">{filteredInv.length} items</span>
  </div>
</div>
```

- [ ] **Step 4: Make category headers collapsible and swap column order**

Find the per-category block (around line 272):
```tsx
{visibleCategories.map(cat => {
  const catInv = filteredInv.filter(i => i.categoryId === cat.id)
  const catWish = filteredWish
    .filter(i => i.categoryId === cat.id)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  return (
    <div key={cat.id} className="mb-8">
      <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-100 dark:border-gray-800">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat.name}</span>
        <span className="text-xs text-gray-400">{catInv.length} owned · {catWish.length} wanted</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Inventory column */}
        <div className="flex flex-col gap-2">
          ...inventory items...
        </div>
        {/* Wishlist column */}
        <div className="flex flex-col gap-2">
          ...wishlist items...
        </div>
      </div>
    </div>
  )
})}
```

Replace with (collapsible header + swapped columns):
```tsx
{visibleCategories.map(cat => {
  const catInv = filteredInv.filter(i => i.categoryId === cat.id)
  const catWish = filteredWish
    .filter(i => i.categoryId === cat.id)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  const isCatCollapsed = collapsedCats.has(cat.id)

  return (
    <div key={cat.id} className="mb-8">
      <div
        className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-100 dark:border-gray-800 cursor-pointer select-none"
        onClick={() => toggleCat(cat.id)}
      >
        <span className="text-gray-400 text-xs">{isCatCollapsed ? '▸' : '▾'}</span>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat.name}</span>
        <span className="text-xs text-gray-400">{catInv.length} owned · {catWish.length} wanted</span>
      </div>
      {!isCatCollapsed && (
        <div className="grid grid-cols-2 gap-4">
          {/* Wishlist column — LEFT */}
          <div className="flex flex-col gap-2">
            {catWish.length === 0 ? (
              <p className="text-xs text-gray-300 dark:text-gray-600 italic py-1">Nothing on wishlist</p>
            ) : catWish.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                      <Badge color={PRIORITY_COLOR[item.priority]}>{item.priority}</Badge>
                      {item.inventoryUpgrades.map(u => (
                        <Badge key={u.id} color="#8b5cf6">Upgrades: {u.name}</Badge>
                      ))}
                    </div>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-0.5">{item.url}</a>
                    )}
                    {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">€{item.cost.toFixed(2)}</span>
                    <div className="flex gap-1 mt-1 justify-end flex-wrap">
                      <button onClick={() => markGotIt(item)} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Got it</button>
                      <button onClick={() => setEditWish(item)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                      <button onClick={() => setAddToTask({ title: item.name, sourceId: item.id })} className="text-xs text-indigo-500 hover:underline">+Task</button>
                      <button onClick={() => delWish(item.id)} className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-900/30">Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Inventory column — RIGHT */}
          <div className="flex flex-col gap-2">
            {catInv.length === 0 ? (
              <p className="text-xs text-gray-300 dark:text-gray-600 italic py-1">Nothing owned</p>
            ) : catInv.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                      {item.quantity > 1 && <Badge color="#6b7280">×{item.quantity}</Badge>}
                    </div>
                    {item.upgradeTarget && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-amber-500">→ upgrade:</span>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{item.upgradeTarget.name}</span>
                        <span className="text-xs text-gray-400">€{item.upgradeTarget.cost.toFixed(2)}</span>
                      </div>
                    )}
                    {item.purchaseDate && (
                      <p className="text-xs text-gray-400 mt-0.5">Bought {new Date(item.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    )}
                    {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">€{(item.cost * item.quantity).toFixed(2)}</span>
                    <div className="flex gap-1 mt-1 justify-end">
                      <button onClick={() => setEditInv(item)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                      <button onClick={() => delInv(item.id)} className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-900/30">Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})}
```

- [ ] **Step 5: Add Collectibles section after categories**

After the closing `})}` of the `visibleCategories.map` block, and before the "Purchased — not yet in inventory" section, add:

```tsx
{/* Collectibles */}
<div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Collectibles</h2>
  <CollectiblesTab />
</div>
```

- [ ] **Step 6: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: no errors. If there are errors about `activeView`, search for any remaining references and remove them.

- [ ] **Step 7: Manual check**

Navigate to Items. Confirm:
- No "Inventory & Wishlist" / "Collectibles" tabs at the top
- Wishlist column is on the LEFT, Inventory on the RIGHT
- Category headers have a chevron (▾/▸) — clicking toggles the rows
- A "Collectibles" section appears at the bottom with the CollectiblesTab content
- All wishlist actions (Got it, Edit, +Task, Del) work
- All inventory actions (Edit, Del) work
- Search and category filter still filter both columns

- [ ] **Step 8: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: Items — wishlist left, inventory right, collapsible categories, collectibles inline"
```

---

## Final verification

- [ ] **Full type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1
```

Expected: zero errors (or only the pre-existing `timeline/page.tsx` error which was already there before this work — verify with `git log src/app/timeline/page.tsx`).

- [ ] **Spot-check all pages**

Visit: Net Worth (no crash, chart visible), Life (all areas expanded), Subscriptions (category row), Portfolio (P&L %, Refresh button), Experiences/Travel, Experiences/BucketList, Experiences/Timeline, Today (renewals, gifts), Items (layout).
