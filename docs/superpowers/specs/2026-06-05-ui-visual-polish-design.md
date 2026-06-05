# UI Visual Polish — Design Spec

## Overview

Three targeted improvements to make Homebase more visually appealing and easier to navigate daily: sidebar icons, Today page color-coded sections, and Dashboard widget color accents. No new features, no database changes, no pages beyond the two highest-use ones.

---

## Part 1 — Sidebar Icons

**Goal:** Faster visual scanning. Currently all 17 nav links are text-only; adding icons lets the eye land on the right item without reading.

**Library:** `lucide-react` (add as dependency if not present).

**Icon assignment:**

| Link | Icon |
|------|------|
| Dashboard | `LayoutDashboard` |
| Today | `Sun` |
| Weekly Review | `CalendarCheck` |
| Tasks & Gifts | `CheckSquare` |
| Decisions | `GitFork` |
| Documents | `FileText` |
| Finance | `TrendingUp` |
| Items | `ShoppingBag` |
| Life | `Heart` |
| Maintenance | `Wrench` |
| Experiences | `Compass` |
| Search | `Search` |
| Tech Radar | `Target` |
| System | `Settings` |

**Active state (new):** Solid blue fill (`bg-blue-700 dark:bg-blue-700`) + 3px left border (`border-l-[3px] border-blue-400`) + white text + blue-tinted icon. Currently the active state uses a lighter tint (`bg-blue-50 dark:bg-blue-900/40`) — the new solid fill makes the active item much more prominent.

**Inactive state:** Keep existing hover behavior. Icons render at 15×15px in `text-gray-500 dark:text-gray-500`. On active, icon color matches the text (white).

**File:** `src/components/Sidebar.tsx`

---

## Part 2 — Today Page Color-Coded Sections

**Goal:** Each section is instantly distinguishable. Currently all cards look identical (white/dark bg, same gray border, plain uppercase title). Adding a colored left border + matching icon + colored title text makes each section scannable at a glance.

**Color scheme:**

| Section | Color | Hex |
|---------|-------|-----|
| Habits | Amber | `#f59e0b` |
| Overdue | Red | `#ef4444` |
| Today's Appointments | Blue | `#3b82f6` |
| Upcoming Renewals | Orange | `#f97316` |
| Pending Gifts | Purple | `#a855f7` |
| Due Today | Indigo | `#6366f1` |

**Implementation:** Replace the `SectionHeader` component with a `ColoredSectionHeader` that accepts `icon` (SVG element), `color` (hex), `title`, and optional `count`. The old `SectionHeader` is removed entirely — all six section headers in `TodayPage` switch to `ColoredSectionHeader`. Each card `div` adds a colored left border via inline style (since arbitrary Tailwind colors can't be generated dynamically with `border-l-[#hex]`).

**Card structure change:**
```
Before: border border-gray-200 dark:border-gray-700
After:  border border-gray-200 dark:border-gray-700 [+ inline style: borderLeftColor + borderLeftWidth:3px]
```

**File:** `src/components/today/TodayPage.tsx`

---

## Part 3 — Dashboard Widget Color Accents

**Goal:** Same visual language as Today page, but without left borders (widgets are in a grid, not a vertical list). Each widget header gets a colored icon + colored title text to distinguish widget types at a glance.

**Color scheme (consistent with Today page where types overlap):**

| Widget | Color | Hex |
|--------|-------|-----|
| Habits Today | Amber | `#f59e0b` |
| Maintenance | Dynamic: red `#f87171` (overdue) / amber `#fbbf24` (due-soon) / green `#34d399` (ok) | derives from `worstMaintenance` — same value already used for `borderStyle` |
| Goals | Emerald | `#10b981` |
| Gifts | Purple | `#a855f7` |
| Upcoming Appointments | Blue | `#3b82f6` |
| Overdue Tasks | Red | `#ef4444` |
| On This Day | Rose | `#f43f5e` |
| Subscriptions Renewing | Orange | `#f97316` |
| Travel | Teal | `#14b8a6` |
| Memories | Violet | `#8b5cf6` |
| Bucket List | Sky | `#0ea5e9` |
| Expiring Documents | Yellow | `#eab308` |

**Implementation:** Update `WidgetCard` to accept optional `icon: React.ReactNode` and `accentColor: string` props. When provided, the title renders in `accentColor` and the icon renders inline before it. The existing `borderStyle` prop (used by Maintenance for dynamic red/amber/green border) is kept unchanged.

Each widget call site passes the appropriate icon (from `lucide-react`) and hex color.

**File:** `src/components/dashboard/DashboardPage.tsx`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/Sidebar.tsx` | Add lucide-react icons per link, update active state styling |
| `src/components/today/TodayPage.tsx` | New `ColoredSectionHeader`, colored left borders per card |
| `src/components/dashboard/DashboardPage.tsx` | Update `WidgetCard` with `icon`/`accentColor` props, pass per widget |
| `package.json` + `package-lock.json` | Add `lucide-react` (not currently installed) |
