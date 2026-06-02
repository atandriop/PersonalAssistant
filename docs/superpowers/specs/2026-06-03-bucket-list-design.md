# Bucket List Design Spec

**Date:** 2026-06-03  
**Feature:** Bucket List (Feature 3 of 5)

---

## Overview

A page to track two types of life goals: **Trips** (destinations to visit) and **Experiences** (things to do). Trips and Experiences are shown as tabs on a single `/bucket-list` route. Completing a trip sets a `linkedToTravel` flag that Feature 4 (Travel) will use to import completed trips.

---

## Data Model

### `BucketTrip`

| Field           | Type      | Notes                                         |
|-----------------|-----------|-----------------------------------------------|
| id              | Int PK    | Auto-increment                                |
| destination     | String    | Country or place name, e.g. "Japan"           |
| cities          | String?   | JSON array string: `'["Tokyo","Kyoto"]'`       |
| budget          | Float?    | Estimated budget in €                         |
| targetYear      | Int?      | Year the user aims to go                      |
| notes           | String?   | Free-form notes                               |
| done            | Boolean   | Default false                                 |
| linkedToTravel  | Boolean   | Default false; set true when done = true      |
| createdAt       | DateTime  | Default now()                                 |

### `BucketExperience`

| Field      | Type     | Notes                                                                 |
|------------|----------|-----------------------------------------------------------------------|
| id         | Int PK   | Auto-increment                                                        |
| title      | String   | e.g. "Run a marathon"                                                 |
| category   | String   | One of: Adventure, Learning, Career, Relationships, Health, Creative, Other |
| notes      | String?  | Free-form notes                                                       |
| targetYear | Int?     | Year the user aims to complete this                                   |
| done       | Boolean  | Default false                                                         |
| createdAt  | DateTime | Default now()                                                         |

**Cities storage:** SQLite has no native array type. Cities are stored as a JSON string (e.g. `'["Tokyo","Kyoto","Osaka"]'`) and parsed in the API layer before returning to the client. An empty list is stored as `null`.

**Travel linkage:** When a trip is updated with `done: true`, the API simultaneously sets `linkedToTravel: true`. No hard foreign key to a travel table yet — Feature 4 will query `BucketTrip WHERE done = true` to offer import candidates.

---

## API Routes

All routes return JSON. No file uploads.

### Trips

| Method | Path                          | Action                                      |
|--------|-------------------------------|---------------------------------------------|
| GET    | `/api/bucket-list/trips`      | List all trips, ordered by `createdAt` desc. Parse `cities` JSON before returning. |
| POST   | `/api/bucket-list/trips`      | Create trip. Accept `cities` as string array from client, serialize to JSON. |
| PUT    | `/api/bucket-list/trips/[id]` | Update trip. If `done: true` also set `linkedToTravel: true`. |
| DELETE | `/api/bucket-list/trips/[id]` | Delete trip.                                |

### Experiences

| Method | Path                               | Action                                      |
|--------|------------------------------------|---------------------------------------------|
| GET    | `/api/bucket-list/experiences`     | List all experiences, ordered by `createdAt` desc. |
| POST   | `/api/bucket-list/experiences`     | Create experience.                          |
| PUT    | `/api/bucket-list/experiences/[id]` | Update experience.                         |
| DELETE | `/api/bucket-list/experiences/[id]` | Delete experience.                         |

---

## TypeScript Types

```typescript
export interface BucketTrip {
  id: number
  destination: string
  cities: string[]        // parsed from JSON string
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

---

## Page UI

**Route:** `/bucket-list`  
**Sidebar label:** "Bucket List" (between Documents and Maintenance)

### Tab bar

Two tabs: **Trips** | **Experiences**. Active tab is stored in component state (not URL, no need for URL persistence for a personal app).

### Trips tab

- Card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Each card displays:
  - Destination name (large, bold)
  - City chips (small rounded tags below destination)
  - Target year (if set)
  - Budget: "€X,XXX" (if set)
  - Done toggle (checkbox or checkmark button, top-right of card)
- Done trips: `opacity-50`, destination has `line-through`
- Filter pills: **All** | **Not Done** | **Done**
- "+ Add Trip" button → `TripForm` modal
- Click card body (not the done toggle) → `TripForm` modal in edit mode

### Experiences tab

- Same card grid layout
- Each card displays:
  - Title (large, bold)
  - Category badge (color-coded pill)
  - Target year (if set)
  - Done toggle (top-right of card)
- Done experiences: `opacity-50`, title has `line-through`
- Filter pills: **All** | **Not Done** | **Done** | then the 7 category pills
- "+ Add Experience" button → `ExperienceForm` modal
- Click card body → `ExperienceForm` in edit mode

### Category badge colors

| Category      | Color              |
|---------------|--------------------|
| Adventure     | orange             |
| Learning      | blue               |
| Career        | purple             |
| Relationships | pink               |
| Health        | green              |
| Creative      | yellow             |
| Other         | gray               |

---

## Forms

### TripForm

Fields:
- **Destination** (text input, required)
- **Cities** (tag input: type a city name → press Enter or comma to add as a chip; chips are removable)
- **Budget** (number input, €, optional)
- **Target Year** (number input, 4-digit year, optional)
- **Notes** (textarea, optional)

Create mode: blank form. Edit mode: pre-filled. Done status toggled via card, not form.

### ExperienceForm

Fields:
- **Title** (text input, required)
- **Category** (select dropdown, required, default "Other")
- **Target Year** (number input, 4-digit year, optional)
- **Notes** (textarea, optional)

---

## Dashboard Widget

**Widget title:** "Bucket List"

Two stacked progress bars:

```
Trips         ████░░░░  3 / 12 done
Experiences   ███░░░░░  5 / 20 done
```

- Both values come from the same SWR fetches (`/api/bucket-list/trips` and `/api/bucket-list/experiences`) already used by other widgets if loaded, or fetched fresh for the dashboard.
- Widget links to `/bucket-list` on click.
- If both lists are empty: "Nothing on your bucket list yet."

---

## Components

| File | Responsibility |
|------|---------------|
| `src/components/bucket-list/BucketListPage.tsx` | Tab state, SWR fetches for both resources, renders tab bar + active tab content |
| `src/components/bucket-list/TripCard.tsx` | Trip card with done toggle, city chips, budget/year display |
| `src/components/bucket-list/TripForm.tsx` | Create/edit modal for trips including city tag input |
| `src/components/bucket-list/ExperienceCard.tsx` | Experience card with done toggle and category badge |
| `src/components/bucket-list/ExperienceForm.tsx` | Create/edit modal for experiences |
| `src/app/bucket-list/page.tsx` | Page shell: `import BucketListPage` and render |

---

## Sidebar & Dashboard Integration

- **Sidebar:** Add `{ href: '/bucket-list', label: 'Bucket List', active: true }` between Documents and Maintenance in `src/components/Sidebar.tsx`.
- **Dashboard:** Add "Bucket List" `WidgetCard` to `src/components/dashboard/DashboardPage.tsx`. Fetches both `/api/bucket-list/trips` and `/api/bucket-list/experiences` via SWR. Shows two progress bars.
