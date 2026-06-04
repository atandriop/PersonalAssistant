# Bulk Editor Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Edit All" button to five pages (Subscriptions, Wishlist, Inventory, Travel Trips, Bucket List Trips) that swaps the normal list view for an inline bulk editor — an editable table for existing rows plus an import section for new rows via CSV paste or file upload.

**Architecture:** A generic `BulkEditor` component driven by a per-page column schema. Each page defines its columns (field key, label, input type, options) and passes them alongside its data; the component handles all editing, deletion, import parsing, and calls back to a page-provided `onSave` handler. Saves use existing per-entity API endpoints (PUT per update, POST per new row, DELETE per removed row), all fired in parallel.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, SWR (for data refresh after save), existing Prisma API routes.

---

## Component: `src/components/ui/BulkEditor.tsx`

### Column definition types

```ts
type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'select'

interface SelectOption {
  label: string
  value: string
}

interface ColumnDef {
  key: string
  label: string
  type: ColumnType
  options?: SelectOption[]  // required when type === 'select'
  required?: boolean
}
```

### Props

```ts
interface BulkEditorProps {
  columns: ColumnDef[]
  rows: Record<string, unknown>[]   // each row must have an `id: number` for existing entries
  csvHint?: string                  // e.g. "name,cost,period,category,renewalDate,url,notes,active"
  onSave: (changes: BulkChanges) => Promise<void>
  onCancel: () => void
}

interface BulkChanges {
  upserted: Record<string, unknown>[]   // rows with id = update; rows without id = create
  deletedIds: number[]
}
```

### Layout

The BulkEditor renders as a full-width panel with two stacked sections:

**Section 1 — Existing rows table**
- Horizontal scrollable table. One row per entry.
- Each cell renders the appropriate input for its column type:
  - `text` → `<input type="text">`
  - `number` → `<input type="number">`
  - `boolean` → `<input type="checkbox">`
  - `date` → `<input type="date">`
  - `select` → `<select>` with the provided options
- A `×` delete button on the left of each row marks it for deletion (row turns gray/strikethrough; not removed immediately — deleted on Save).
- A `+ Add row` button below the table appends a blank row (no id).

**Section 2 — Import new rows**
- A small hint line showing the expected CSV column order (from `csvHint` or auto-derived from column keys).
- A `<textarea>` for paste (CSV or TSV; first row may be headers or raw values — auto-detected by checking if first row matches column keys).
- A "Upload .csv" button: `<input type="file" accept=".csv">` reads the file into the same textarea via `FileReader`.
- On Save, parsed rows are appended to the upserted list as new entries (no id).

**Footer**
- "Save" button — fires all changes in parallel, calls `onSave`, then page calls its SWR `mutate()` and returns to normal view.
- "Cancel" button — discards all edits, returns to normal view immediately.

---

## CSV parsing rules

- Split by newline; skip blank lines.
- Split each line by comma (handle quoted fields containing commas: standard RFC 4180).
- If the first non-blank line matches the column keys (case-insensitive), treat it as a header and skip it.
- Map positionally to column definitions in the order specified by `csvHint`.
- `boolean` fields: accept `true/false`, `1/0`, `yes/no` (case-insensitive).
- `number` fields: parse with `parseFloat`; blank → `null`.
- `date` fields: pass through as-is (YYYY-MM-DD expected).
- `select` fields: match against option labels or values (case-insensitive).

---

## Pages

### Subscriptions (`src/components/subscriptions/SubscriptionsPage.tsx`)

Columns:
| key | label | type | options/notes |
|-----|-------|------|------|
| name | Name | text | required |
| cost | Cost (€) | number | required |
| period | Period | select | Monthly, Annual, Weekly, Quarterly |
| category | Category | select | Software & Services, Utilities, Groceries & Food, Insurance, Other |
| renewalDate | Renewal Date | date | |
| url | URL | text | |
| notes | Notes | text | |
| active | Active | boolean | |

