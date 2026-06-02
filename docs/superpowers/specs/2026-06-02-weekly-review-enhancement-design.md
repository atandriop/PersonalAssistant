# Weekly Review Enhancement — Design Spec

## Overview

Add four new data sections to the existing Weekly Review page: Habits this week, Goal progress, Maintenance alerts, and Subscriptions renewing soon. All data comes from existing API endpoints.

## New Sections

Each new section uses the existing `WeekSection` component pattern.

### Habits This Week
- Fetches `/api/habits` + `/api/habits/:id/logs` for each habit
- For each habit: shows name, colour dot, and completion rate for the current week (Mon–Sun)
- Completion = number of logs this week / 7, shown as `X/7` and a mini progress bar
- Sorted by completion rate ascending (least done first)

### Goal Progress
- Fetches `/api/life-areas` (includes goals with milestones)
- For each goal: title, area name tag, milestone progress (`X / Y milestones`)
- Milestone-only progress bar (no habit logs fetched — weekly review is a quick read)
- Only shows goals that have at least one milestone; hides empty goals

### Maintenance Alerts
- Fetches `/api/maintenance/items` (includes tasks)
- Shows only items with at least one overdue or due-soon task
- Each row: item name, task description, status (overdue/due soon)
- If nothing needs attention: shows "Nothing overdue or due soon"

### Subscriptions Renewing Soon
- Fetches `/api/subscriptions`
- Shows active subscriptions with `renewalDate` within the next 30 days
- Each row: subscription name, renewal date, cost + period
- Sorted by renewal date ascending
- If none renewing soon: section is hidden entirely

## Placement

New sections appear after the existing Portfolio section, in this order:
1. (existing) Wishlist
2. (existing) Portfolio
3. Habits This Week ← new
4. Goal Progress ← new
5. Maintenance Alerts ← new
6. Subscriptions Renewing Soon ← new

## API Changes

The existing `/api/weekly-review` endpoint returns wishlist, inventory, and portfolio data. No changes needed — new sections fetch their own data directly in the component using `useSWR`.

## Out of Scope

- AI prompt integration for new sections
- Saving notes per section
