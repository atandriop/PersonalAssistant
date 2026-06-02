# Travel Design Spec

**Date:** 2026-06-03  
**Feature:** Travel (Feature 3 of 5)

---

## Overview

A page to log trips taken and countries visited. Organised as two tabs on a single `/travel` route: **Countries** (every country visited, with derived stats) and **Trips** (individual journey records with dates, cost, and rating). Completed Bucket List trips auto-import as draft Travel trips, pre-filling the destination and cities.

---

## Data Model

### `TravelCountry`

| Field     | Type      | Notes                                      |
|-----------|-----------|--------------------------------------------|
| id        | Int PK    | Auto-increment                             |
| name      | String    | Unique; e.g. "Japan"                       |
| notes     | String?   | Optional free-form notes                   |
| createdAt | DateTime  | Default now()                              |

Countries can be created two ways:
1. **Auto-created** when a trip is added whose country name does not yet exist.
2. **Manually created** as standalone entries (for countries visited before the app, without a full trip record).

A country with no trips is considered "standalone."

### `TravelTrip`

| Field        | Type      | Notes                                                              |
|--------------|-----------|--------------------------------------------------------------------|
| id           | Int PK    | Auto-increment                                                     |
| countryId    | Int FK    | → TravelCountry; cascade delete trips when country deleted         |
| cities       | String?   | JSON array string: `'["Tokyo","Kyoto"]'` — null when empty         |
| startDate    | String?   | ISO date string, e.g. `"2024-06-15"`                               |
| endDate      | String?   | ISO date string                                                    |
| actualCost   | Float?    | Actual spend in €                                                  |
| rating       | Int?      | 1–5 stars                                                          |
| notes        | String?   | Free-form notes                                                    |
| bucketTripId | Int?      | Soft reference to `BucketTrip.id` (no hard FK); set on auto-import |
| createdAt    | DateTime  | Default now()                                                      |

A trip with no `startDate` is considered a **draft** — it was auto-imported from the Bucket List and needs dates/cost/rating filled in.

**Cities storage:** Same pattern as `BucketTrip.cities` — stored as a JSON string, parsed to `string[]` in the API layer before returning to the client.

### Auto-import from Bucket List

When `PUT /api/bucket-list/trips/[id]` is called with `done: true`, the existing endpoint (which already sets `linkedToTravel: true`) additionally:

1. Upserts a `TravelCountry` — find by `name = destination`, create if not found.
2. Creates a draft `TravelTrip` with:
   - `countryId` set to the upserted country
   - `cities` pre-filled from `BucketTrip.cities`
   - `bucketTripId` set to the `BucketTrip.id`
   - All other fields (`startDate`, `endDate`, `actualCost`, `rating`) left null.

This means marking a bucket list trip as done immediately surfaces a draft in the Travel → Trips tab prompting the user to complete it.

---

## API Routes

All routes return JSON. No file uploads.

### Countries

| Method | Path                          | Action                                                                                       |
|--------|-------------------------------|----------------------------------------------------------------------------------------------|
| GET    | `/api/travel/countries`       | List all countries. Each entry includes computed `tripCount`, `totalSpend`, `firstVisit`. `export const dynamic = 'force-dynamic'` |
| POST   | `/api/travel/countries`       | Create standalone country. Requires `name`.                                                  |
| PUT    | `/api/travel/countries/[id]`  | Update `name` and/or `notes`.                                                                |
| DELETE | `/api/travel/countries/[id]`  | Delete country and cascade-delete its trips.                                                 |

The GET response computes three derived fields per country:
- `tripCount` — count of `TravelTrip` rows with this `countryId`
- `totalSpend` — sum of `actualCost` across those trips (null costs treated as 0)
- `firstVisit` — minimum `startDate` across those trips (null if no trips or no trips have dates)

### Trips

| Method | Path                       | Action                                                                                                  |
|--------|----------------------------|---------------------------------------------------------------------------------------------------------|
| GET    | `/api/travel/trips`        | List all trips ordered by `startDate` desc (nulls last). Each entry includes `countryName` and `cities` parsed from JSON. `export const dynamic = 'force-dynamic'` |
| POST   | `/api/travel/trips`        | Create trip. Accepts `countryId` (existing) or `countryName` (creates country if not found). Serialises `cities` array to JSON. |
| PUT    | `/api/travel/trips/[id]`   | Update trip fields.                                                                                     |
| DELETE | `/api/travel/trips/[id]`   | Delete trip.                                                                                            |

### Modified endpoint

