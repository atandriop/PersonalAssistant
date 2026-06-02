# Bucket List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/bucket-list` page with Trips and Experiences tabs, full CRUD, done-tracking with a Travel linkage flag, and a dashboard progress widget.

**Architecture:** Two separate Prisma models (`BucketTrip`, `BucketExperience`). Cities are stored as a JSON string in SQLite and parsed in the API layer. Eight API routes handle CRUD. Five React components plus a page shell make up the UI. The dashboard widget shows two progress bars (trips done / experiences done).

**Tech Stack:** Next.js 14 App Router, Prisma ORM + SQLite (`@prisma/adapter-better-sqlite3`), SWR, Tailwind CSS (dark mode), TypeScript.

---

## File Map

**Create:**
- `src/app/api/bucket-list/trips/route.ts` — GET list + POST create trips
- `src/app/api/bucket-list/trips/[id]/route.ts` — PUT + DELETE trips
- `src/app/api/bucket-list/experiences/route.ts` — GET list + POST create experiences
- `src/app/api/bucket-list/experiences/[id]/route.ts` — PUT + DELETE experiences
- `src/components/bucket-list/TripCard.tsx` — trip card with done toggle, city chips
- `src/components/bucket-list/TripForm.tsx` — create/edit modal with city tag input
- `src/components/bucket-list/ExperienceCard.tsx` — experience card with category badge + done toggle
- `src/components/bucket-list/ExperienceForm.tsx` — create/edit modal for experiences
- `src/components/bucket-list/BucketListPage.tsx` — tab page: SWR, filter pills, card grids, modals
- `src/app/bucket-list/page.tsx` — page shell

**Modify:**
- `prisma/schema.prisma` — append two new models
- `src/types/index.ts` — append two new interfaces
- `src/components/Sidebar.tsx` — add Bucket List nav entry
- `src/components/dashboard/DashboardPage.tsx` — add Bucket List widget

---

### Task 1: Prisma models + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Append models to schema**

Open `prisma/schema.prisma` and add these two models at the very end of the file (after the `Document` model):

```prisma
model BucketTrip {
  id             Int      @id @default(autoincrement())
  destination    String
  cities         String?
  budget         Float?
  targetYear     Int?
  notes          String?
  done           Boolean  @default(false)
  linkedToTravel Boolean  @default(false)
  createdAt      DateTime @default(now())
}

model BucketExperience {
  id         Int      @id @default(autoincrement())
  title      String
  category   String
  notes      String?
  targetYear Int?
  done       Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/than/PersonalAssistant
npx prisma migrate dev --name add_bucket_list
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify**

```bash
npx prisma studio
```

Open the browser and confirm `BucketTrip` and `BucketExperience` tables appear. Close Prisma Studio (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add BucketTrip and BucketExperience prisma models"
```

---

### Task 2: TypeScript interfaces

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append interfaces**

At the very end of `src/types/index.ts`, add:

```typescript
export interface BucketTrip {
  id: number
  destination: string
  cities: string[]        // API parses from JSON string before returning
  budget: number | null
  targetYear: number | null
  notes: string | null
  done: boolean
  linkedToTravel: boolean
  createdAt: string
}

export interface BucketExperience {
  id: number
  title: string
  category: string
  notes: string | null
  targetYear: number | null
  done: boolean
  createdAt: string
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add BucketTrip and BucketExperience TypeScript interfaces"
```

---

### Task 3: Trips API — list and create

**Files:**
- Create: `src/app/api/bucket-list/trips/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const trips = await prisma.bucketTrip.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(
    trips.map(t => ({ ...t, cities: t.cities ? JSON.parse(t.cities) as string[] : [] }))
  )
}

export async function POST(req: Request) {
  const { destination, cities, budget, targetYear, notes } = await req.json()
  if (!destination) {
    return NextResponse.json({ error: 'Missing destination' }, { status: 400 })
  }
  const trip = await prisma.bucketTrip.create({
    data: {
      destination,
      cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
      budget: budget != null ? Number(budget) : null,
      targetYear: targetYear != null ? Number(targetYear) : null,
      notes: notes ?? null,
    },
  })
  return NextResponse.json(
    { ...trip, cities: trip.cities ? JSON.parse(trip.cities) as string[] : [] },
    { status: 201 }
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bucket-list/trips/route.ts
git commit -m "feat: add GET /api/bucket-list/trips and POST /api/bucket-list/trips"
```

