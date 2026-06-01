# Subscriptions, Habits & Tech Radar — Design Spec

**Date:** 2026-06-01
**Status:** Approved

---

## Overview

Three new pages added to the personal assistant app:

1. **Subscriptions Tracker** — recurring expenses with monthly normalisation and renewal alerts
2. **Habits Tracker** — daily check-off with 12-week per-habit heatmaps and streaks
3. **Tech Radar** — four-ring technology tracking with category tags and AI prompt

---

## Sidebar

Three new entries added to `Sidebar.tsx` NAV array (all `active: true`):

```
Wishlist | Inventory | Matrices | Portfolio | Trends | Weekly Review | System | Subscriptions | Habits | Tech Radar
```

---

## Data Models

Three new Prisma migrations (one per feature):

```prisma
model Subscription {
  id          Int       @id @default(autoincrement())
  name        String
  cost        Float
  period      String    // "monthly" | "yearly"
  renewalDate DateTime?
  url         String?
  notes       String?
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
}

model Habit {
  id        Int        @id @default(autoincrement())
  name      String
  color     String
  logs      HabitLog[]
  createdAt DateTime   @default(now())
}

model HabitLog {
  id      Int    @id @default(autoincrement())
  habitId Int
  habit   Habit  @relation(fields: [habitId], references: [id], onDelete: Cascade)
  date    String // "YYYY-MM-DD" — plain string avoids timezone edge cases
  @@unique([habitId, date])
}

model TechRadarItem {
  id        Int      @id @default(autoincrement())
  name      String
  ring      String   // "adopt" | "trial" | "assess" | "hold"
  category  String   // "language" | "framework" | "tool" | "platform"
  notes     String?
  createdAt DateTime @default(now())
}
```

---

## Page 1: Subscriptions

**Route:** `/subscriptions`
**Files:** `src/components/subscriptions/SubscriptionsPage.tsx`, `src/app/subscriptions/page.tsx`

### Features

- **Add/edit/delete** subscriptions with: name, cost, period (Monthly/Yearly), renewal date (optional), URL (optional), notes (optional), active toggle
- Items sorted by next renewal date (soonest first); inactive items at the bottom
- **Summary strip:** monthly equivalent total, active count, renewing-soon count (within 14 days)
- **Renewal soon badge:** amber badge on items renewing within 14 days (calculated client-side from `renewalDate`)
- **Monthly equivalent:** yearly subscriptions show `€X/yr — €Y.YY/mo` (cost ÷ 12)
- **Filter:** Active only (default) / All (shows inactive/paused)
- **AI Prompt button** (purple, disabled when no subscriptions): opens PromptModal with:

```
Here are my active subscriptions:
- [name]: €[cost]/[period] ([monthly equivalent if yearly])
...

Total monthly spend: €[sum]

Identify any likely redundancies, suggest cuts, and flag anything that seems overpriced for what it provides.
```

### Monthly equivalent calculation

```ts
function monthlyEquivalent(cost: number, period: string): number {
  return period === 'yearly' ? cost / 12 : cost
}
```

### Renewal soon

```ts
function daysUntilRenewal(renewalDate: string): number | null {
  if (!renewalDate) return null
  return Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000)
}
```

Items with `daysUntilRenewal <= 14 && daysUntilRenewal >= 0` show an amber "Renewing in N days" badge.

### API routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/subscriptions` | List all, ordered by renewalDate asc (nulls last) |
| POST | `/api/subscriptions` | Create subscription |
| PUT | `/api/subscriptions/[id]` | Update subscription |
| DELETE | `/api/subscriptions/[id]` | Delete subscription (204) |

---

## Page 2: Habits

**Route:** `/habits`
**Files:** `src/components/habits/HabitsPage.tsx`, `src/app/habits/page.tsx`

### Features

**Today's check-off strip** (top of page):
- A button per habit showing its name and colour
- Filled = done today, outlined = not yet done
- Click toggles: POSTs to create log or DELETEs to remove today's log
- Optimistic UI update via SWR mutate

**Per-habit rows** (below strip):
- Habit name + colour dot
- Streak counter: 🔥 N days (consecutive days ending today or yesterday)
- 12-week mini heatmap (84 squares = 12 × 7):
  - Columns = weeks (oldest left, newest right)
  - Rows = Mon–Sun
  - Done = habit colour at full opacity; missed = `bg-gray-100 dark:bg-gray-800`; today = ring border
