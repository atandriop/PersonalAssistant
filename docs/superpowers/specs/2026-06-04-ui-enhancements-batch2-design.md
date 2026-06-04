# UI Enhancements Batch 2 — Design Spec

## Overview

Nine improvements across six pages, decomposed into four independent sub-projects. No database schema changes. All changes are confined to React component files and one new API route.

---

## Sub-project A — Quick wins

### A1. Fix `formatCategory` infinite recursion (NetWorthPage)

**Problem:** `formatCategory` in `NetWorthPage.tsx:56–58` calls itself for every category that isn't `'credit_card'`, causing an infinite recursion crash when any other category (mortgage, loan, vehicle, etc.) is present in the liabilities list. This crashes the entire Net Worth page.

**Fix:** Replace the recursive fallback with a generic formatter:
```tsx
function formatCategory(cat: string): string {
  if (cat === 'credit_card') return 'Credit Card'
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
```
This handles all categories: `mortgage` → `Mortgage`, `credit_card` → `Credit Card`, `other` → `Other`, etc.

**Side effect:** The existing "Net Worth Over Time" `LineChart` (already implemented in NetWorthPage) was never visible because the page crashed on load. Fixing the bug reveals it — no additional chart work needed.

### A2. Life boxes expanded by default (LifePage)

**Current behaviour:** `expandedAreaId: number | null = null` — only one area can be expanded at a time, all collapsed on load.

**New behaviour:** All areas expanded on load; clicking the area header collapses/expands it individually.

**Implementation:** Replace the single-value state with a collapsed-IDs set:
```tsx
const [collapsedAreaIds, setCollapsedAreaIds] = useState<Set<number>>(new Set())
function toggleArea(id: number) {
  setCollapsedAreaIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```
Area is expanded when its id is NOT in `collapsedAreaIds`.

### A3. Category spend breakdown (SubscriptionsPage)

**Placement:** A compact horizontal row directly below the monthly/annual totals strip.

**Content:** Active subscriptions grouped by category, each group summed with `monthlyEquiv`. Displayed as `Category €X.XX/mo` items separated by `·`. Sorted descending by spend. Hidden if no active subscriptions.

```
Software & Services €45.00/mo · Insurance €12.00/mo · Utilities €8.50/mo
```

### A4. P&L percentage per holding (PortfolioPage)

**Current:** `pnlDisplay` returns text like `+€200.00` or `−€150.00`.

**New:** When `buyPrice > 0`, append percentage:
- Positive: `+€200.00 (+13.3%)`
- Negative: `−€150.00 (−8.7%)`
- Zero: `€0` (unchanged)
- No cost data: `—` (unchanged)

Formula: `pct = (pnl / buyPrice) * 100`

---

## Sub-project B — Experiences restructure

### B1. Travel page: sections instead of tabs

**Current:** `TravelPage` has an inner `tab: 'countries' | 'trips'` state that shows one at a time.

**New:** Remove the tab switcher. Render two stacked sections:
1. **Trips** — existing trip cards, country filter, bulk edit button, Add trip button
2. **Countries** — existing country cards, status filter, Add country button

Each section has a section header (`<h2>`) and its own controls. No tab state needed.

### B2. Bucket list page: sections instead of tabs

**Current:** `BucketListPage` has an inner `tab: 'trips' | 'experiences'` state.

**New:** Remove the tab switcher. Render two stacked sections:
1. **Trips** — existing bucket trip cards, filter, bulk edit, Add trip button
2. **Experiences** — existing experience cards, status filter, category filter, Add experience button

### B3. Timeline tab in ExperiencesPage

**New tab:** `'timeline'` added to `ExperiencesTab` union and the tab bar.

**New component:** `src/components/timeline/TimelinePage.tsx`
- Fetches `/api/travel/trips` and `/api/memories`
- Merges arrays: trips use `startDate`, memories use their `date` field
- Sorts descending by date
- Renders a vertical list:
  - Year/month separator chip when the month changes (e.g. `June 2025`)
  - Card per entry: type badge (`Trip` in blue / `Memory` in purple), title/destination, date, notes snippet (truncated to 100 chars)

**ExperiencesPage change:** Add `import TimelinePage from '@/components/timeline/TimelinePage'` and `{tab === 'timeline' && <TimelinePage />}`.

---

## Sub-project C — Dashboard + Portfolio

### C1. Upcoming Renewals in Today page

**Placement:** Between Habits section and Today's Appointments section.

**Data:** Fetch `/api/subscriptions`. Filter: `active === true && renewalDate && daysUntil(renewalDate) >= 0 && daysUntil(renewalDate) <= 30`.

