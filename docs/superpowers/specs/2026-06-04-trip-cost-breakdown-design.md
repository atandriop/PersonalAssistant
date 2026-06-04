# Trip Cost Breakdown — Design Spec

## Goal

Replace the single `actualCost` field on travel trips with per-category line items (hotel, airfare, food/drinks, shopping/entertainment). Food and entertainment items optionally link to an existing Memory or create a new one inline at the same time.

## Architecture

A new `TripCostLine` table stores individual cost entries. `TravelTrip.actualCost` is kept as a denormalized sum so that `CostsTab`, `BulkEditor`, and any other code reading the trips API needs no changes. On every trip save, the API replaces all cost lines and recomputes `actualCost = sum(lines)`.

Old trips with no lines continue to display their stored `actualCost` unchanged — no data migration is required.

---

## Data Model

### New model: `TripCostLine`

```prisma
model TripCostLine {
  id        Int        @id @default(autoincrement())
  tripId    Int
  trip      TravelTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  category  String     // "hotel" | "airfare" | "food" | "entertainment"
  amount    Float
  label     String?
  memoryId  Int?
  memory    Memory?    @relation(fields: [memoryId], references: [id], onDelete: SetNull)
  createdAt DateTime   @default(now())
}
```

### Changes to existing models

```prisma
model TravelTrip {
  // ... existing fields unchanged ...
  costLines TripCostLine[]   // NEW
}

model Memory {
  // ... existing fields unchanged ...
  costLines TripCostLine[]   // NEW
}
```

`TravelTrip.actualCost` is **kept** (not removed). It is recomputed by the API on every save.

---

## API Changes

### `GET /api/travel/trips`

Include cost lines in response. `serializeTrip` logic:

```ts
// Compute actualCost from lines if any exist; fall back to stored field
const linesTotal = trip.costLines.length > 0
  ? trip.costLines.reduce((s, l) => s + l.amount, 0)
  : null

return {
  ...rest,
  actualCost: linesTotal ?? trip.actualCost,
  costLines: trip.costLines.map(l => ({
    id: l.id,
    category: l.category,
    amount: l.amount,
    label: l.label ?? null,
    memoryId: l.memoryId ?? null,
  })),
  // ... existing countryName, cities, memories ...
}
```

### `POST /api/travel/trips` and `PUT /api/travel/trips/[id]`

Accept an optional `costLines` array in the request body:

```ts
costLines?: Array<{
  category: 'hotel' | 'airfare' | 'food' | 'entertainment'
  amount: number
  label?: string
  memoryId?: number         // link to existing memory
  newMemory?: {             // create a new memory inline
    title: string
    date: string            // YYYY-MM-DD
    category: string
    location?: string
  }
}>
```

Handler steps when `costLines` is present:

1. For each line with `newMemory`, create the Memory record and capture its id.
2. `prisma.tripCostLine.deleteMany({ where: { tripId } })` — replace all existing lines.
3. `prisma.tripCostLine.createMany(...)` — create new lines with resolved `memoryId` values.
4. Compute `actualCost = lines.reduce(sum, 0)` (or `null` if no lines passed).
5. Update `TravelTrip.actualCost` to the computed total.

When `costLines` is absent (e.g., BulkEditor saves just `actualCost` directly), the handler does **not** touch existing cost lines. This preserves existing line data when a bulk-edit only updates dates or ratings.

---

## UI — TripForm

Replace the single "Actual Cost (€)" input with a **Costs** section. The section contains four sub-sections:

### Hotel and Airfare

Each rendered as a list of rows (optional label + amount input). Start with one empty row. A `+ Add line` link appends another row. No memory link on these two categories.

```
Hotel
  [label input (optional)]  [€ amount ]  [×]
  + Add line

Airfare
  [label input (optional)]  [€ amount ]  [×]
  + Add line
```

### Food / Drinks and Shopping / Entertainment

Rendered as a list of rows. Start empty. Each row has:

```
  [€ amount ]  [label input]  [Link memory ▾]  [×]
```

The **Link memory** control is a button that opens an inline panel below the row with two tabs:

- **Pick existing** — searchable dropdown listing all memories (title + date). Selecting one sets `memoryId` on the line.
- **Create new** — inline form with: Title (required), Date (required, date picker), Category (select, same options as MemoryForm), Location (optional text). Stored in component state as `newMemory` on that line; the Memory record is created by the API when the trip is saved.

Once a memory is linked, the button label shows the memory title (truncated to ~20 chars). Clicking it re-opens the panel. A "Remove link" option clears it.

### Total

A live-computed total line below all sections:

```
Total: €1,125
```

Updates as amounts change. Hidden if all amounts are zero/empty.

---

## UI — TripCard

Existing `€{actualCost}` display is unchanged. When `costLines` has entries with non-zero totals, a compact breakdown row is added below it:

```
€1,125
✈ €300  🏨 €500  🍔 €125  🎭 €200
```

Icons per category: `✈` airfare, `🏨` hotel, `🍔` food, `🎭` entertainment. Only categories with a total > 0 are shown. Old trips with no lines show only the total line.

---

## CostsTab and BulkEditor

**CostsTab** — no changes. Reads `actualCost` from `/api/travel/trips`, which the API keeps up to date.

**BulkEditor (TravelPage)** — no changes to the `TRIP_COLUMNS` definition. The `actualCost` column remains editable as a raw number for quick bulk edits. Saving via BulkEditor writes `actualCost` directly and does not send `costLines`, so existing lines are preserved (handler only touches lines when `costLines` is explicitly provided).

---

## TypeScript Types

```ts
export interface TripCostLine {
  id: number
  category: 'hotel' | 'airfare' | 'food' | 'entertainment'
  amount: number
  label: string | null
  memoryId: number | null
}

// TravelTrip — add:
costLines: TripCostLine[]
```

---

## Out of Scope

- Editing cost lines via BulkEditor (too complex; detailed form handles this)
- Reporting/charts per cost category
- Currency conversion
- Splitting cost lines across multiple trips
