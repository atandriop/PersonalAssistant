# Timeline Page — Design Spec

## Overview

New read-only page at `/timeline` showing all time-sensitive items grouped into time buckets. Data sources: maintenance tasks (using existing `getTaskStatus` logic) and subscription renewals. Milestones and goals are excluded — they have no target date in the schema.

## Route & Component

- `src/app/timeline/page.tsx` — renders `<TimelinePage />`
- `src/components/timeline/TimelinePage.tsx` — new component
- Sidebar: add `{ href: '/timeline', label: 'Timeline', active: true }` after Maintenance

## Data

Fetches:
- `GET /api/maintenance/items` — includes tasks
- `GET /api/subscriptions` — all subscriptions

## Time Buckets

Items are sorted into these buckets (empty buckets are hidden):

| Bucket | Condition |
|--------|-----------|
| **Overdue** | nextDue < today |
| **This week** | today ≤ nextDue ≤ end of current week (Sunday) |
| **Next 30 days** | within 30 days (not already in "this week") |
| **Next 90 days** | within 31–90 days |

For maintenance tasks: use `getTaskStatus(task)` from `@/lib/maintenance` to compute `nextDue`. Only include tasks with status `'overdue'` or `'due-soon'` (skip `'ok'` and `'none'`). Actually include ALL tasks with a computable `nextDue` up to 90 days — not just overdue/due-soon.

Revised: include tasks where `nextDue` exists and is ≤ 90 days from today (or already past).

For subscriptions: include active subscriptions where `renewalDate` is not null, and is ≤ 90 days from today (or already past). `renewalDate` may be an ISO string from the DB — slice to `YYYY-MM-DD` for comparison.

## Timeline Entry Shape

Each entry in the combined list:

```typescript
interface TimelineEntry {
  type: 'maintenance' | 'subscription'
  label: string        // subscription name, OR HomeItem name
  sublabel?: string    // maintenance task description (undefined for subscriptions)
  date: string         // YYYY-MM-DD
  status: 'overdue' | 'due-soon' | 'ok'
}
```

Status colours: overdue = red, due-soon = amber, ok = green.

## Row Layout

Each row:
```
[type badge] [label]         [sublabel in grey]     [date]  [status chip]
  MAINT       Boiler           Annual service         12 Jun    Overdue
  SUB         Netflix          —                      18 Jun    Due soon
```

Type badge: small pill — "Maintenance" (blue) or "Subscription" (purple).

## Empty State

If no entries at all: `"Nothing due in the next 90 days."` centred.

## Out of Scope

- Adding target dates to milestones/goals
- Habit-based timeline entries
- Mark-done actions from the timeline (read-only)
