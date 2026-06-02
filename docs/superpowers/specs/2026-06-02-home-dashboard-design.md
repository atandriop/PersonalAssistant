# Home Dashboard — Design Spec

## Overview

Replace the placeholder home page (`/`) with a 2×2 widget grid showing today's habits, maintenance alerts, active goals, and gift summaries. All data is fetched from existing API endpoints — no new routes needed.

## Layout

2-column grid (2×2 on desktop, stacked on mobile):

| Top-left | Top-right |
|----------|-----------|
| Habits Today | Maintenance |
| Goals | Gifts |

## Widgets

### Habits Today (top-left)
- Fetches `/api/habits` and `/api/habits/:id/logs` for each habit
- Shows each habit with a toggle circle (green = done today, grey = pending)
- Clicking the circle marks the habit done (POST `/api/habits/:id/logs`) — same as the Habits page
- Shows "X / Y done today" subtitle

### Maintenance (top-right)
- Fetches `/api/maintenance/items` (includes tasks)
- Applies the same `getTaskStatus` + `getItemStatus` logic as the Maintenance page
- Shows only items with `overdue` or `due-soon` status
- Each row: item name + task description + status label (red/amber)
- If nothing is overdue or due soon: shows "All up to date ✓" in green
- Border colour matches worst status (red if any overdue, amber if only due-soon, green if all ok)

### Goals (bottom-left)
- Fetches `/api/life-areas` (includes goals with milestones + habit links)
- Shows up to 4 goals across all areas with the lowest completion %
- Each row: goal title, area name in grey, blended progress bar + %
- Uses the same `calcProgress` logic as the Goals page (client-side, no habit logs needed — milestone-only is fine here for simplicity)

### Gifts (bottom-right)
- Fetches `/api/gifts/people` (includes ideas)
- Shows each person with `X / Y bought` count
- Budget bar if budget is set (committed spend / budget)
- Hides people with no ideas

## Page

- Route: `src/app/page.tsx` — replace the `redirect('/wishlist')` with `<DashboardPage />`
- Component: `src/components/dashboard/DashboardPage.tsx`
- Add `{ href: '/', label: 'Dashboard', active: true }` as the first entry in the sidebar NAV array

## Out of Scope

- Net worth summary on dashboard
- Subscriptions due soon on dashboard
- Clicking a widget item navigating to that feature (can be added later)