`PUT /api/bucket-list/trips/[id]` — extended to auto-import (see Auto-import section above). The auto-import only runs when `done` transitions to `true` **and** no `TravelTrip` with `bucketTripId = id` already exists (prevents duplicate imports if the endpoint is called multiple times).

---

## TypeScript Types

Add to `src/types/index.ts`:

```typescript
export interface TravelCountry {
  id: number
  name: string
  notes: string | null
  createdAt: string
  tripCount: number
  totalSpend: number
  firstVisit: string | null  // ISO date from earliest trip with a startDate
}

export interface TravelTrip {
  id: number
  countryId: number
  countryName: string        // joined from TravelCountry
  cities: string[]           // parsed from JSON string
  startDate: string | null
  endDate: string | null
  actualCost: number | null
  rating: number | null
  notes: string | null
  bucketTripId: number | null
  createdAt: string
}
```

---

## Page UI

**Route:** `/travel`  
**Sidebar label:** "Travel" (between Bucket List and Maintenance)

### Tab bar

Two tabs: **Countries** | **Trips**. Active tab stored in component state.

---

### Countries tab

- Card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Filter pills: **All** | **With Trips** | **Standalone**
- "+ Add Country" button → `CountryForm` modal (creates a standalone country)
- Empty state: "No countries yet. Add trips to get started."

**CountryCard** displays:
- Country name (large, bold)
- Trip count chip — clicking it switches to the Trips tab pre-filtered to that country
- Total spend (€X,XXX) — omitted if zero
- First visited year — derived from earliest trip `startDate`; omitted if standalone with no trips
- "standalone" badge (gray) — shown when `tripCount === 0`

Clicking the card body (not the trip count chip) → `CountryForm` in edit mode.

---

### Trips tab

- Card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Sorted by `startDate` desc; drafts (no `startDate`) shown at top with an amber left border
- Filter pills: **All** + one pill per country (derived from fetched countries list)
- "+ Add Trip" button → `TripForm` modal
- Empty state: "No trips yet. Click '+ Add Trip' to log your first."

**TripCard** displays:
- Country badge (blue pill, top-left)
- City chips (same blue tag style as BucketTrip)
- Date range ("Jun 2024 – Jul 2024") or amber "Add dates" label if draft
- Actual cost (€X,XXX) — omitted if null
- Star rating (filled/empty stars) — omitted if null
- Notes preview (single line, truncated)

Clicking the card → `TripForm` in edit mode.

---

## Forms

### TripForm

Fields:
- **Country** — dropdown of existing `TravelCountry` names; selecting "＋ New country…" shows an inline text input that creates the country on save
- **Cities** — tag input (same pattern as `TripForm` in Bucket List: type + Enter/comma to add chip, click × to remove)
- **Start Date** — date input (optional)
- **End Date** — date input (optional)
- **Actual Cost** — number input, € (optional)
- **Rating** — 1–5 star selector (click to set; click selected star to clear; optional)
- **Notes** — textarea (optional)

Create mode: blank (country dropdown shows existing countries). Edit mode: pre-filled. Delete button shown in edit mode (with `confirm()`). Calls `onSave()` after API completes.

### CountryForm

Fields:
- **Country name** — text input (required)
- **Notes** — textarea (optional)

Delete button shown in edit mode. Deleting a country that has trips requires a `confirm()` warning that its trips will also be deleted.

---

## Dashboard Widget

**Widget title:** "Travel"

Three stats in a single row:

```
X countries   ·   X trips   ·   €X total spent
```

- Stats derived from `/api/travel/countries` and `/api/travel/trips` SWR fetches
- Widget links to `/travel` on click
- If no countries and no trips: "No trips logged yet."

---

## Components

| File | Responsibility |
|------|----------------|
| `src/components/travel/TravelPage.tsx` | Tab state, SWR fetches for both resources, tab bar, country-filter state shared between tabs |
| `src/components/travel/CountryCard.tsx` | Country card with stats; emits `onFilterTrips` to switch tab |
| `src/components/travel/CountryForm.tsx` | Add/edit modal for countries |
| `src/components/travel/TripCard.tsx` | Trip card with draft indicator, city chips, stars |
| `src/components/travel/TripForm.tsx` | Add/edit modal for trips including inline country creation and star selector |
| `src/app/travel/page.tsx` | Page shell: imports and renders `TravelPage` |

---

## Sidebar & Dashboard Integration

- **Sidebar:** Add `{ href: '/travel', label: 'Travel', active: true }` between Bucket List and Maintenance in `src/components/Sidebar.tsx`.
- **Dashboard:** Add "Travel" `WidgetCard` to `src/components/dashboard/DashboardPage.tsx` showing countries count, trips count, and total spend. Place before the Bucket List widget.