CSV hint: `name,cost,period,category,renewalDate,url,notes,active`

Save handler:
- Rows with `id` → `PUT /api/subscriptions/{id}`
- Rows without `id` → `POST /api/subscriptions`
- Deleted ids → `DELETE /api/subscriptions/{id}`

### Wishlist (`src/components/items/ItemsPage.tsx`, wishlist tab)

Columns:
| key | label | type | options/notes |
|-----|-------|------|------|
| name | Name | text | required |
| cost | Cost (€) | number | required |
| priority | Priority | select | High, Medium, Low |
| categoryId | Category | select | loaded from `/api/categories`; options are `{ label: cat.name, value: String(cat.id) }` |
| url | URL | text | |
| notes | Notes | text | |

CSV hint: `name,cost,priority,categoryId,url,notes`

Save handler:
- Rows with `id` → `PUT /api/wishlist/{id}`
- Rows without `id` → `POST /api/wishlist`
- Deleted ids → `DELETE /api/wishlist/{id}`

### Inventory (`src/components/items/ItemsPage.tsx`, inventory tab)

Columns:
| key | label | type | options/notes |
|-----|-------|------|------|
| name | Name | text | required |
| cost | Cost (€) | number | required |
| quantity | Quantity | number | |
| purchaseDate | Purchase Date | date | |
| categoryId | Category | select | loaded from `/api/categories`; options are `{ label: cat.name, value: String(cat.id) }` |
| notes | Notes | text | |

CSV hint: `name,cost,quantity,purchaseDate,categoryId,notes`

Save handler:
- Rows with `id` → `PUT /api/inventory/{id}`
- Rows without `id` → `POST /api/inventory`
- Deleted ids → `DELETE /api/inventory/{id}`

### Travel Trips (`src/components/travel/TravelPage.tsx`)

Columns:
| key | label | type | options/notes |
|-----|-------|------|------|
| countryName | Country | text | required; API auto-upserts country by name |
| cities | Cities | text | comma-separated string; API receives as JSON array |
| startDate | Start Date | date | |
| endDate | End Date | date | |
| actualCost | Cost (€) | number | |
| rating | Rating (1–5) | number | |
| notes | Notes | text | |

CSV hint: `countryName,cities,startDate,endDate,actualCost,rating,notes`

Cities field: on save, split by comma → array before POSTing/PUTing.

Save handler:
- Rows with `id` → `PUT /api/travel/trips/{id}` (body includes `countryName` which the existing route handles)
- Rows without `id` → `POST /api/travel/trips`
- Deleted ids → `DELETE /api/travel/trips/{id}`

### Bucket List Trips (`src/components/bucket-list/BucketListPage.tsx`)

Columns:
| key | label | type | options/notes |
|-----|-------|------|------|
| destination | Destination | text | required |
| budget | Budget (€) | number | |
| targetYear | Target Year | number | |
| notes | Notes | text | |
| done | Done | boolean | |

CSV hint: `destination,budget,targetYear,notes,done`

Save handler:
- Rows with `id` → `PUT /api/bucket-list/trips/{id}`
- Rows without `id` → `POST /api/bucket-list/trips`
- Deleted ids → `DELETE /api/bucket-list/trips/{id}`

---

## "Edit All" button placement

Each page adds an "Edit All" button next to the existing "+ Add" button in the page header.

Clicking it sets a local `bulkEdit` state boolean. When `bulkEdit` is true:
- The normal list/cards view is hidden (not unmounted — just `hidden` to preserve SWR state)
- The BulkEditor panel is shown in its place

When `onSave` or `onCancel` is called, `bulkEdit` is set back to false.

---

## Not in scope

- Batch/bulk API endpoints (uses existing per-row endpoints)
- Undo / history
- Column reordering or hiding
- Validation error highlighting per cell (validation errors from API surface as a toast/alert only)
- Appointments, gifts, maintenance logs, goals, habits