---

### Task 4: Trips API — update and delete

**Files:**
- Create: `src/app/api/bucket-list/trips/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { destination, cities, budget, targetYear, notes, done } = await req.json()
  const updateData: {
    destination: string
    cities: string | null
    budget: number | null
    targetYear: number | null
    notes: string | null
    done: boolean
    linkedToTravel?: boolean
  } = {
    destination,
    cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
    budget: budget != null ? Number(budget) : null,
    targetYear: targetYear != null ? Number(targetYear) : null,
    notes: notes ?? null,
    done: done ?? false,
  }
  if (done === true) updateData.linkedToTravel = true
  const trip = await prisma.bucketTrip.update({ where: { id }, data: updateData })
  return NextResponse.json(
    { ...trip, cities: trip.cities ? JSON.parse(trip.cities) as string[] : [] }
  )
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.bucketTrip.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bucket-list/trips/[id]/route.ts
git commit -m "feat: add PUT and DELETE /api/bucket-list/trips/[id]"
```

---

### Task 5: Experiences API — list and create

**Files:**
- Create: `src/app/api/bucket-list/experiences/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const experiences = await prisma.bucketExperience.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(experiences)
}

export async function POST(req: Request) {
  const { title, category, notes, targetYear } = await req.json()
  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }
  const experience = await prisma.bucketExperience.create({
    data: {
      title,
      category: category ?? 'Other',
      notes: notes ?? null,
      targetYear: targetYear != null ? Number(targetYear) : null,
    },
  })
  return NextResponse.json(experience, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bucket-list/experiences/route.ts
git commit -m "feat: add GET /api/bucket-list/experiences and POST /api/bucket-list/experiences"
```

---

### Task 6: Experiences API — update and delete

**Files:**
- Create: `src/app/api/bucket-list/experiences/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, category, notes, targetYear, done } = await req.json()
  const experience = await prisma.bucketExperience.update({
    where: { id: Number(params.id) },
    data: {
      title,
      category,
      notes: notes ?? null,
      targetYear: targetYear != null ? Number(targetYear) : null,
      done: done ?? false,
    },
  })
  return NextResponse.json(experience)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.bucketExperience.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bucket-list/experiences/[id]/route.ts
git commit -m "feat: add PUT and DELETE /api/bucket-list/experiences/[id]"
```

---

### Task 7: TripCard component

**Files:**
- Create: `src/components/bucket-list/TripCard.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import type { BucketTrip } from '@/types'

export default function TripCard({ trip, onToggleDone, onClick }: {
  trip: BucketTrip
  onToggleDone: () => void
  onClick: () => void
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
        trip.done
          ? 'border-green-300 dark:border-green-700 opacity-50'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-base font-semibold text-gray-900 dark:text-white ${trip.done ? 'line-through' : ''}`}>
          {trip.destination}
        </h3>
        <button
          onClick={e => { e.stopPropagation(); onToggleDone() }}
          title={trip.done ? 'Mark not done' : 'Mark done'}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
            trip.done
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          }`}
        />
      </div>
      {trip.cities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {trip.cities.map(city => (
            <span
              key={city}
              className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full"
            >
              {city}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {trip.targetYear && <span>{trip.targetYear}</span>}
        {trip.budget != null && <span>€{trip.budget.toLocaleString()}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/bucket-list/TripCard.tsx
git commit -m "feat: add TripCard component"
```

---

### Task 8: TripForm component

**Files:**
- Create: `src/components/bucket-list/TripForm.tsx`

The form uses a city tag input: the user types a city name and presses Enter (or comma) to add it as a chip. Each chip has an × button to remove it. On submit, any text still in the input field is flushed into the cities array before the API call.

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useState } from 'react'
import type { BucketTrip } from '@/types'

