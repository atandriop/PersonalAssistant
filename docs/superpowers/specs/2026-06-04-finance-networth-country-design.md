# Design: Finance Costs Tab, Net Worth Fixes, Country/City Autocomplete

**Date:** 2026-06-04  
**Status:** Approved

---

## Overview

Three independent feature areas:

1. **Finance Costs Tab** — new "Costs" tab in Finance showing year-to-date spend and projected remaining spend, pulling from trips, appointments, subscriptions (by category), inventory purchases, maintenance logs, and gifts.
2. **Net Worth Fixes** — remove double-counted portfolio assets from manual entries; add credit card liability category; bump subscription total font sizes.
3. **Country/City Autocomplete** — reusable combobox component backed by static JSON data, applied to all three country/city entry points.

---

## 1. Finance Costs Tab

### Subscription Category Field

The `Subscription` model gains a `category` field (SQLite migration required).

**Schema change:**
```prisma
model Subscription {
  // existing fields ...
  category  String  @default("Other")
}
```

**Categories (fixed list):**
- `Software & Services`
- `Utilities`
- `Groceries & Food`
- `Insurance`
- `Other`

The SubscriptionForm gets a category `<select>`. The SubscriptionsPage groups active subscriptions by category with a bold header row per group (e.g. "Utilities"), not collapsible — keeps the UI simple and consistent with the rest of the app.

### Costs Tab Layout

New fourth tab in `FinancePage`: `{ id: 'costs', label: 'Costs' }`.

The tab renders a new `CostsPage` component (or inline section) that:
- Fetches: `/api/trips` (travel), `/api/appointments`, `/api/subscriptions`, `/api/inventory`, `/api/maintenance/logs` (via items), `/api/gifts/people` (for ideas)
- Computes current year, days elapsed, days remaining

**Top summary row — two cards:**

| Card | Value |
|---|---|
| Spent so far | sum of all YTD amounts |
| Projected remaining | sum of all remaining amounts |

Small line below: "Total year estimate: €X"

**Breakdown table — one row per category:**

| Category | Spent YTD | Projected Remaining |
|---|---|---|
| Trips | Past trips this year: sum `actualCost` (0 if null). A trip is "past" if `endDate` is in current year and ≤ today; if no `endDate`, fall back to `startDate`. Trips with neither date are excluded. | Future trips this year: `startDate` is in current year and > today (trips with no start date excluded). Sum `actualCost` (0 if null). |
| Appointments | Past appts this year: `date` in current year and ≤ today. Sum `cost` (0 if null). | Future appts this year: `date` in current year and > today. Sum `cost` (0 if null). |
| Subscriptions — Software & Services | `categoryAnnualTotal × (daysElapsed / 365)` | `categoryAnnualTotal × (daysRemaining / 365)` |
| Subscriptions — Utilities | same formula | same formula |
| Subscriptions — Groceries & Food | same formula | same formula |
| Subscriptions — Insurance | same formula | same formula |
| Subscriptions — Other | same formula | same formula |
| Purchases (inventory) | Items with `createdAt` in current year: sum `cost × quantity` | — |
| Maintenance | `MaintenanceLog` entries with `date` in current year and ≤ today: sum `cost` (0 if null) | — |
| Gifts | `GiftIdea` entries with `purchased = true` and `createdAt` in current year: sum `estimatedCost` (0 if null). Note: `createdAt` is when the idea was recorded, not when it was marked purchased — this is a best-effort approximation given the current model. | — |

**Year reset:** Natural — all filters are `date/createdAt in current year`. No special reset mechanism.

**Subscription rows with zero cost** (no active subs in that category): hide the row entirely to avoid noise.

### API changes

- `GET /api/subscriptions` — add `category` to response (already returned via Prisma; just need schema + migration)
- `PUT/POST /api/subscriptions/[id]` — accept and persist `category`
- No new API endpoints needed; costs tab fetches from existing endpoints

---

## 2. Net Worth Fixes

### a) Remove manual asset entries

**Problem:** `portfolioTotal` (from Portfolio holdings) is added to `totalAssets`, AND the user had also manually entered portfolio values as NetWorthEntry records (type: `asset`). This double-counts assets.

**Fix:** 
- In `NetWorthPage.tsx`: change `totalAssets = portfolioTotal + assetEntries.reduce(...)` to `totalAssets = portfolioTotal`.
- Remove the entire Assets panel (the left column card that shows asset entries and the "+ Add asset" button).
- The Portfolio section already renders holdings inline in the assets area — keep that.
- Existing asset NetWorthEntry rows remain in the DB but are excluded from all calculations and UI.
- Apply the same fix in `FinancePage.tsx` (Overview): `assetTotal = portfolioTotal` only (remove `+ entries.filter(asset).reduce(...)`).

**Liabilities panel:** unchanged — users still add loans, mortgages, credit cards manually.

### b) Credit card liability category

Add `'credit_card'` to the `CATEGORIES` constant in `NetWorthPage.tsx`:

```ts
const CATEGORIES = ['property', 'vehicle', 'cash', 'credit_card', 'loan', 'mortgage', 'other'] as const
```

Display label: format `credit_card` → `"Credit Card"` (handle underscore in the capitalize helper).

No DB migration — category is stored as a plain string.

### c) Subscription total font sizes

**SubscriptionsPage.tsx** — summary bar at the top:
- Monthly total: `text-sm font-semibold` → `text-base font-semibold`
- Add annual total display next to it (currently only monthly is shown in the top bar): `text-sm font-medium`

**Finance Overview subscriptions card** — bottom summary rows:
- "Monthly total" and "Annual total" rows: `text-xs` → `text-sm`
- Values: `font-medium` (keep, just larger text)

---

## 3. Country/City Autocomplete

### Static data files

Stored in `public/data/` (served as static assets, fetched client-side once and cached):

- `public/data/countries.json` — `string[]`, ~250 country names sorted alphabetically
- `public/data/cities.json` — `Record<string, string[]>`, keyed by country name, value is array of ~10 major cities per country sorted alphabetically

These are generated from the public `countries-list` npm package data (countries) and the `world-cities` dataset (cities), curated into a script at `scripts/generate-geo-data.ts` that outputs the two JSON files. The JSON files are committed to the repo. No runtime fetch to external services.

### `Combobox` component

**Path:** `src/components/ui/Combobox.tsx`

```ts
interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}
```

**Behaviour:**
- Renders a text `<input>` + absolutely-positioned dropdown below it
- Dropdown shows options filtered case-insensitively by current input value (prefix or substring match)
- Max ~8 options shown at once (scrollable)
- If the typed value has no exact match in options: show **"Add '[value]'"** as the last item — selecting it calls `onChange` with the raw typed string
- Keyboard: `↑` / `↓` to move highlight, `Enter` to select highlighted, `Escape` to close
- Click outside (via `useRef` + `useEffect` on `mousedown`) closes dropdown
- Dropdown only opens when input is focused and has content

### City suggestion enhancement

The existing tag-chip city input in `TripForm` (both travel and bucket-list) gets city suggestions:

- A `cityOptions` array is derived from `cities[selectedCountry] ?? []` where `selectedCountry` is the current combobox value. This is best-effort: it works when the country name exactly matches a key in `cities.json` (e.g. "France" → works; "UK" instead of "United Kingdom" → no suggestions, user types freely). If no country is selected, no city suggestions are shown.
- While typing in the city input, a small dropdown (same style as `Combobox`) shows matching city names
- Selecting from dropdown or pressing Enter adds the chip as before
- Typing something not in the list and pressing Enter still adds it freely (unchanged behaviour)

### Integration points

| File | Change |
|---|---|
| `travel/TripForm.tsx` | Replace `<select>` for country with `<Combobox options={countries}>`. On submit, existing logic (create by `countryName` vs `countryId`) is preserved — if selected value matches a DB country name, use its ID; otherwise fall through to `countryName`. |
| `bucket-list/TripForm.tsx` | Replace plain `<input>` for `destination` with `<Combobox options={countries}>`. Value is stored as a string (no DB country relation needed here). |
| `travel/CountryForm.tsx` | Replace plain `<input>` for `name` with `<Combobox options={countries}>`. |
| `travel/TripForm.tsx` (cities) | Enhance city tag input with city suggestions from `cities[selectedCountry]`. |
| `bucket-list/TripForm.tsx` (cities) | Same city suggestion enhancement. |

### Data loading

Both JSON files are fetched once at app level or lazily inside the component that first needs them. Since they're small and static, a simple module-level `fetch('/data/countries.json')` with a cached promise is sufficient — no SWR or context needed.

---

## File Change Summary

| File | Type of change |
|---|---|
| `prisma/schema.prisma` | Add `category String @default("Other")` to `Subscription` |
| `prisma/migrations/...` | New migration for subscription category |
| `src/components/finance/FinancePage.tsx` | Add Costs tab; fix asset total; bump sub font sizes in overview card |
| `src/components/finance/CostsTab.tsx` | **New** — full costs breakdown component |
| `src/components/networth/NetWorthPage.tsx` | Remove asset panel; add credit_card category; fix totalAssets |
| `src/components/subscriptions/SubscriptionsPage.tsx` | Add category grouping; bump font sizes; update form |
| `src/components/ui/Combobox.tsx` | **New** — reusable combobox component |
| `src/app/api/subscriptions/route.ts` | Accept/return category field |
| `src/app/api/subscriptions/[id]/route.ts` | Accept/return category field |
| `public/data/countries.json` | **New** — static country list |
| `public/data/cities.json` | **New** — static cities-by-country |
| `src/components/travel/TripForm.tsx` | Replace country select + city input with combobox |
| `src/components/bucket-list/TripForm.tsx` | Replace destination input + city input with combobox |
| `src/components/travel/CountryForm.tsx` | Replace name input with combobox |
