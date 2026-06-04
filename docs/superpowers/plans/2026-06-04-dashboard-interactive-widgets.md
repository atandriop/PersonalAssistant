# Dashboard Interactive Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Goals, Appointments, Travel, and Gifts dashboard widgets from read-only displays into fully interactive panels with inline actions and modal-based CRUD.

**Architecture:** Extract the two gift forms that are currently inline in `GiftsPage.tsx` into separate files so they can be reused on the dashboard. Then upgrade `DashboardPage.tsx` to add action buttons and modal state to four existing widgets. No schema or API changes required — all existing endpoints are already sufficient.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, SWR, Tailwind CSS, Prisma/SQLite

---

## File Map

| Action | File | What changes |
|---|---|---|
| Create | `src/components/gifts/GiftPersonForm.tsx` | Extracted from GiftsPage.tsx |
| Create | `src/components/gifts/GiftIdeaForm.tsx` | Extracted from GiftsPage.tsx |
| Modify | `src/components/gifts/GiftsPage.tsx` | Import from new files |
| Modify | `src/types/index.ts` | Add `notes: string \| null` to global `GiftPerson` |
| Modify | `src/components/dashboard/DashboardPage.tsx` | All four widget upgrades |

---

## Task 1: Extract GiftPersonForm

**Files:**
- Create: `src/components/gifts/GiftPersonForm.tsx`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create `src/components/gifts/GiftPersonForm.tsx`**

```tsx
'use client'

import { useState } from 'react'

interface GiftPersonFormInput {
  id?: number
  name: string
  budget: number | null
  notes: string | null
}

export default function GiftPersonForm({ initial, onSave, onCancel }: {
  initial?: GiftPersonFormInput
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, budget: budget ? Number(budget) : null, notes: notes || null }
    if (initial?.id) {
      await fetch(`/api/gifts/people/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/gifts/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Person name" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Budget (optional, €)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add person'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Add `notes` to global `GiftPerson` type in `src/types/index.ts`**

Find the line:
```typescript
export interface GiftPerson { id: number; name: string; budget: number | null; ideas: GiftIdea[] }
```

Replace with:
```typescript
export interface GiftPerson { id: number; name: string; budget: number | null; notes: string | null; ideas: GiftIdea[] }
```

- [ ] **Step 3: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/gifts/GiftPersonForm.tsx src/types/index.ts
git commit -m "feat: extract GiftPersonForm component"
```

---

## Task 2: Extract GiftIdeaForm and update GiftsPage imports

**Files:**
- Create: `src/components/gifts/GiftIdeaForm.tsx`
- Modify: `src/components/gifts/GiftsPage.tsx`

- [ ] **Step 1: Create `src/components/gifts/GiftIdeaForm.tsx`**

```tsx
'use client'

import { useState } from 'react'

interface GiftIdeaFormInput {
  id?: number
  title: string
  occasion: string | null
  estimatedCost: number | null
  notes: string | null
  purchased?: boolean
}