export default function TripForm({ initial, onSave, onCancel }: {
  initial?: BucketTrip
  onSave: () => void
  onCancel: () => void
}) {
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [cities, setCities] = useState<string[]>(initial?.cities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [budget, setBudget] = useState(initial?.budget != null ? String(initial.budget) : '')
  const [targetYear, setTargetYear] = useState(initial?.targetYear != null ? String(initial.targetYear) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  function addCity(value: string) {
    const trimmed = value.trim().replace(/,+$/, '')
    if (trimmed && !cities.includes(trimmed)) {
      setCities(prev => [...prev, trimmed])
    }
    setCityInput('')
  }

  function handleCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCity(cityInput)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!destination.trim()) return
    // Flush any pending city input synchronously before reading cities state
    const pendingCity = cityInput.trim().replace(/,+$/, '')
    const finalCities = pendingCity && !cities.includes(pendingCity)
      ? [...cities, pendingCity]
      : cities
    setSaving(true)
    const body = {
      destination: destination.trim(),
      cities: finalCities,
      budget: budget !== '' ? Number(budget) : null,
      targetYear: targetYear !== '' ? Number(targetYear) : null,
      notes: notes.trim() || null,
    }
    if (initial) {
      await fetch(`/api/bucket-list/trips/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, done: initial.done }),
      })
    } else {
      await fetch('/api/bucket-list/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm(`Delete "${initial.destination}"?`)) return
    await fetch(`/api/bucket-list/trips/${initial.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Trip' : 'Add Trip'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Destination *
            </label>
            <input
              value={destination}
              onChange={e => setDestination(e.target.value)}
              required
              placeholder="e.g. Japan"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cities / Stops
            </label>
            <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[2.5rem]">
              {cities.map(city => (
                <span
                  key={city}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                >
                  {city}
                  <button
                    type="button"
                    onClick={() => setCities(prev => prev.filter(c => c !== city))}
                    className="hover:text-blue-900 dark:hover:text-blue-200 leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={handleCityKeyDown}
                onBlur={() => addCity(cityInput)}
                placeholder={cities.length === 0 ? 'Type a city, press Enter' : ''}
                className="flex-1 min-w-[8rem] outline-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget (€)
              </label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Year
              </label>
              <input
                type="number"
                min="2024"
                max="2100"
                value={targetYear}
                onChange={e => setTargetYear(e.target.value)}
                placeholder="e.g. 2027"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>
          <div className="flex justify-between pt-2">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/bucket-list/TripForm.tsx
git commit -m "feat: add TripForm modal with city tag input"
```

---

### Task 9: ExperienceCard component

**Files:**
- Create: `src/components/bucket-list/ExperienceCard.tsx`

`EXPERIENCE_CATEGORY_COLOR` is exported so `BucketListPage` and the dashboard can reuse the badge colours without re-declaring the map.

- [ ] **Step 1: Create the file**

```typescript
'use client'

import type { BucketExperience } from '@/types'

export const EXPERIENCE_CATEGORY_COLOR: Record<string, string> = {
  Adventure:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Learning:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Career:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Relationships: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Health:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Creative:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Other:         'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default function ExperienceCard({ experience, onToggleDone, onClick }: {
  experience: BucketExperience
  onToggleDone: () => void
  onClick: () => void
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
        experience.done ? 'opacity-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-base font-semibold text-gray-900 dark:text-white ${experience.done ? 'line-through' : ''}`}>
          {experience.title}
        </h3>
        <button
          onClick={e => { e.stopPropagation(); onToggleDone() }}
          title={experience.done ? 'Mark not done' : 'Mark done'}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
            experience.done
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          }`}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${EXPERIENCE_CATEGORY_COLOR[experience.category] ?? EXPERIENCE_CATEGORY_COLOR.Other}`}>
          {experience.category}
        </span>
        {experience.targetYear && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{experience.targetYear}</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/bucket-list/ExperienceCard.tsx
git commit -m "feat: add ExperienceCard component with category badge"
```

---

### Task 10: ExperienceForm component

**Files:**
- Create: `src/components/bucket-list/ExperienceForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useState } from 'react'
import type { BucketExperience } from '@/types'

const CATEGORIES = ['Adventure', 'Learning', 'Career', 'Relationships', 'Health', 'Creative', 'Other']

export default function ExperienceForm({ initial, onSave, onCancel }: {
  initial?: BucketExperience
  onSave: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [targetYear, setTargetYear] = useState(initial?.targetYear != null ? String(initial.targetYear) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const body = {
      title: title.trim(),
      category,
      targetYear: targetYear !== '' ? Number(targetYear) : null,
      notes: notes.trim() || null,
    }
    if (initial) {
      await fetch(`/api/bucket-list/experiences/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, done: initial.done }),
      })
    } else {
      await fetch('/api/bucket-list/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm(`Delete "${initial.title}"?`)) return
    await fetch(`/api/bucket-list/experiences/${initial.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Experience' : 'Add Experience'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Run a marathon"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Year
            </label>
            <input
              type="number"
              min="2024"
              max="2100"
              value={targetYear}
              onChange={e => setTargetYear(e.target.value)}
              placeholder="e.g. 2027"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>
          <div className="flex justify-between pt-2">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/bucket-list/ExperienceForm.tsx
git commit -m "feat: add ExperienceForm modal"
```

---

### Task 11: BucketListPage, page shell, and sidebar entry

**Files:**
- Create: `src/components/bucket-list/BucketListPage.tsx`
- Create: `src/app/bucket-list/page.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create BucketListPage**

```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { BucketTrip, BucketExperience } from '@/types'
import TripCard from './TripCard'
import TripForm from './TripForm'
import ExperienceCard from './ExperienceCard'
import ExperienceForm from './ExperienceForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TRIP_FILTERS = ['All', 'Not Done', 'Done']
const EXP_STATUS_FILTERS = ['All', 'Not Done', 'Done']
const EXP_CATEGORY_FILTERS = ['Adventure', 'Learning', 'Career', 'Relationships', 'Health', 'Creative', 'Other']

export default function BucketListPage() {
  const { data: trips = [], mutate: mutateTrips } = useSWR<BucketTrip[]>('/api/bucket-list/trips', fetcher)
  const { data: experiences = [], mutate: mutateExperiences } = useSWR<BucketExperience[]>('/api/bucket-list/experiences', fetcher)

  const [tab, setTab] = useState<'trips' | 'experiences'>('trips')
  const [tripFilter, setTripFilter] = useState('All')
  const [expFilter, setExpFilter] = useState('All')
  const [addingTrip, setAddingTrip] = useState(false)
  const [addingExperience, setAddingExperience] = useState(false)
  const [editTrip, setEditTrip] = useState<BucketTrip | null>(null)
  const [editExperience, setEditExperience] = useState<BucketExperience | null>(null)

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
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: trip.destination,
        cities: trip.cities,
        budget: trip.budget,
        targetYear: trip.targetYear,
        notes: trip.notes,
        done: !trip.done,
      }),
    })
    mutateTrips()
  }

  async function toggleExperienceDone(experience: BucketExperience) {
    await fetch(`/api/bucket-list/experiences/${experience.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: experience.title,
        category: experience.category,
        notes: experience.notes,
        targetYear: experience.targetYear,
        done: !experience.done,
      }),
    })
    mutateExperiences()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bucket List</h1>
        <button
          onClick={() => tab === 'trips' ? setAddingTrip(true) : setAddingExperience(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          {tab === 'trips' ? '+ Add Trip' : '+ Add Experience'}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['trips', 'experiences'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t === 'trips' ? `Trips (${trips.length})` : `Experiences (${experiences.length})`}
          </button>
        ))}
      </div>

      {/* Trips tab */}
      {tab === 'trips' && (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {TRIP_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTripFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  tripFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filteredTrips.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {tripFilter === 'All'
                ? 'No trips yet. Click "+ Add Trip" to add your first.'
                : `No ${tripFilter.toLowerCase()} trips.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(t => (
                <TripCard
                  key={t.id}
                  trip={t}
                  onToggleDone={() => toggleTripDone(t)}
                  onClick={() => setEditTrip(t)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Experiences tab */}
      {tab === 'experiences' && (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {[...EXP_STATUS_FILTERS, ...EXP_CATEGORY_FILTERS].map(f => (
              <button
                key={f}
                onClick={() => setExpFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  expFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filteredExperiences.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {expFilter === 'All'
                ? 'No experiences yet. Click "+ Add Experience" to add your first.'
                : `No ${expFilter} experiences.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExperiences.map(e => (
                <ExperienceCard
                  key={e.id}
                  experience={e}
                  onToggleDone={() => toggleExperienceDone(e)}
                  onClick={() => setEditExperience(e)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {addingTrip && (
        <TripForm
          onSave={() => { mutateTrips(); setAddingTrip(false) }}
          onCancel={() => setAddingTrip(false)}
        />
      )}
      {addingExperience && (
        <ExperienceForm
          onSave={() => { mutateExperiences(); setAddingExperience(false) }}
          onCancel={() => setAddingExperience(false)}
        />
      )}
      {editTrip && (
        <TripForm
          initial={editTrip}
          onSave={() => { mutateTrips(); setEditTrip(null) }}
          onCancel={() => setEditTrip(null)}
        />
      )}
      {editExperience && (
        <ExperienceForm
          initial={editExperience}
          onSave={() => { mutateExperiences(); setEditExperience(null) }}
          onCancel={() => setEditExperience(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create page shell**

Create `src/app/bucket-list/page.tsx`:

```typescript
import BucketListPage from '@/components/bucket-list/BucketListPage'

export default function Page() {
  return <BucketListPage />
}
```

- [ ] **Step 3: Add sidebar entry**

In `src/components/Sidebar.tsx`, find the line:
```typescript
  { href: '/documents', label: 'Documents', active: true },
```

Add the Bucket List entry immediately after it:
```typescript
  { href: '/documents', label: 'Documents', active: true },
  { href: '/bucket-list', label: 'Bucket List', active: true },
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/bucket-list/BucketListPage.tsx src/app/bucket-list/page.tsx src/components/Sidebar.tsx
git commit -m "feat: add BucketListPage, page shell, and sidebar entry"
```

---

### Task 12: Dashboard widget

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

The existing file at line 7 imports types and at lines 107–112 calls `useSWR`. The existing variable `today` at line 153 is a string — avoid re-using that name. The new widget goes after the existing "Expiring Documents" widget (currently the last widget in the grid).

- [ ] **Step 1: Add types import**

In `src/components/dashboard/DashboardPage.tsx`, find line 7:
```typescript
import type { Habit, LifeArea, GiftPerson, Appointment, Document } from '@/types'
```

Replace with:
```typescript
import type { Habit, LifeArea, GiftPerson, Appointment, Document, BucketTrip, BucketExperience } from '@/types'
```

- [ ] **Step 2: Add SWR fetches**

Find the block of `useSWR` calls (lines ~107–112). After the line:
```typescript
  const { data: allDocs = [], isLoading: docsLoading } = useSWR<Document[]>('/api/documents', fetcher)
```

Add:
```typescript
  const { data: bucketTrips = [], isLoading: tripsLoading } = useSWR<BucketTrip[]>('/api/bucket-list/trips', fetcher)
  const { data: bucketExperiences = [], isLoading: experiencesLoading } = useSWR<BucketExperience[]>('/api/bucket-list/experiences', fetcher)
```

- [ ] **Step 3: Add the widget**

Find the closing `</WidgetCard>` tag of the "Expiring Documents" widget, followed by `</div>` (closing the grid) and `</div>` (closing the outer div). Insert the new widget between the Expiring Documents `</WidgetCard>` and the grid's closing `</div>`:

```tsx
        {/* Bucket List */}
        <WidgetCard title="Bucket List">
          {tripsLoading || experiencesLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : bucketTrips.length === 0 && bucketExperiences.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing on your bucket list yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <a href="/bucket-list" className="flex flex-col gap-1 hover:opacity-80">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-0.5">
                  <span>Trips</span>
                  <span className="text-xs text-gray-400">
                    {bucketTrips.filter(t => t.done).length} / {bucketTrips.length} done
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: bucketTrips.length === 0
                        ? '0%'
                        : `${Math.round((bucketTrips.filter(t => t.done).length / bucketTrips.length) * 100)}%`
                    }}
                  />
                </div>
              </a>
              <a href="/bucket-list" className="flex flex-col gap-1 hover:opacity-80">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-0.5">
                  <span>Experiences</span>
                  <span className="text-xs text-gray-400">
                    {bucketExperiences.filter(e => e.done).length} / {bucketExperiences.length} done
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: bucketExperiences.length === 0
                        ? '0%'
                        : `${Math.round((bucketExperiences.filter(e => e.done).length / bucketExperiences.length) * 100)}%`
                    }}
                  />
                </div>
              </a>
            </div>
          )}
        </WidgetCard>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add Bucket List dashboard widget with trip and experience progress bars"
```
