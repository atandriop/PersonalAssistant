# Habits + Goals Unified Page Design

## Goal

Replace the Goals/Habits tab switcher on `/life` with a single unified view split by LifeArea. Each area section shows its goals first, then the habits assigned to that area. There are no tabs.

## Background

`/life` currently renders `LifePage.tsx`, which has a two-tab switcher: Goals (renders `GoalsPage`) and Habits (renders `HabitsPage`). The sidebar only links to `/life`; the separate `/goals` and `/habits` routes exist for dashboard deep-links and remain unchanged.

Goals already belong to a LifeArea via `lifeAreaId`. Habits currently have no area affiliation.

## Data Model

Add a nullable `lifeAreaId` to `Habit`:

```prisma
model Habit {
  id         Int             @id @default(autoincrement())
  lifeAreaId Int?
  lifeArea   LifeArea?       @relation(fields: [lifeAreaId], references: [id], onDelete: SetNull)
  name       String
  color      String
  logs       HabitLog[]
  goalLinks  GoalHabitLink[]
  archivedAt DateTime?
  createdAt  DateTime        @default(now())
}

model LifeArea {
  id        Int      @id @default(autoincrement())
  name      String
  color     String
  goals     Goal[]
  habits    Habit[]  // new relation
  createdAt DateTime @default(now())
}
```

`onDelete: SetNull` — deleting a LifeArea leaves habits unassigned, not deleted. Existing habits start with `lifeAreaId: null` (unassigned).

## API Changes

### `GET /api/life-areas`
Currently returns: `{ id, name, color, goals[] }` per area.
After: also includes `habits[]` per area, where each habit has `{ id, name, color, lifeAreaId, archivedAt }`. Non-archived only.

### `GET /api/habits`
Currently omits `lifeAreaId` from the response shape. After: include `lifeAreaId: number | null` in each habit object.

### `PUT /api/habits/[id]`
Accept `lifeAreaId: number | null` in the request body and persist it. Passing `null` explicitly unassigns the habit.

## Components

### New: `src/components/habits/HabitRow.tsx`
Extract the existing `HabitRow` component from `HabitsPage.tsx` into its own file. Props and behavior are unchanged — same heatmap (12 weeks), streak counter, "Mark done" / note input, Edit / Archive / Delete buttons. Both `HabitsPage` and the new `LifePage` import from here.

### Modified: `src/components/habits/HabitsPage.tsx`
Replace the inline `HabitRow` definition with an import from `./HabitRow`. No other changes.

### New: `src/components/habits/HabitForm.tsx`
Extract `HabitForm` from `HabitsPage.tsx` into its own file. Add a LifeArea dropdown field:
- Options: "None (unassigned)" + one entry per LifeArea (fetched from `/api/life-areas`)
- Default: "None (unassigned)" for new habits; pre-filled with current area for edits
- Sends `lifeAreaId: number | null` in PUT/POST body

### Rewritten: `src/components/life/LifePage.tsx`
No tabs. Fetches `/api/life-areas` (which now includes habits per area). Layout:

**Page header:**
- Title: "Life"
- "Generate AI Prompt" button (combined habits + goals prompt)
- "Add area" button

**Area grid (2 columns, same as current GoalsPage):**
Each area is a collapsible accordion card. When collapsed: shows area name, color dot, progress bar, goal+habit count, %. When expanded:

1. **Goals subsection** — `div` with "GOALS" label, list of GoalRows (existing behavior: expandable with milestones, habit links, etc.), "+ Add goal" link
2. **Habits subsection** — `div` with "HABITS" label, list of HabitRow components for habits assigned to this area, "+ Add habit" link (opens HabitForm pre-filled with this area's `lifeAreaId`)

**Unassigned habits (bottom, collapsed by default):**
Collapsible section showing HabitRow components for habits with `lifeAreaId: null`. Label: "Unassigned habits (N)". Hidden if N = 0.

**Archive section:** Archived habits remain accessible via a collapsed "Archived" section at the very bottom (same as current HabitsPage).

## AI Prompt

The "Generate AI Prompt" button on the unified page generates a single combined prompt covering:
- All life areas with their goals (milestones, habit consistency) — same content as current GoalsPage prompt
- All habits with streak and 12-week consistency — same content as current HabitsPage prompt

This replaces the two separate prompt buttons.

## What Does Not Change

- `src/app/goals/page.tsx` and `src/components/goals/GoalsPage.tsx` — unchanged
- `src/app/habits/page.tsx` and the core habit tracking logic — unchanged
- `src/app/api/goals/` routes — unchanged
- All milestone, GoalHabitLink, and habit log APIs — unchanged
- Dashboard widgets for habits and goals — unchanged
