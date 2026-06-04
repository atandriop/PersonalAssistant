# Trip Cost Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `actualCost` field on travel trips with per-category line items (hotel, airfare, food/drinks, shopping/entertainment), where food and entertainment items can optionally create or link to a Memory record.

**Architecture:** A new `TripCostLine` Prisma model stores individual cost entries per trip. The existing `TravelTrip.actualCost` column is kept as a denormalized sum, recomputed by the API on every save, so `CostsTab` and `BulkEditor` need no changes. A new `CostBreakdown` React component handles the breakdown UI inside `TripForm`.

**Tech Stack:** Next.js 14 App Router, Prisma + SQLite, TypeScript, Tailwind CSS, SWR, React 18

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Modify | `src/types/index.ts` |
| Modify | `src/app/api/travel/trips/route.ts` |
| Modify | `src/app/api/travel/trips/[id]/route.ts` |
| **Create** | `src/components/travel/CostBreakdown.tsx` |
| Modify | `src/components/travel/TripForm.tsx` |
| Modify | `src/components/travel/TripCard.tsx` |

---

## Task 1: Schema — Add TripCostLine model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the TripCostLine model and relations**

Open `prisma/schema.prisma`. At the end of the file, add:

```prisma
model TripCostLine {
  id        Int        @id @default(autoincrement())
  tripId    Int
  trip      TravelTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  category  String
  amount    Float
  label     String?
  memoryId  Int?
  memory    Memory?    @relation(fields: [memoryId], references: [id], onDelete: SetNull)
  createdAt DateTime   @default(now())
}
```

Then update `TravelTrip` to add the relation (find the `model TravelTrip` block and add one line):

```prisma
model TravelTrip {
  id           Int           @id @default(autoincrement())
  countryId    Int
  country      TravelCountry @relation(fields: [countryId], references: [id], onDelete: Cascade)
  cities       String?
  startDate    String?
  endDate      String?
  actualCost   Float?
  rating       Int?
  notes        String?
  bucketTripId Int?
  memories     MemoryTrip[]
  costLines    TripCostLine[]   // ADD THIS LINE
  createdAt    DateTime      @default(now())
}
```

And update `Memory` to add the back-relation (find the `model Memory` block):

```prisma
model Memory {
  id        Int          @id @default(autoincrement())
  title     String
  date      String
  endDate   String?
  category  String
  location  String?
  notes     String?
  tags      String       @default("")
  trips     MemoryTrip[]
  costLines TripCostLine[]   // ADD THIS LINE
  createdAt DateTime     @default(now())
}
```

- [ ] **Step 2: Run the migration**