- Heatmap data fetched from `GET /api/habits/[id]/logs?weeks=12`

**Streak calculation rule:**
- Count backwards from today
- If today is not yet logged, check from yesterday (so you don't break streak before end of day)
- Reset on first missing day

**Add/edit/delete:**
- "Add habit" button → modal with name + colour picker (8 preset colours, same as CategoryManager)
- Edit via inline button; delete with confirm

### API routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/habits` | List all habits |
| POST | `/api/habits` | Create habit |
| PUT | `/api/habits/[id]` | Update name/colour |
| DELETE | `/api/habits/[id]` | Delete habit + cascade logs (204) |
| GET | `/api/habits/[id]/logs` | Return log dates for last 84 days (query param `?weeks=12`) |
| POST | `/api/habits/[id]/logs` | Toggle today's log (create if missing, delete if exists) |

Toggle logic in POST:

```ts
const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
const existing = await prisma.habitLog.findUnique({
  where: { habitId_date: { habitId, date: today } }
})
if (existing) {
  await prisma.habitLog.delete({ where: { id: existing.id } })
  return NextResponse.json({ action: 'deleted' })
} else {
  await prisma.habitLog.create({ data: { habitId, date: today } })
  return NextResponse.json({ action: 'created' }, { status: 201 })
}
```

---

## Page 3: Tech Radar

**Route:** `/tech-radar`
**Files:** `src/components/techradar/TechRadarPage.tsx`, `src/app/tech-radar/page.tsx`

### Features

**Layout:** 2×2 grid of coloured panels on wider screens, stacked on mobile:

| Ring | Colour | Meaning |
|---|---|---|
| Adopt | Green (`#10b981`) | Actively using in production |
| Trial | Amber (`#f59e0b`) | Actively evaluating |
| Assess | Blue (`#3b82f6`) | Worth watching |
| Hold | Gray (`#6b7280`) | Moving away from / avoiding |

**Each item shows:**
- Name
- Category badge (Language / Framework / Tool / Platform) — coloured pill
- Notes (optional) — shown as expandable text below the name, collapsed by default
- Ring-change dropdown: small "Move to…" selector that updates the item's ring inline
- Delete button with confirm

**Add item:** "+" button in each panel header → inline form within that panel (name, category, optional notes). Alternatively a global "+ Add item" button at the top that opens a modal with ring selector.

**Filter bar:** category filter at the top (All / Language / Framework / Tool / Platform) — filters across all four panels simultaneously.

**AI Prompt button** (purple): opens PromptModal with:

```
Here is my tech radar:

ADOPT:
- [name] ([category])[: notes if present]
...

TRIAL:
- [name] ([category])
...

ASSESS:
- [name] ([category])
...

HOLD:
- [name] ([category])
...

Based on current industry trends (2026), what am I missing in each ring? Flag anything in Adopt that may be worth reconsidering, and suggest 2-3 technologies I should move from Assess to Trial.
```

### API routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/tech-radar` | List all items, ordered by ring then createdAt |
| POST | `/api/tech-radar` | Create item |
| PUT | `/api/tech-radar/[id]` | Update item (name, ring, category, notes) |
| DELETE | `/api/tech-radar/[id]` | Delete item (204) |

---

## File Map

| File | Action |
|---|---|
| `prisma/schema.prisma` | Modify — add Subscription, Habit, HabitLog, TechRadarItem models |
| `src/app/api/subscriptions/route.ts` | Create — GET, POST |
| `src/app/api/subscriptions/[id]/route.ts` | Create — PUT, DELETE |
| `src/app/api/habits/route.ts` | Create — GET, POST |
| `src/app/api/habits/[id]/route.ts` | Create — PUT, DELETE |
| `src/app/api/habits/[id]/logs/route.ts` | Create — GET, POST (toggle) |
| `src/app/api/tech-radar/route.ts` | Create — GET, POST |
| `src/app/api/tech-radar/[id]/route.ts` | Create — PUT, DELETE |
| `src/components/subscriptions/SubscriptionsPage.tsx` | Create |
| `src/app/subscriptions/page.tsx` | Create |
| `src/components/habits/HabitsPage.tsx` | Create |
| `src/app/habits/page.tsx` | Create |
| `src/components/techradar/TechRadarPage.tsx` | Create |
| `src/app/tech-radar/page.tsx` | Create |
| `src/components/Sidebar.tsx` | Modify — add 3 entries |
