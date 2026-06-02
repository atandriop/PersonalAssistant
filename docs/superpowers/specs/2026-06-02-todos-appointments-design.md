# Todos & Appointments — Design Spec

**Date:** 2026-06-02
**Status:** Approved

---

## Overview

A single `/tasks` page with two tabs — **Tasks** and **Appointments** — for managing open-ended to-dos and scheduled events respectively. Tasks support subtasks and optional links back to wishlist items or goal milestones. Appointments support recurring schedules, cost tracking, and a category system (Medical, Vehicle, Personal, Other). Upcoming appointments surface on the home dashboard.

---

## Data Model

### Task

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `title` | String | |
| `priority` | String | Low / Medium / High |
| `dueDate` | DateTime? | Optional |
| `category` | String? | Free text |
| `notes` | String? | |
| `done` | Boolean | Default false |
| `createdAt` | DateTime | Default now() |

### Subtask

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `taskId` | Int FK → Task (cascade delete) | |
| `title` | String | |
| `done` | Boolean | Default false |

### TaskSourceLink

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `taskId` | Int FK → Task (cascade delete) | |
| `sourceType` | String | `wishlist` or `goal` |
| `sourceId` | Int | ID of the linked WishlistItem or Goal |

One optional link per task. No FK constraint on sourceId (soft link — survives deletion of source).

### Appointment

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `title` | String | |
| `date` | String | YYYY-MM-DD |
| `time` | String? | HH:MM optional |
| `location` | String? | |
| `category` | String | Medical / Vehicle / Personal / Other |
| `notes` | String? | |
| `done` | Boolean | Default false |
| `cost` | Float? | |
| `recurring` | Boolean | Default false |
| `recurringInterval` | String? | monthly / quarterly / 6months / yearly |
| `createdAt` | DateTime | Default now() |

---

## API Routes

### Tasks

| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks` | List all tasks (includes subtasks and source link) |
| POST | `/api/tasks` | Create task (optionally with subtasks and source link) |
| GET | `/api/tasks/[id]` | Get single task |
| PUT | `/api/tasks/[id]` | Update task fields |
| DELETE | `/api/tasks/[id]` | Delete task (cascades subtasks and link) |
| POST | `/api/tasks/[id]/subtasks` | Add subtask |
| PUT | `/api/tasks/subtasks/[id]` | Toggle done / rename subtask |
| DELETE | `/api/tasks/subtasks/[id]` | Delete subtask |

### Appointments

| Method | Path | Description |
|---|---|---|
| GET | `/api/appointments` | List all appointments |
| POST | `/api/appointments` | Create appointment |
| GET | `/api/appointments/[id]` | Get single appointment |
| PUT | `/api/appointments/[id]` | Update appointment |
| DELETE | `/api/appointments/[id]` | Delete appointment |

---

## Page: `/tasks`

**File structure:**
- `src/app/tasks/page.tsx` — Next.js page shell
- `src/components/tasks/TasksPage.tsx` — main component with tab switcher
- `src/components/tasks/TasksTab.tsx` — Tasks tab
- `src/components/tasks/AppointmentsTab.tsx` — Appointments tab
- `src/components/tasks/TaskForm.tsx` — Create/edit modal for tasks
- `src/components/tasks/AppointmentForm.tsx` — Create/edit modal for appointments

---

## Tasks Tab

### Layout

Tasks grouped into collapsible sections by temporal status, resolved client-side:

1. **Overdue** — `dueDate` is before today, not done
2. **Due soon** — `dueDate` within next 7 days, not done
3. **Upcoming** — `dueDate` beyond 7 days, not done
4. **No due date** — `dueDate` is null, not done
5. **Done** — collapsed by default

### Task Row

- Title, priority badge (coloured: Low=gray, Medium=yellow, High=red), category chip, due date, subtask progress (`2/5`)
- Click row to expand inline: notes, subtask checklist, source link label ("From: Wishlist → Sony Headphones"), edit and delete buttons

### Task Form (modal)

Fields: title (required), priority, due date, category, notes, subtasks (add/remove inline list), source link (optional dropdown: type selector + item picker populated from API).

### "Add to Tasks" integration

- **Wishlist page:** Each wishlist item gets an "Add to Tasks" button. Clicking opens TaskForm pre-filled with the item name and source link set to `wishlist / itemId`.
- **Goals page:** Each milestone gets an "Add to Tasks" button. Clicking opens TaskForm pre-filled with the milestone title and source link set to `goal / goalId`.

---

## Appointments Tab

### Layout

Appointments grouped into sections by temporal status:

1. **Overdue** — date is before today, not done
2. **This Week** — date within next 7 days, not done
3. **Upcoming** — date beyond 7 days, not done
4. **Done** — collapsed by default

### Appointment Row

- Title, category badge, date + time, location (if set), cost (if set), recurring indicator icon
- Click to expand: full details, edit and delete buttons, "Mark done" button
- Recurring appointments show "Mark done & schedule next" instead of plain "Mark done" — this marks the appointment done and creates a new appointment with the title and fields copied, date advanced by the recurring interval

### Appointment Form (modal)

Fields: title (required), date (required), time, location, category (required, select), notes, cost, recurring toggle, recurring interval (shown when recurring is on).

---

## Dashboard Widget

On the home dashboard (`DashboardPage.tsx`): a card titled **"Upcoming Appointments"** showing the next 5 appointments by date (not done, date ≥ today). Each entry shows: title, category badge, date. Clicking an entry navigates to `/tasks` (appointments tab).

The dashboard fetches appointments from `GET /api/appointments` and filters/sorts client-side.

---

## Sidebar

Add one entry to `NAV` in `Sidebar.tsx`:

```ts
{ href: '/tasks', label: 'Tasks', active: true }
```

Positioned after Goals.

---

## Scope Notes

- No server-side push notifications (app runs locally). Reminders are visual only: overdue/due-soon section labels on the Tasks page + dashboard widget.
- Source links are soft (no FK). If a wishlist item or goal is deleted, the task label shows a fallback ("Deleted item").
- Recurring appointment scheduling is manual-trigger only (via "Mark done & schedule next") — no background job.