export default function GiftIdeaForm({ personId, initial, onSave, onCancel }: {
  personId: number
  initial?: GiftIdeaFormInput
  onSave: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [occasion, setOccasion] = useState(initial?.occasion ?? '')
  const [estimatedCost, setEstimatedCost] = useState(initial?.estimatedCost?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      title,
      occasion: occasion || null,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      purchased: initial?.purchased ?? false,
      notes: notes || null,
    }
    if (initial?.id) {
      await fetch(`/api/gifts/ideas/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch(`/api/gifts/people/${personId}/ideas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Gift idea" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="Occasion (e.g. Birthday, Christmas)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="number" step="0.01" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="Estimated cost (optional, €)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add idea'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Update `src/components/gifts/GiftsPage.tsx` to import from new files**

At the top of the file, after the `Modal` import, add:
```tsx
import GiftPersonForm from './GiftPersonForm'
import GiftIdeaForm from './GiftIdeaForm'
```

Delete the entire `PersonForm` function (lines 32–59) and the entire `IdeaForm` function (lines 62–97).

In `PersonDetail` (the component that renders ideas), replace the two `IdeaForm` references:
- `<IdeaForm personId={person.id} onSave=...` → `<GiftIdeaForm personId={person.id} onSave=...`
- `<IdeaForm personId={person.id} initial={editing} onSave=...` → `<GiftIdeaForm personId={person.id} initial={editing} onSave=...`

In `GiftsPage` (the main export), replace the two `PersonForm` references:
- `<PersonForm onSave=...` → `<GiftPersonForm onSave=...`
- `<PersonForm initial={editing} onSave=...` → `<GiftPersonForm initial={editing} onSave=...`

- [ ] **Step 3: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/gifts/GiftIdeaForm.tsx src/components/gifts/GiftsPage.tsx
git commit -m "feat: extract GiftIdeaForm, update GiftsPage imports"
```

---

## Task 3: Goals widget — inline milestone checkboxes

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Extend `WidgetCard` to accept an optional `action` prop**

Find the `WidgetCard` function in `DashboardPage.tsx` (around line 97). Replace it with:

```tsx
function WidgetCard({ title, borderStyle, action, children }: {
  title: string
  borderStyle?: React.CSSProperties
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border rounded-xl p-4" style={borderStyle ?? {}}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Add `mutate: mutateAreas` to the life-areas SWR call**

Find (around line 131):
```tsx
const { data: lifeAreas = [], isLoading: goalsLoading } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
```

Replace with:
```tsx
const { data: lifeAreas = [], isLoading: goalsLoading, mutate: mutateAreas } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
```

- [ ] **Step 3: Add the `toggleMilestone` function**

In the computed data section, after the `upcomingAppts` computation (around line 217), add:

```tsx
async function toggleMilestone(milestone: { id: number; completedAt: string | null }) {
  await fetch(`/api/milestones/${milestone.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completedAt: milestone.completedAt ? null : new Date().toISOString() }),
  })
  mutateAreas()
}
```

- [ ] **Step 4: Replace the Goals widget JSX**

Find the Goals widget block (starts with `{/* Goals */}`, around line 302). Replace the entire block with:

```tsx
{/* Goals */}
{show('goals') && (
  <WidgetCard title="Goals">
    {goalsLoading ? (
      <p className="text-sm text-gray-400">Loading…</p>
    ) : lowestGoals.length === 0 ? (
      <p className="text-sm text-gray-400">No goals set up yet.</p>
    ) : (
      <div className="flex flex-col gap-3">
        {lowestGoals.map(g => (
          <div key={g.id}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.title}</span>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{Math.round(g.pct * 100)}%</span>
            </div>
            <span className="text-xs text-gray-400">{g.areaName}</span>
            <div className="mt-1 mb-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(g.pct * 100)}%` }} />
            </div>
            {g.milestones.length > 0 && (
              <div className="flex flex-col gap-1 pl-1">
                {[...g.milestones]
                  .sort((a, b) => {
                    if (a.completedAt === null && b.completedAt !== null) return -1
                    if (a.completedAt !== null && b.completedAt === null) return 1
                    return 0
                  })
                  .map(m => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.completedAt !== null}
                        onChange={() => toggleMilestone(m)}
                        className="accent-blue-500 w-3.5 h-3.5 shrink-0"
                      />
                      <span className={`text-xs ${m.completedAt !== null ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {m.title ?? ''}
                      </span>
                    </label>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </WidgetCard>
)}
```

- [ ] **Step 5: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: goals widget — inline milestone checkboxes"
```

---

## Task 4: Appointments widget — add, edit, mark done

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add `Modal` and `AppointmentForm` imports**

At the top of `DashboardPage.tsx`, after the existing imports, add:
```tsx
import Modal from '@/components/ui/Modal'
import AppointmentForm from '@/components/tasks/AppointmentForm'
```

- [ ] **Step 2: Add `mutate: mutateAppts` to the appointments SWR call**

Find (around line 133):
```tsx
const { data: appointments = [], isLoading: apptLoading } = useSWR<Appointment[]>('/api/appointments', fetcher)
```

Replace with:
```tsx
const { data: appointments = [], isLoading: apptLoading, mutate: mutateAppts } = useSWR<Appointment[]>('/api/appointments', fetcher)
```

- [ ] **Step 3: Add appointment modal state**

After the `configuring` state (around line 114), add:
```tsx
const [apptToEdit, setApptToEdit] = useState<Appointment | null>(null)
const [showAddAppt, setShowAddAppt] = useState(false)
```

- [ ] **Step 4: Add the `markApptDone` function**

After `toggleMilestone`, add:
```tsx
async function markApptDone(id: number) {
  await fetch(`/api/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: true }),
  })
  mutateAppts()
}
```

- [ ] **Step 5: Replace the Appointments widget JSX**

Find the `{/* Upcoming Appointments */}` block (around line 365). Replace the entire block with:

```tsx
{/* Upcoming Appointments */}
{show('appointments') && (
  <WidgetCard title="Upcoming Appointments" action={
    <button onClick={() => setShowAddAppt(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add</button>
  }>
    {apptLoading ? (
      <p className="text-sm text-gray-400">Loading…</p>
    ) : upcomingAppts.length === 0 ? (
      <p className="text-sm text-gray-400">No upcoming appointments.</p>
    ) : (
      <div className="flex flex-col gap-2">
        {upcomingAppts.map(a => (
          <div key={a.id} className="flex items-center gap-2">
            <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">{a.title}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${APPT_CATEGORY_COLOR[a.category] ?? APPT_CATEGORY_COLOR.Other}`}>
                {a.category}
              </span>
              <span className="text-xs text-gray-400">{a.date}</span>
              <button onClick={() => markApptDone(a.id)} title="Mark done" className="text-xs text-green-600 hover:text-green-700 font-medium">✓</button>
              <button onClick={() => setApptToEdit(a)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Edit</button>
            </div>
          </div>
        ))}
      </div>
    )}
  </WidgetCard>
)}
```

- [ ] **Step 6: Add appointment modals before the closing `</div>` of the page**

Just before the final `</div>` that closes the component return (after the grid `</div>`), add:
```tsx
{showAddAppt && <Modal title="Add appointment" onClose={() => setShowAddAppt(false)}><AppointmentForm onSave={() => { setShowAddAppt(false); mutateAppts() }} onCancel={() => setShowAddAppt(false)} /></Modal>}
{apptToEdit && <Modal title="Edit appointment" onClose={() => setApptToEdit(null)}><AppointmentForm initial={apptToEdit} onSave={() => { setApptToEdit(null); mutateAppts() }} onCancel={() => setApptToEdit(null)} /></Modal>}
```

- [ ] **Step 7: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: appointments widget — add, edit, mark done from dashboard"
```

---

## Task 5: Travel widget — stats + upcoming trips

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add `TripForm` import**

After the `AppointmentForm` import, add:
```tsx
import TripForm from '@/components/travel/TripForm'
```

Note: `TripForm` renders its own modal backdrop — do NOT wrap it in `<Modal>`.

- [ ] **Step 2: Add `mutate: mutateTravelTrips` to the travel trips SWR call**

Find (around line 138):
```tsx
const { data: travelTrips = [], isLoading: travelTripsLoading } = useSWR<TravelTrip[]>('/api/travel/trips', fetcher)
```

Replace with:
```tsx
const { data: travelTrips = [], isLoading: travelTripsLoading, mutate: mutateTravelTrips } = useSWR<TravelTrip[]>('/api/travel/trips', fetcher)
```

- [ ] **Step 3: Add trip modal state**

After the appointment state lines, add:
```tsx
const [tripToEdit, setTripToEdit] = useState<TravelTrip | null>(null)
const [showAddTrip, setShowAddTrip] = useState(false)
```

- [ ] **Step 4: Add date formatting helpers and compute `upcomingTrips`**

Add these two helpers as module-level functions (outside `DashboardPage`, near the top of the file after the `APPT_CATEGORY_COLOR` constant):

```tsx
function formatTripDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'Date TBD'
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const s = new Date(startDate + 'T00:00:00')
  if (!endDate) return `${MONTHS[s.getMonth()]} ${s.getDate()}`
  const e = new Date(endDate + 'T00:00:00')
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
}

function daysUntilTrip(startDate: string): number {
  const target = new Date(startDate + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}
```

In the computed data section, after the `upcomingAppts` computation (around line 217), add:
```tsx
// ── Travel upcoming trips ──
const upcomingTrips = travelTrips
  .filter(t => t.startDate != null && t.startDate >= today)
  .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
  .slice(0, 3)
```

- [ ] **Step 5: Replace the Travel widget JSX**

Find the `{/* Travel */}` block (around line 462). Replace the entire block with:

```tsx
{/* Travel */}
{show('travel') && (
  <WidgetCard title="Travel" action={
    <button onClick={() => setShowAddTrip(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add trip</button>
  }>
    {travelCountriesLoading || travelTripsLoading ? (
      <p className="text-sm text-gray-400">Loading…</p>
    ) : travelCountries.length === 0 && travelTrips.length === 0 ? (
      <p className="text-sm text-gray-400">No trips logged yet.</p>
    ) : (
      <div className="flex flex-col gap-3">
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{travelCountries.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">countries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{travelTrips.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">trips</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              €{travelTrips.reduce((s, t) => s + (t.actualCost ?? 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">total spent</p>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Next up</p>
          {upcomingTrips.length === 0 ? (
            <p className="text-xs text-gray-400">No upcoming trips.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {upcomingTrips.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{t.countryName}</span>
                    {t.cities.length > 0 && (
                      <span className="text-xs text-gray-400 block truncate">{t.cities.join(', ')}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 block">{formatTripDateRange(t.startDate, t.endDate)}</span>
                    <span className="text-xs text-blue-500 block">{daysUntilTrip(t.startDate!)} days away</span>
                  </div>
                  <button onClick={() => setTripToEdit(t)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0" title="Edit trip">✏️</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <a href="/travel" className="text-xs text-blue-500 hover:text-blue-600">View all →</a>
      </div>
    )}
  </WidgetCard>
)}
```

- [ ] **Step 6: Add trip modals before the closing `</div>`**

After the appointment modals, add:
```tsx
{showAddTrip && <TripForm onSave={() => { setShowAddTrip(false); mutateTravelTrips() }} onCancel={() => setShowAddTrip(false)} />}
{tripToEdit && <TripForm initial={tripToEdit} onSave={() => { setTripToEdit(null); mutateTravelTrips() }} onCancel={() => setTripToEdit(null)} />}
```

- [ ] **Step 7: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: travel widget — stats + upcoming trips with edit/add"
```

---

## Task 6: Gifts widget — add person, edit person, add idea

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add `GiftPersonForm` and `GiftIdeaForm` imports**

After the `TripForm` import, add:
```tsx
import GiftPersonForm from '@/components/gifts/GiftPersonForm'
import GiftIdeaForm from '@/components/gifts/GiftIdeaForm'
```

- [ ] **Step 2: Add `mutate: mutateGifts` to the gifts SWR call**

Find (around line 132):
```tsx
const { data: giftPeople = [], isLoading: giftsLoading } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
```

Replace with:
```tsx
const { data: giftPeople = [], isLoading: giftsLoading, mutate: mutateGifts } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
```

- [ ] **Step 3: Add gift modal state**

After the trip state lines, add:
```tsx
const [personToEdit, setPersonToEdit] = useState<GiftPerson | null>(null)
const [showAddPerson, setShowAddPerson] = useState(false)
const [addIdeaForPersonId, setAddIdeaForPersonId] = useState<number | null>(null)
```

- [ ] **Step 4: Replace the Gifts widget JSX**

Find the `{/* Gifts */}` block (around line 328). Replace the entire block with:

```tsx
{/* Gifts */}
{show('gifts') && (
  <WidgetCard title="Gifts" action={
    <button onClick={() => setShowAddPerson(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add person</button>
  }>
    {giftsLoading ? (
      <p className="text-sm text-gray-400">Loading…</p>
    ) : giftPeople.length === 0 ? (
      <p className="text-sm text-gray-400">No gift people yet.</p>
    ) : (
      <div className="flex flex-col gap-2">
        {giftPeople.map(p => {
          const bought = p.ideas.filter(i => i.purchased).length
          const total = p.ideas.length
          const committed = p.ideas.filter(i => i.purchased).reduce((s, i) => s + (i.estimatedCost ?? 0), 0)
          return (
            <div key={p.id}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{p.name}</span>
                <span className="text-xs text-gray-500 shrink-0">{bought} / {total} bought</span>
                <button onClick={() => setPersonToEdit(p)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">Edit</button>
                <button onClick={() => setAddIdeaForPersonId(p.id)} className="text-xs text-blue-500 hover:text-blue-600 shrink-0">+ Idea</button>
              </div>
              {p.budget != null && p.budget > 0 && (
                <div className="mt-1">
                  <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                    <span>€{committed.toFixed(0)} / €{p.budget.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (committed / p.budget) * 100).toFixed(0)}%` }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )}
  </WidgetCard>
)}
```

- [ ] **Step 5: Add gift modals before the closing `</div>`**

After the trip modals, add:
```tsx
{showAddPerson && <Modal title="Add person" onClose={() => setShowAddPerson(false)}><GiftPersonForm onSave={() => { setShowAddPerson(false); mutateGifts() }} onCancel={() => setShowAddPerson(false)} /></Modal>}
{personToEdit && <Modal title="Edit person" onClose={() => setPersonToEdit(null)}><GiftPersonForm initial={personToEdit} onSave={() => { setPersonToEdit(null); mutateGifts() }} onCancel={() => setPersonToEdit(null)} /></Modal>}
{addIdeaForPersonId != null && <Modal title="Add gift idea" onClose={() => setAddIdeaForPersonId(null)}><GiftIdeaForm personId={addIdeaForPersonId} onSave={() => { setAddIdeaForPersonId(null); mutateGifts() }} onCancel={() => setAddIdeaForPersonId(null)} /></Modal>}
```

- [ ] **Step 6: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: gifts widget — add person, edit person, add idea from dashboard"
```