```bash
cd /home/than/PersonalAssistant
npx prisma migrate dev --name add_trip_cost_lines
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify migration file exists**

```bash
ls prisma/migrations/ | tail -3
```

Expected: a new `20260604_add_trip_cost_lines` folder appears.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add TripCostLine schema"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add TripCostLine interface and update TravelTrip**

Open `src/types/index.ts`. Add the `TripCostLine` interface (place it just before `TravelTrip`):

```ts
export interface TripCostLine {
  id: number
  category: 'hotel' | 'airfare' | 'food' | 'entertainment'
  amount: number
  label: string | null
  memoryId: number | null
}
```

Then update the `TravelTrip` interface to add `costLines`:

```ts
export interface TravelTrip {
  id: number
  countryId: number
  countryName: string
  cities: string[]
  startDate: string | null
  endDate: string | null
  actualCost: number | null
  rating: number | null
  notes: string | null
  bucketTripId: number | null
  memories: { id: number; title: string; date: string }[]
  costLines: TripCostLine[]   // ADD THIS LINE
  createdAt: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TripCostLine type, update TravelTrip"
```

---

## Task 3: Update trips API — GET and POST

**Files:**
- Modify: `src/app/api/travel/trips/route.ts`

- [ ] **Step 1: Update serializeTrip to include costLines**

Open `src/app/api/travel/trips/route.ts`. Replace the entire `serializeTrip` function and its type with:

```ts
function serializeTrip(trip: {
  id: number; countryId: number; cities: string | null
  startDate: string | null; endDate: string | null
  actualCost: number | null; rating: number | null
  notes: string | null; bucketTripId: number | null; createdAt: Date
  country: { name: string }
  memories: { memory: { id: number; title: string; date: string } }[]
  costLines: { id: number; category: string; amount: number; label: string | null; memoryId: number | null }[]
}) {
  const { country, cities, memories, costLines, ...rest } = trip
  const linesTotal = costLines.length > 0
    ? costLines.reduce((s, l) => s + l.amount, 0)
    : null
  return {
    ...rest,
    countryName: country.name,
    cities: cities ? JSON.parse(cities) as string[] : [],
    memories: memories.map(mt => ({
      id: mt.memory.id,
      title: mt.memory.title,
      date: mt.memory.date,
    })),
    costLines: costLines.map(l => ({
      id: l.id,
      category: l.category as 'hotel' | 'airfare' | 'food' | 'entertainment',
      amount: l.amount,
      label: l.label,
      memoryId: l.memoryId,
    })),
    actualCost: linesTotal ?? trip.actualCost,
    createdAt: trip.createdAt.toISOString(),
  }
}
```

- [ ] **Step 2: Add costLines to the GET include**

In the `GET` handler, update the `prisma.travelTrip.findMany` call to include costLines:

```ts
export async function GET() {
  const raw = await prisma.travelTrip.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      country: { select: { name: true } },
      memories: {
        include: {
          memory: { select: { id: true, title: true, date: true } },
        },
      },
      costLines: {
        select: { id: true, category: true, amount: true, label: true, memoryId: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  raw.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0
    if (!a.startDate) return -1
    if (!b.startDate) return 1
    return b.startDate.localeCompare(a.startDate)
  })
  return NextResponse.json(raw.map(serializeTrip))
}
```

- [ ] **Step 3: Update POST to handle costLines**

Replace the `POST` handler with:

```ts
interface CostLineInput {
  category: string
  amount: number
  label?: string
  memoryId?: number | null
  newMemory?: { title: string; date: string; category: string; location?: string | null }
}

export async function POST(req: Request) {
  const { countryId, countryName, cities, startDate, endDate, actualCost, rating, notes, bucketTripId, costLines } = await req.json()

  let resolvedCountryId: number | undefined = countryId ? Number(countryId) : undefined
  if (!resolvedCountryId && countryName?.trim()) {
    const country = await prisma.travelCountry.upsert({
      where: { name: countryName.trim() },
      update: {},
      create: { name: countryName.trim() },
    })
    resolvedCountryId = country.id
  }
  if (!resolvedCountryId) return NextResponse.json({ error: 'Missing country' }, { status: 400 })

  // Resolve actualCost from costLines if provided
  let computedCost: number | null = actualCost != null ? Number(actualCost) : null
  let resolvedLines: { category: string; amount: number; label: string | null; memoryId: number | null }[] = []

  if (Array.isArray(costLines)) {
    resolvedLines = await Promise.all((costLines as CostLineInput[]).map(async (line) => {
      let memId = line.memoryId ?? null
      if (line.newMemory && !memId) {
        const mem = await prisma.memory.create({
          data: {
            title: line.newMemory.title,
            date: line.newMemory.date,
            endDate: null,
            category: line.newMemory.category,
            location: line.newMemory.location ?? null,
            notes: null,
            tags: '',
          },
        })
        memId = mem.id
      }
      return { category: line.category, amount: line.amount, label: line.label ?? null, memoryId: memId }
    }))
    computedCost = resolvedLines.length > 0
      ? resolvedLines.reduce((s, l) => s + l.amount, 0)
      : null
  }

  const trip = await prisma.travelTrip.create({
    data: {
      countryId: resolvedCountryId,
      cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      actualCost: computedCost,
      rating: rating != null ? Number(rating) : null,
      notes: notes ?? null,
      bucketTripId: bucketTripId ?? null,
      costLines: resolvedLines.length > 0
        ? { createMany: { data: resolvedLines } }
        : undefined,
    },
    include: {
      country: { select: { name: true } },
      memories: {
        include: {
          memory: { select: { id: true, title: true, date: true } },
        },
      },
      costLines: {
        select: { id: true, category: true, amount: true, label: true, memoryId: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  return NextResponse.json(serializeTrip(trip), { status: 201 })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/travel/trips/route.ts
git commit -m "feat: include costLines in trips GET, handle in POST"
```

---

## Task 4: Update trips API — PUT

**Files:**
- Modify: `src/app/api/travel/trips/[id]/route.ts`

- [ ] **Step 1: Copy the CostLineInput interface and serializeTrip update**

Open `src/app/api/travel/trips/[id]/route.ts`. Replace the existing `serializeTrip` function with the same updated version from Task 3 (copy exactly):

```ts
function serializeTrip(trip: {
  id: number; countryId: number; cities: string | null
  startDate: string | null; endDate: string | null
  actualCost: number | null; rating: number | null
  notes: string | null; bucketTripId: number | null; createdAt: Date
  country: { name: string }
  memories: { memory: { id: number; title: string; date: string } }[]
  costLines: { id: number; category: string; amount: number; label: string | null; memoryId: number | null }[]
}) {
  const { country, cities, memories, costLines, ...rest } = trip
  const linesTotal = costLines.length > 0
    ? costLines.reduce((s, l) => s + l.amount, 0)
    : null
  return {
    ...rest,
    countryName: country.name,
    cities: cities ? JSON.parse(cities) as string[] : [],
    memories: memories.map(mt => ({
      id: mt.memory.id,
      title: mt.memory.title,
      date: mt.memory.date,
    })),
    costLines: costLines.map(l => ({
      id: l.id,
      category: l.category as 'hotel' | 'airfare' | 'food' | 'entertainment',
      amount: l.amount,
      label: l.label,
      memoryId: l.memoryId,
    })),
    actualCost: linesTotal ?? trip.actualCost,
    createdAt: trip.createdAt.toISOString(),
  }
}
```

- [ ] **Step 2: Update the MEMORIES_INCLUDE constant to add costLines**

Replace the existing `MEMORIES_INCLUDE` constant with:

```ts
const TRIP_INCLUDE = {
  country: { select: { name: true } },
  memories: {
    include: {
      memory: { select: { id: true, title: true, date: true } },
    },
  },
  costLines: {
    select: { id: true, category: true, amount: true, label: true, memoryId: true },
    orderBy: { createdAt: 'asc' } as const,
  },
} as const
```

- [ ] **Step 3: Replace the PUT handler**

Replace the entire `PUT` handler with:

```ts
interface CostLineInput {
  category: string
  amount: number
  label?: string
  memoryId?: number | null
  newMemory?: { title: string; date: string; category: string; location?: string | null }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { countryId, countryName, cities, startDate, endDate, actualCost, rating, notes, costLines } = await req.json()

  let resolvedCountryId: number | undefined = countryId ? Number(countryId) : undefined
  if (!resolvedCountryId && countryName?.trim()) {
    const country = await prisma.travelCountry.upsert({
      where: { name: countryName.trim() },
      update: {},
      create: { name: countryName.trim() },
    })
    resolvedCountryId = country.id
  }

  // Handle cost lines if provided
  let computedCost: number | null = actualCost != null ? Number(actualCost) : null

  if (Array.isArray(costLines)) {
    const resolvedLines = await Promise.all((costLines as CostLineInput[]).map(async (line) => {
      let memId = line.memoryId ?? null
      if (line.newMemory && !memId) {
        const mem = await prisma.memory.create({
          data: {
            title: line.newMemory.title,
            date: line.newMemory.date,
            endDate: null,
            category: line.newMemory.category,
            location: line.newMemory.location ?? null,
            notes: null,
            tags: '',
          },
        })
        memId = mem.id
      }
      return { category: line.category, amount: line.amount, label: line.label ?? null, memoryId: memId }
    }))

    // Replace all existing cost lines
    await prisma.tripCostLine.deleteMany({ where: { tripId: id } })
    if (resolvedLines.length > 0) {
      await prisma.tripCostLine.createMany({
        data: resolvedLines.map(l => ({ tripId: id, ...l })),
      })
    }

    computedCost = resolvedLines.length > 0
      ? resolvedLines.reduce((s, l) => s + l.amount, 0)
      : null
  }

  const trip = await prisma.travelTrip.update({
    where: { id },
    data: {
      ...(resolvedCountryId !== undefined ? { countryId: resolvedCountryId } : {}),
      cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      actualCost: computedCost,
      rating: rating != null ? Number(rating) : null,
      notes: notes ?? null,
    },
    include: TRIP_INCLUDE,
  })
  return NextResponse.json(serializeTrip(trip))
}
```

- [ ] **Step 4: Update the DELETE handler to use TRIP_INCLUDE** (no change needed — it doesn't return trip data)

The DELETE handler is unchanged:
```ts
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.travelTrip.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/travel/trips/[id]/route.ts
git commit -m "feat: handle costLines in trips PUT, create inline memories"
```

---

## Task 5: Create CostBreakdown component

**Files:**
- Create: `src/components/travel/CostBreakdown.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/travel/CostBreakdown.tsx` with the full content below.

This component:
- Receives `initialLines: TripCostLine[]` (from the trip being edited, or `[]` for new trips)
- Calls `onChange(payload)` every time lines change — TripForm stores the payload and sends it on submit
- Renders four sections: Hotel, Airfare, Food/Drinks, Shopping/Entertainment
- Hotel and Airfare always start with at least 1 row; food/entertainment start empty
- Each food/entertainment row has a "Link memory" button that opens an inline panel with two tabs: "Pick existing" (searchable) or "Create new" (mini form)

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import type { Memory, TripCostLine } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Category = 'hotel' | 'airfare' | 'food' | 'entertainment'

const CATEGORY_LABELS: Record<Category, string> = {
  hotel: 'Hotel',
  airfare: 'Airfare',
  food: 'Food / Drinks',
  entertainment: 'Shopping / Entertainment',
}

const MEMORY_CATEGORIES = ['Career', 'Education', 'Travel', 'Personal', 'Other']

interface NewMemoryDraft {
  title: string
  date: string
  category: string
  location: string
}

interface LineState {
  key: string
  category: Category
  amount: string
  label: string
  memoryId: number | null
  newMemory: NewMemoryDraft | null
  showPanel: boolean
  panelTab: 'existing' | 'new'
}

export interface CostLinePayload {
  category: Category
  amount: number
  label: string | null
  memoryId: number | null
  newMemory: { title: string; date: string; category: string; location: string | null } | null
}

let keyCounter = 0
function newKey() { return String(++keyCounter) }

function blankLine(cat: Category): LineState {
  return {
    key: newKey(),
    category: cat,
    amount: '',
    label: '',
    memoryId: null,
    newMemory: null,
    showPanel: false,
    panelTab: 'existing',
  }
}

const BLANK_DRAFT: NewMemoryDraft = { title: '', date: '', category: 'Personal', location: '' }

interface Props {
  initialLines: TripCostLine[]
  onChange: (lines: CostLinePayload[]) => void
}

export default function CostBreakdown({ initialLines, onChange }: Props) {
  const { data: memories = [] } = useSWR<Memory[]>('/api/memories', fetcher)
  const [memorySearch, setMemorySearch] = useState('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [lines, setLines] = useState<LineState[]>(() => {
    const fromDB: LineState[] = initialLines.map(l => ({
      key: newKey(),
      category: l.category,
      amount: l.amount > 0 ? String(l.amount) : '',
      label: l.label ?? '',
      memoryId: l.memoryId,
      newMemory: null,
      showPanel: false,
      panelTab: 'existing' as const,
    }))
    const hasHotel = fromDB.some(l => l.category === 'hotel')
    const hasAirfare = fromDB.some(l => l.category === 'airfare')
    return [
      ...(hasHotel ? [] : [blankLine('hotel')]),
      ...(hasAirfare ? [] : [blankLine('airfare')]),
      ...fromDB,
    ]
  })

  useEffect(() => {
    const payload: CostLinePayload[] = lines
      .filter(l => l.amount !== '' && Number(l.amount) > 0)
      .map(l => ({
        category: l.category,
        amount: Number(l.amount),
        label: l.label.trim() || null,
        memoryId: l.newMemory ? null : l.memoryId,
        newMemory: l.newMemory
          ? {
              title: l.newMemory.title,
              date: l.newMemory.date,
              category: l.newMemory.category,
              location: l.newMemory.location || null,
            }
          : null,
      }))
    onChangeRef.current(payload)
  }, [lines])

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))
  }

  function removeLine(key: string) {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  function addLine(cat: Category) {
    setLines(prev => [...prev, blankLine(cat)])
  }

  function togglePanel(key: string) {
    setMemorySearch('')
    setLines(prev => prev.map(l =>
      l.key === key
        ? { ...l, showPanel: !l.showPanel }
        : { ...l, showPanel: false }
    ))
  }

  function linkExisting(key: string, memoryId: number) {
    updateLine(key, { memoryId, newMemory: null, showPanel: false })
  }

  function unlinkMemory(key: string) {
    updateLine(key, { memoryId: null, newMemory: null })
  }

  function updateDraft(key: string, patch: Partial<NewMemoryDraft>, line: LineState) {
    updateLine(key, { newMemory: { ...(line.newMemory ?? BLANK_DRAFT), ...patch } })
  }

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0)

  const inp = 'px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
  const inpSm = 'px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  const categories: Category[] = ['hotel', 'airfare', 'food', 'entertainment']

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Costs</p>

      {categories.map(cat => {
        const catLines = lines.filter(l => l.category === cat)
        const isSimple = cat === 'hotel' || cat === 'airfare'

        return (
          <div key={cat} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {CATEGORY_LABELS[cat]}
            </p>

            {catLines.map(line => {
              const linkedMemory = line.memoryId ? memories.find(m => m.id === line.memoryId) : null
              const hasLink = !!(linkedMemory || line.newMemory)

              return (
                <div key={line.key} className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="€"
                      value={line.amount}
                      onChange={e => updateLine(line.key, { amount: e.target.value })}
                      className={`w-24 ${inp}`}
                    />
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={line.label}
                      onChange={e => updateLine(line.key, { label: e.target.value })}
                      className={`flex-1 ${inp}`}
                    />
                    {!isSimple && (
                      <button
                        type="button"
                        onClick={() => togglePanel(line.key)}
                        className={`text-xs px-2 py-1.5 rounded-lg border whitespace-nowrap ${
                          hasLink
                            ? 'border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {hasLink
                          ? (linkedMemory
                              ? linkedMemory.title.slice(0, 18)
                              : (line.newMemory?.title ? line.newMemory.title.slice(0, 18) : 'New memory'))
                          : '+ Memory'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      title="Remove row"
                      className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500 text-xl leading-none shrink-0"
                    >
                      ×
                    </button>
                  </div>

                  {line.showPanel && (
                    <div className="ml-2 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        {(['existing', 'new'] as const).map(tab => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => updateLine(line.key, { panelTab: tab })}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                              line.panelTab === tab
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {tab === 'existing' ? 'Pick existing' : 'Create new'}
                          </button>
                        ))}
                        {hasLink && (
                          <button
                            type="button"
                            onClick={() => unlinkMemory(line.key)}
                            className="ml-auto text-xs text-red-400 hover:text-red-600"
                          >
                            Remove link
                          </button>
                        )}
                      </div>

                      {line.panelTab === 'existing' ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Search memories…"
                            value={memorySearch}
                            onChange={e => setMemorySearch(e.target.value)}
                            className={`w-full ${inpSm}`}
                          />
                          <div className="max-h-32 overflow-y-auto flex flex-col">
                            {memories
                              .filter(m => m.title.toLowerCase().includes(memorySearch.toLowerCase()))
                              .slice(0, 20)
                              .map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => linkExisting(line.key, m.id)}
                                  className={`text-left text-xs px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-700 flex justify-between gap-2 ${
                                    line.memoryId === m.id
                                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <span>{m.title}</span>
                                  <span className="text-gray-400 shrink-0">{m.date}</span>
                                </button>
                              ))}
                            {memories.length === 0 && (
                              <p className="text-xs text-gray-400 px-2 py-1">No memories yet.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Title *"
                            value={line.newMemory?.title ?? ''}
                            onChange={e => updateDraft(line.key, { title: e.target.value }, line)}
                            className={`w-full ${inpSm}`}
                          />
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={line.newMemory?.date ?? ''}
                              onChange={e => updateDraft(line.key, { date: e.target.value }, line)}
                              className={`flex-1 ${inpSm}`}
                            />
                            <select
                              value={line.newMemory?.category ?? 'Personal'}
                              onChange={e => updateDraft(line.key, { category: e.target.value }, line)}
                              className={`flex-1 ${inpSm}`}
                            >
                              {MEMORY_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder="Location (optional)"
                            value={line.newMemory?.location ?? ''}
                            onChange={e => updateDraft(line.key, { location: e.target.value }, line)}
                            className={`w-full ${inpSm}`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => addLine(cat)}
              className="text-xs text-blue-500 hover:text-blue-600 self-start"
            >
              + Add {isSimple ? 'line' : 'item'}
            </button>
          </div>
        )
      })}

      {total > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            €{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/travel/CostBreakdown.tsx
git commit -m "feat: add CostBreakdown component with memory link panel"
```

---

## Task 6: Update TripForm to use CostBreakdown

**Files:**
- Modify: `src/components/travel/TripForm.tsx`

- [ ] **Step 1: Add import and remove actualCost state**

Open `src/components/travel/TripForm.tsx`. At the top, add the import:

```ts
import CostBreakdown, { type CostLinePayload } from './CostBreakdown'
```

In the component body, remove the `actualCost` state:
```ts
// DELETE this line:
const [actualCost, setActualCost] = useState(initial?.actualCost != null ? String(initial.actualCost) : '')
```

Add `costLines` state in its place:
```ts
const [costLines, setCostLines] = useState<CostLinePayload[]>([])
```

- [ ] **Step 2: Update handleSubmit to send costLines**

In `handleSubmit`, find the `body` object. Replace the `actualCost` field with `costLines` (or fall back to the existing `actualCost` when the user hasn't entered any line amounts, to avoid erasing legacy cost data):

```ts
// BEFORE:
const body = {
  ...(existing ? { countryId: existing.id } : { countryName: countryName.trim() }),
  cities: finalCities,
  startDate: startDate || null,
  endDate: endDate || null,
  actualCost: actualCost !== '' ? Number(actualCost) : null,
  rating,
  notes: notes.trim() || null,
}

// AFTER:
const body = {
  ...(existing ? { countryId: existing.id } : { countryName: countryName.trim() }),
  cities: finalCities,
  startDate: startDate || null,
  endDate: endDate || null,
  // If user entered at least one cost line, send lines (API will compute actualCost from them).
  // If no lines entered (blank form), fall back to preserving the trip's existing actualCost
  // so old single-field cost data isn't silently erased.
  ...(costLines.length > 0
    ? { costLines }
    : { actualCost: initial?.actualCost ?? null }),
  rating,
  notes: notes.trim() || null,
}
```

- [ ] **Step 3: Replace the Actual Cost input with CostBreakdown**

In the JSX, find the "Actual Cost" section:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Cost (€)</label>
  <input type="number" min="0" value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0"
    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
</div>
```

Replace it with:

```tsx
<CostBreakdown
  initialLines={initial?.costLines ?? []}
  onChange={setCostLines}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/travel/TripForm.tsx
git commit -m "feat: replace actualCost input with CostBreakdown in TripForm"
```

---

## Task 7: Update TripCard to show breakdown

**Files:**
- Modify: `src/components/travel/TripCard.tsx`

- [ ] **Step 1: Add breakdown row below the cost display**

Open `src/components/travel/TripCard.tsx`. Add these constants and computed value near the top of the component body (just after `const isDraft = !trip.startDate`):

```tsx
const COST_ICONS: Record<string, string> = { airfare: '✈', hotel: '🏨', food: '🍔', entertainment: '🎭' }
const COST_ORDER = ['airfare', 'hotel', 'food', 'entertainment']

const categoryTotals = trip.costLines.reduce((acc, l) => {
  acc[l.category] = (acc[l.category] ?? 0) + l.amount
  return acc
}, {} as Record<string, number>)
const breakdownParts = COST_ORDER.filter(c => (categoryTotals[c] ?? 0) > 0)
```

Then find the `div` that contains the date and cost line:

```tsx
<div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1">
  {isDraft ? (
    <span className="text-amber-500 dark:text-amber-400 font-medium">Add dates</span>
  ) : (
    <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
  )}
  {trip.actualCost != null && <span>€{trip.actualCost.toLocaleString()}</span>}
</div>
```

After the closing `</div>` of that block, add the breakdown row:

```tsx
{breakdownParts.length > 0 && (
  <div className="flex flex-wrap gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1">
    {breakdownParts.map(c => (
      <span key={c}>{COST_ICONS[c]} €{categoryTotals[c].toLocaleString()}</span>
    ))}
  </div>
)}
```

- [ ] **Step 2: Verify TypeScript compiles and build passes**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
npm run build 2>&1 | grep -E "error TS|Type error|Failed" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/travel/TripCard.tsx
git commit -m "feat: show per-category cost breakdown on TripCard"
```

---

## Manual Verification Checklist

After all tasks are committed, start the dev server (`npm run dev`) and verify:

1. **New trip** — Open Travel → Trips → "+ Add Trip". Confirm the "Costs" section with Hotel, Airfare, Food/Drinks, Shopping/Entertainment appears. Add amounts and verify "Total" updates live.

2. **Memory link (existing)** — Add a food item, click "+ Memory", pick "Pick existing", search for a memory, select it. Confirm the button changes to show the memory title.

3. **Memory link (create new)** — Add an entertainment item, click "+ Memory", switch to "Create new", fill in title/date/category. Save the trip. Navigate to Memories page and confirm the new memory was created.

4. **Edit existing trip** — Click on a trip card to edit. Confirm cost lines load correctly in the breakdown form.

5. **TripCard breakdown** — After saving a trip with multiple cost categories, the card shows the emoji breakdown row.

6. **BulkEditor unchanged** — Open Travel Trips → "Edit All". Confirm the BulkEditor still shows `actualCost` as an editable column and existing data is preserved.

7. **CostsTab unchanged** — Navigate to Finance → Costs tab. Confirm trip costs still appear and sum correctly.
