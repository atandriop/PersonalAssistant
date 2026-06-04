# PDF Export Improvements — Design Spec

## Goal

Expand the existing browser-based PDF export from 4 sections (Tasks, Memories, Goals, Habits) to all meaningful sections of the app, and improve print CSS so multi-page tables render cleanly.

---

## Decisions Made

| Question | Decision |
|---|---|
| Section selection | Always export everything — one click, full snapshot |
| Generation approach | Keep existing `window.open()` + `window.print()` — no new library |
| Architecture | Extract export logic to `src/lib/exportPdf.ts` |
| Finance section | Omitted as a separate section — data already covered by Subscriptions, Travel, Appointments, Inventory |

---

## Architecture

### Files changed

| Action | File |
|---|---|
| Create | `src/lib/exportPdf.ts` — all data fetching + full HTML generation |
| Modify | `src/components/system/SystemPage.tsx` — replace inline `exportPdf()` with `import { exportPdf } from '@/lib/exportPdf'` |

`exportPdf()` signature: `async function exportPdf(): Promise<void>` — fetches all data in parallel, builds the HTML string, opens a new window, writes the HTML, and calls `window.print()`.

---

## API endpoints fetched

All fetched in a single `Promise.all`:

| Data | Endpoint |
|---|---|
| Tasks | `/api/tasks` |
| Memories | `/api/memories` |
| Life areas (goals + milestones) | `/api/life-areas` |
| Habits | `/api/habits` |
| Appointments | `/api/appointments` |
| Wishlist items | `/api/wishlist` |
| Inventory items | `/api/inventory` |
| Collectibles | `/api/collectibles` |
| Gift people (with ideas) | `/api/gifts/people` |
| Travel countries | `/api/travel/countries` |
| Travel trips | `/api/travel/trips` |
| Bucket list trips | `/api/bucket-list/trips` |
| Bucket list experiences | `/api/bucket-list/experiences` |
| Subscriptions | `/api/subscriptions` |
| Maintenance items | `/api/maintenance/items` |
| Documents | `/api/documents` |
| Net worth entries | `/api/net-worth/entries` |
| Portfolio holdings | `/api/portfolio` |

---

## Sections and columns

Sections appear in this order in the document:

### 1. Tasks *(existing)*
Columns: Title · Priority · Due Date · Category
- Done tasks shown with strikethrough
- Header: "Tasks (N open / M total)"

### 2. Appointments *(new)*
Columns: Title · Date · Time · Category · Location · Cost
- Sorted by date ascending
- Header: "Appointments (N total)"

### 3. Goals *(existing)*
Columns: Area · Goal · Period · Milestones (done/total)

### 4. Habits *(existing)*
Columns: Habit (with colour dot)

### 5. Memories *(existing)*
Columns: Title · Date · Category · Location

### 6. Travel *(new)*
Two sub-tables:

**Countries** — Name · Trips · Total Spend
Sorted alphabetically.

**Trips** — Country · Cities · Start Date · End Date · Cost
Sorted by start date descending (most recent first).

### 7. Bucket List *(new)*
Two sub-tables:

**Trips** — Destination · Budget · Target Year · Done (✓ or —)

**Experiences** — Title · Category · Target Year · Done (✓ or —)

### 8. Wishlist *(new)*
Columns: Name · Category · Priority · Cost
- Active items only (purchased = false), sorted by priority (High → Medium → Low)
- Header: "Wishlist (N items)"

### 9. Inventory *(new)*
Columns: Name · Category · Quantity · Total Cost (cost × quantity)
- Header: "Inventory (N items · €X total)"

### 10. Collectibles *(new)*
Columns: Name · Type · Condition · Purchase Price · Current Value
- Sorted by collection type then name
- Header: "Collectibles (N items)"

### 11. Gifts *(new)*
One row per gift person with a nested sub-table of their ideas.

**Person row**: Person Name · Budget · N/M ideas bought

**Idea rows** (indented): Title · Occasion · Purchased (✓ or —) · Est. Cost

### 12. Subscriptions *(new)*
Columns: Name · Cost · Period · Renewal Date
- Active subscriptions only, sorted by name
- Header: "Subscriptions (N active)"

### 13. Maintenance *(new)*
Columns: Item · Task · Status
- Status values: Overdue (red) · Due Soon (amber) · OK (green)
- Only items with at least one task shown

### 14. Documents *(new)*
Columns: Name · Category · Expiry Date
- Sorted by expiry date ascending (soonest first), then items with no expiry date at the end
- Header: "Documents (N total)"

### 15. Net Worth *(new)*
Two sub-tables:

**Assets** — Name · Category · Value (sorted by value descending)

**Liabilities** — Name · Category · Value (sorted by value descending)

Footer row: **Net Worth: €X** (assets total − liabilities total)

### 16. Portfolio *(new)*
Columns: Name · Type · Quantity · Current Price · Current Value
- Current Value = `currentPrice × quantity` for stocks/crypto, or `balance` for savings/other
- Footer row: **Total Portfolio Value: €X**

---

## Print CSS improvements

Three additions to the existing `<style>` block:

```css
h2 { break-after: avoid; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
```

- `h2 { break-after: avoid }` — section heading stays with the table that follows it
- `thead { display: table-header-group }` — column headers repeat on each new page
- `tr { break-inside: avoid }` — rows are never split across a page boundary

---

## Out of scope

- Section selection UI (always exports everything)
- Finance costs summary (aggregate data already present in individual sections)
- Actual PDF file generation — user uses browser's "Save as PDF" dialog
- Table of contents
- Charts or visual elements
