# Memories Feature Design

**Date:** 2026-06-03  
**Status:** Approved

---

## Overview

A Memories page for logging life events — graduations, first jobs, vacations, moves, and any other significant moment. Each memory has a category, optional date range, optional location, optional notes, and can be linked to one or more Travel trips via a many-to-many junction table.

---

## Data Model

### New models

```prisma
model Memory {
  id        Int          @id @default(autoincrement())
  title     String
  date      String       // ISO date YYYY-MM-DD
  endDate   String?      // ISO date; present for multi-day events
  category  String       // "Career" | "Education" | "Travel" | "Personal" | "Other"
  location  String?
  notes     String?
  trips     MemoryTrip[]
  createdAt DateTime     @default(now())
}

model MemoryTrip {
  memoryId  Int
  tripId    Int
  memory    Memory     @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  trip      TravelTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  @@id([memoryId, tripId])
}
```

### Modified model

`TravelTrip` gains:
```prisma
memories  MemoryTrip[]
```

### Design notes

- Dates stored as ISO strings (consistent with Travel pattern).
- Category stored as plain string; validated to the five allowed values in the API layer.
- `MemoryTrip` rows cascade-delete when either `Memory` or `TravelTrip` is deleted.
- One memory can link to multiple trips (e.g. a "Greece road trip" memory spanning two TravelTrip entries).

---

## TypeScript Types (`src/types/index.ts`)

```typescript
export interface Memory {
  id: number
  title: string
  date: string
  endDate: string | null
  category: 'Career' | 'Education' | 'Travel' | 'Personal' | 'Other'
  location: string | null
  notes: string | null
  trips: { id: number; countryName: string; startDate: string | null }[]
  createdAt: string
}
```

`TravelTrip` gains:
```typescript
memories: { id: number; title: string; date: string }[]
```

---

## API Routes

### `GET /api/memories`

Returns all memories ordered by `date desc`. Each memory includes linked trips (with `countryName` joined from `TravelCountry`).

```
export const dynamic = 'force-dynamic'
```

Prisma include chain:
```typescript
include: {
  trips: {
    include: {
      trip: {
        include: { country: { select: { name: true } } },
        select: { id: true, startDate: true, countryId: true }
      }
    }
  }
}
```

Serialize each memory's trips as `{ id: trip.id, countryName: trip.country.name, startDate: trip.startDate }`.

Response: `Memory[]`

### `POST /api/memories`

Creates a new memory and its junction rows.

Request body:
```json
{
  "title": "First job at Acme",
  "date": "2018-09-03",
  "endDate": null,
  "category": "Career",
  "location": "Athens",
  "notes": "...",
  "tripIds": []
}
```

Response: created `Memory`

### `PUT /api/memories/[id]`

Updates memory fields and fully replaces junction rows (deleteMany + createMany):

```typescript
await prisma.memoryTrip.deleteMany({ where: { memoryId: id } })
if (tripIds?.length) {
  await prisma.memoryTrip.createMany({
    data: tripIds.map((tripId: number) => ({ memoryId: id, tripId }))
  })
}
```

Response: updated `Memory`

### `DELETE /api/memories/[id]`

Deletes the memory. `MemoryTrip` rows cascade automatically.

Response: `{ ok: true }`

### `GET /api/travel/trips` (modified)

Prisma `include` extended to include linked memories:

```typescript
include: {
  country: true,
  memories: { include: { memory: { select: { id: true, title: true, date: true } } } }
}
```

`serializeTrip` maps the nested join into `memories: { id, title, date }[]`.

---

## Page UI

### `/memories` — `MemoriesPage.tsx`

- Header row: "Memories" title + "Add Memory" button.
- Filter pills: All · Career · Education · Travel · Personal · Other.
- Card grid: 1-col → 2-col (sm) → 3-col (lg), same breakpoints as Travel.
- Empty state: "No memories yet. Add your first one."

### `MemoryCard.tsx`

| Element | Detail |
|---|---|
| Title | Bold, full width |
| Date | Single date ("Jun 2019") or range ("Jun 2019 – Aug 2019") |
| Category chip | Color-coded: Career=blue, Education=purple, Travel=green, Personal=pink, Other=gray |
| Location | Small gray line, only shown if present |
| Trip chips | One chip per linked trip showing country name; clicking navigates to `/travel?tab=trips&country={countryName}` |
| Notes | Truncated to 2 lines if long |

### `MemoryForm.tsx`

Fields (in order):

1. **Title** — text input, required
2. **Category** — select: Career / Education / Travel / Personal / Other
3. **Date** — date input, required
4. **End Date** — date input, optional
5. **Location** — text input, optional
6. **Notes** — textarea, 3 rows, optional
7. **Linked Trips** — multi-select checkbox list; each row shows `{countryName} · {startDate formatted as "Mon YYYY"}` (or "Draft" if no startDate); trips fetched from `/api/travel/trips`

Footer: Delete (edit mode only, left-aligned) + Cancel + Save.

### `TripCard.tsx` (modified)

When `trip.memories.length > 0`, shows a small "X memories" chip below existing content. Clicking navigates to `/memories` — the page loads filtered to show only memories linked to that trip (by checking `memory.trips` for the tripId).

### Dashboard widget

`WidgetCard` titled "Memories" showing a per-category breakdown. Only non-zero categories rendered, inline: `Career 3 · Travel 5 · Personal 2`. Total count shown as the widget subtitle.

### Sidebar

```typescript
{ href: '/memories', label: 'Memories', active: true }
```

Inserted after Travel and before Maintenance.

---

## Files

### New files

| File | Purpose |
|---|---|
| `src/app/api/memories/route.ts` | GET + POST |
| `src/app/api/memories/[id]/route.ts` | PUT + DELETE |
| `src/app/memories/page.tsx` | Route shell |
| `src/components/memories/MemoriesPage.tsx` | Main page with SWR, tabs, filters |
| `src/components/memories/MemoryCard.tsx` | Card component |
| `src/components/memories/MemoryForm.tsx` | Add/edit modal |

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Memory`, `MemoryTrip`; extend `TravelTrip` |
| `src/types/index.ts` | Add `Memory` type; extend `TravelTrip` |
| `src/app/api/travel/trips/route.ts` | Include memories in GET response |
| `src/components/travel/TripCard.tsx` | Show "X memories" chip (links to `/memories?tripId={id}`) |
| `src/components/travel/TravelPage.tsx` | Read `?tab` and `?country` URL params on mount via `useSearchParams()` |
| `src/components/Sidebar.tsx` | Add Memories nav entry |
| `src/components/dashboard/DashboardPage.tsx` | Add Memories widget |

---

## Filtering: Memories linked to a specific trip

When the user clicks "X memories" on a TripCard, they navigate to `/memories`. The MemoriesPage accepts an optional `tripId` query param (or internal state via a link). On load, if a `tripId` is present, filter client-side:

```typescript
const filtered = memories.filter(m => m.trips.some(t => t.id === tripId))
```

This avoids a new API route. The trip filter chip shows as a dismissible tag above the category pills.

---

## Category Color Mapping

| Category | Chip color |
|---|---|
| Career | Blue |
| Education | Purple |
| Travel | Green |
| Personal | Pink |
| Other | Gray |