**Display:** Only shown when at least one renewal qualifies. Section title "Upcoming Renewals". Each row:
- Subscription name
- Cost + period (e.g. `€12.99/mo`)
- Days badge: amber `in Xd` if ≤ 7 days, gray `in Xd` if ≤ 30

### C2. Compact Gifts in Today page

**Data:** Fetch `/api/gifts/people`. The people endpoint must return nested ideas. Filter people with at least one idea where `purchased === false`.

**Display:** Compact section "Pending Gifts", no card wrapper. Each row: person name + `X idea(s)` count in muted text. Only shown when ≥ 1 person has pending ideas. Appears after renewals.

### C3. Auto-fetch prices (Portfolio)

**New API route:** `POST /api/portfolio/refresh-prices`
- Fetches all non-savings holdings from DB
- For each holding with `type === 'crypto'`: calls CoinGecko search API to resolve coin ID from `name`, then `/simple/price?ids={id}&vs_currencies=eur` for EUR price
- For each holding with `type === 'stock'` or `type === 'other'`: calls Yahoo Finance `/v7/finance/quote?symbols={name}` server-side (no CORS issue from API route), extracts `regularMarketPrice`
- Updates `currentPrice` for each successfully fetched holding via `prisma.portfolioHolding.update`
- Returns `{ updated: string[], failed: string[] }`

**PortfolioPage UI:**
- "Refresh prices" button next to "+ Add holding"
- While fetching: button shows "Refreshing…" and is disabled
- After: show a one-line result below the header: `Refreshed 5 prices · 1 failed (MSFT)` fading after 5 seconds

**CoinGecko approach:** `GET https://api.coingecko.com/api/v3/search?query={name}` to find `id`, then `GET https://api.coingecko.com/api/v3/simple/price?ids={id}&vs_currencies=eur`. Both endpoints are free with no API key.

**Yahoo Finance approach:** `GET https://query1.finance.yahoo.com/v7/finance/quote?symbols={name}` from the server-side API route. Extracts `regularMarketPrice` from the response. Uses the holding `name` as the ticker symbol directly. **Assumption:** Stock holding names should be ticker symbols (e.g. `AAPL`, `NVDA`). Holdings named "Apple" or "Tesla" will fail — the result line will list them as failed so the user can see which ones need renaming.

---

## Sub-project D — Items/Collectibles restructure

### D1. Layout: side-by-side columns

**Current:** Wishlist and Inventory are rendered sequentially (Inventory appears to the right due to earlier tab logic, but effectively both are stacked).

**New:** `grid grid-cols-1 md:grid-cols-2 gap-6` — Wishlist on the left, Inventory on the right.

### D2. Collapsible categories

**Current:** Items are displayed in a flat or category-filtered list.

**New:** Within each column, items are grouped by category. Each category is a collapsible section:
- Header row with category name, item count, and a chevron
- `collapsedCats` Set state (default empty = all expanded)
- Clicking the header toggles that category's visibility

### D3. Collectibles in Inventory column

**Current:** Collectibles are a separate tab in ItemsTabs.

**New:** Collectibles appear at the bottom of the Inventory column under a "Collectibles" header, grouped by `collectionType` (Cards, Funko Pop, Lego, Figures, Books). Each group shows existing collectible cards from `CollectiblesTab`.

The Collectibles tab is removed from `ItemsTabs`. The `CollectiblesTab` component is reused inline in `ItemsPage` within the inventory section.

### D4. Wishlist on left, Inventory on right

The left column contains: search/filter controls, wishlist categories (collapsible), add wishlist item button.
The right column contains: inventory categories (collapsible), collectibles section, add inventory item button.

The search input and category filter apply to both columns simultaneously.

---

## Files touched

| Sub-project | File | Change |
|-------------|------|--------|
| A | `src/components/networth/NetWorthPage.tsx` | Fix `formatCategory` |
| A | `src/components/life/LifePage.tsx` | Collapsed-IDs state |
| A | `src/components/subscriptions/SubscriptionsPage.tsx` | Category breakdown row |
| A | `src/components/portfolio/PortfolioPage.tsx` | P&L % in display |
| B | `src/components/travel/TravelPage.tsx` | Remove tabs, add sections |
| B | `src/components/bucket-list/BucketListPage.tsx` | Remove tabs, add sections |
| B | `src/components/experiences/ExperiencesPage.tsx` | Add timeline tab |
| B | `src/components/timeline/TimelinePage.tsx` | Create new |
| C | `src/components/today/TodayPage.tsx` | Renewals + gifts sections |
| C | `src/app/api/portfolio/refresh-prices/route.ts` | Create new |
| C | `src/components/portfolio/PortfolioPage.tsx` | Refresh button + result |
| D | `src/components/items/ItemsPage.tsx` | Side-by-side, collapsible, collectibles inline |
