# Home Maintenance Log — Design Spec

## Overview

A home maintenance tracker organised by item (Boiler, Car, AC, etc.). Each item has scheduled tasks (recurring or one-off) and a log of past maintenance. Items display a colour-coded status based on how urgent their upcoming tasks are.

## Data Model

```
HomeItem
  id        Int      @id @default(autoincrement())
  name      String
  notes     String?
  createdAt DateTime @default(now())

MaintenanceLog
  id         Int      @id @default(autoincrement())
  homeItemId Int
  homeItem   HomeItem @relation(fields: [homeItemId], references: [id], onDelete: Cascade)
  description String
  date        String  -- "YYYY-MM-DD"
  cost        Float?
  notes       String?
  createdAt   DateTime @default(now())

MaintenanceTask
  id             Int      @id @default(autoincrement())
  homeItemId     Int
  homeItem       HomeItem @relation(fields: [homeItemId], references: [id], onDelete: Cascade)
  description    String
  intervalMonths Int?     -- recurring: number of months between services
  dueDate        String?  -- "YYYY-MM-DD", for one-off tasks
  lastDoneDate   String?  -- "YYYY-MM-DD", updated when task is marked done
  createdAt      DateTime @default(now())
```

A task uses either `intervalMonths` (recurring) or `dueDate` (one-off) — not both.

## Status Calculation

Computed client-side per task:

- **Recurring** (`intervalMonths` set): `nextDue = addMonths(task.lastDoneDate, intervalMonths)`. If `lastDoneDate` is null, `nextDue = addMonths(task.createdAt, intervalMonths)`.
- **One-off** (`dueDate` set): `nextDue = task.dueDate`.

Thresholds:
- `nextDue < today` → **overdue** (red)
- `nextDue < today + 30 days` → **due soon** (amber)
- Otherwise → **ok** (green)
- Item with no tasks → neutral (no colour border)

Item's overall status = most urgent status across all its tasks.

## Pages & Navigation

### `/maintenance` — Main page

**Top bar:** "Maintenance" heading + "+ Add item" button (opens modal).

**Grid of item cards** (2 columns on desktop):
- Each card: status colour border (red/amber/green/none), item name, most urgent task label + next-due date, last log date
- Clicking card expands in-place to show:

  **Scheduled tasks section:**
  - List of tasks showing description, next-due date, interval badge ("every 12 mo") or fixed date badge
  - "+ Mark done" button on each task: opens a quick-log modal pre-filled with the task description and today's date; on save, creates the log AND sets `task.lastDoneDate` to the logged date, then refreshes
  - Edit/Delete task on hover

  **Log history section:**
  - Most recent first; each row: date, description, cost (if set)
  - "+ Log maintenance" button: opens a log modal (description, date, cost, notes)
  - Delete log on hover

  **Card header `⋯` menu:** Edit item (name/notes) or Delete item (with confirm)

### Modals

- **Add/edit item**: name (required), notes
- **Add/edit task**: description (required), type toggle (Recurring / One-off), intervalMonths or dueDate depending on type
- **Add/edit log**: description (required), date (required, default today), cost, notes

### Sidebar

Add "Maintenance" entry after Goals in the NAV array.

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/maintenance/items` | List all items with tasks and logs |
| POST | `/api/maintenance/items` | Create item |
| PUT | `/api/maintenance/items/[id]` | Update item |
| DELETE | `/api/maintenance/items/[id]` | Delete item (cascades) |
| POST | `/api/maintenance/items/[id]/tasks` | Create task |
| PUT | `/api/maintenance/tasks/[id]` | Update task |
| DELETE | `/api/maintenance/tasks/[id]` | Delete task |
| POST | `/api/maintenance/items/[id]/logs` | Create log |
| DELETE | `/api/maintenance/logs/[id]` | Delete log |

## Out of Scope

- Push notifications or reminders for overdue tasks
- Attaching photos to logs
- Cost reports or analytics
