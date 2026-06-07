# Homebase Enhancements — Design Spec

**Date:** 2026-06-06  
**Scope:** Three features selected in PO review session  
**Priority order:** Calendar → Net Worth Widget → Finance Intelligence

---

## 1. Unified Calendar (Hybrid Grid + Agenda)

### Overview

A new `/calendar` page that aggregates all date-based data from across the app into a single view. Uses a hybrid layout: monthly grid on the left, day-detail agenda panel on the right.

### Layout

- **Left column (~340px fixed):** Monthly grid calendar. Each day cell shows colored dots representing events from each source type. Clicking a day selects it and populates the right panel.
- **Right column (flex):** Agenda panel. Shows all events on the selected day, grouped by source type, with relevant metadata. Defaults to today on load.
- **Top bar:** Source-type filter chips (one per event source). Toggling a chip hides/shows that type in both the grid dots and the agenda.
- **Month navigation:** Previous/next arrows update the grid. Selected day resets to null on month change (agenda shows "Select a day").

### Event Sources

| Source | Date field | Color | Metadata shown |
|--------|-----------|-------|----------------|
| Tasks | `dueDate` | Blue `#3b82f6` | Priority, category |
| Appointments | `date` | Green `#10b981` | Time, category, location |
| Travel trips | `startDate`–`endDate` (span) | Amber `#f59e0b` | Country, cities |
| Subscription renewals | `renewalDate` | Purple `#8b5cf6` | Cost, period |
| Document expiries | `expiryDate` | Red `#ef4444` | Category, days remaining |
| Maintenance tasks | `dueDate` | Gray `#6b7280` | Home item name, interval |

Travel trips that span multiple days show a dot on every day in the range.

### Data Fetching

Single API call per source type using existing endpoints. All fetched client-side via SWR. No new API routes needed — all data already exists.

### Sidebar entry

Add `Calendar` link under the **Planning** section, between `Today` and `Weekly Review`. Icon: `CalendarDays` from lucide-react.

### State

- Selected day: local React state (defaults to today)
- Active filters: localStorage (`calendar-hidden-sources`) — same pattern as dashboard widget visibility
- Current month: local React state

---

## 2. Net Worth Dashboard Widget

### Overview

A new widget in the existing dashboard widget system showing net worth, month-over-month delta, a 6-month sparkline, and a summary line. Uses existing `NetWorthSnapshot` data — no new data entry required.

### Widget content

- **Headline number:** Current net worth (sum of all NetWorthEntry values + portfolio holdings)
- **Delta line:** `▲ +€X this month · +€Y vs 3 months ago` (or `▼` if negative). Calculated by comparing most recent snapshot to snapshot from ~30 days ago and ~90 days ago.
- **Sparkline:** SVG line chart of the last 6 NetWorthSnapshot records, normalized to fit a 48px tall strip. Filled gradient beneath the line.
- **Summary line:** Portfolio total · monthly subscription cost · wishlist outstanding total

### Integration

- Add `'net-worth'` to `ALL_WIDGETS` in `DashboardPage.tsx`
- Add label `'Net Worth'` to `WIDGET_LABELS`
- Fetch `NetWorthSnapshot[]` from `/api/net-worth/snapshots` and `NetWorthEntry[]` from `/api/net-worth/entries` only when widget is visible (not in hidden set)
- Reuse existing `holdingValue` logic from `NetWorthPage.tsx` — extract to `lib/netWorthUtils.ts`

### Snapshot availability

If fewer than 2 snapshots exist, show the headline number only (no delta). If fewer than 2 snapshots exist for the sparkline, omit the sparkline entirely. Widget degrades gracefully.

---

## 3. Finance Overview Intelligence

### Overview

Enhance the existing Finance Overview tab with month-over-month delta numbers on each stat card and a new Monthly Burn Rate section below the cards.

### Stat card changes

Each of the 3 existing stat cards gets a secondary delta line:

| Card | Primary | Delta added |
|------|---------|-------------|
| Net Worth | Current total | `+€X this month` / `+€Y vs 3 months ago` |
| Portfolio | Total value | `P&L +€X` (existing) + `+X% since bought` |
| Subscriptions | Monthly cost | Annual cost (`€X/yr`) + active count |

The wishlist card already shows count — add total cost of unpurchased items.

### Monthly Burn Rate section

New section below the stat cards, above the portfolio breakdown. Aggregates costs across modules for a realistic monthly spending picture:

- **Subscriptions:** sum of active subscriptions normalized to monthly (existing `monthlySubCost`)
- **Appointments (avg):** sum of appointment costs from the last 12 months ÷ 12
- **Maintenance (avg):** sum of maintenance log costs from the last 12 months ÷ 12
- **Total:** sum of above

Appointments and maintenance logs are currently only fetched inside `CostsTab`, not in `FinancePage.tsx`. Two additional SWR calls are needed in `FinancePage.tsx`: `/api/appointments` and `/api/maintenance/items`. Subscriptions and wishlist are already fetched there.

### Delta calculation

Deltas require `NetWorthSnapshot` records. Fetch `/api/net-worth/snapshots` in `FinancePage.tsx` (it already fetches portfolio, entries, subscriptions, and wishlist). Compare:
- "This month": latest snapshot vs snapshot closest to 30 days ago
- "3 months ago": latest snapshot vs snapshot closest to 90 days ago

If insufficient snapshot history, omit delta lines rather than showing zero.

---

## Out of Scope

- Calendar event creation from within the calendar page (read-only in v1 — clicking an event navigates to its source page)
- Net worth widget on mobile (app is desktop-first)
- Budget tracking / income tracking (separate initiative)
- Wishlist–Finance integration ("time to afford") — deferred, not selected

---

## Implementation order dependency

`lib/netWorthUtils.ts` (Feature 2) must be created before Feature 3 is implemented, since Feature 3 reuses the same `holdingValue` helper extracted there.

---

## File changes summary

| File | Change |
|------|--------|
| `src/app/calendar/page.tsx` | New page |
| `src/components/calendar/CalendarPage.tsx` | New component |
| `src/components/Sidebar.tsx` | Add Calendar nav entry |
| `src/components/dashboard/DashboardPage.tsx` | Add `net-worth` widget |
| `src/lib/netWorthUtils.ts` | Extract shared net worth calculation helpers |
| `src/components/finance/FinancePage.tsx` | Add deltas, burn rate section |
