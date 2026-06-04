# Dashboard Interactive Widgets — Design Spec

## Goal

Upgrade four existing read-only dashboard widgets (Goals, Appointments, Travel, Gifts) to support inline actions and modal-based CRUD, so the user can check milestones, manage appointments, view upcoming trips, and edit gifts without leaving the dashboard.

---

## Decisions Made

| Question | Decision |
|---|---|
| Interaction model | Inline buttons + modal forms (Option A) |
| Travel widget layout | Keep stats + "Next up" upcoming trips section below |
| Goals milestones | Always visible inline checkboxes under each goal |
| Architecture | Extract gift forms; reuse existing appointment/trip forms |

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/components/gifts/GiftPersonForm.tsx` | Person form extracted from GiftsPage.tsx (name, budget, notes) |
| `src/components/gifts/GiftIdeaForm.tsx` | Idea form extracted from GiftsPage.tsx (title, occasion, cost, notes, personId) |

### Modified files

| File | Change |
|---|---|
| `src/components/gifts/GiftsPage.tsx` | Import PersonForm and IdeaForm from new files instead of defining inline |
| `src/components/dashboard/DashboardPage.tsx` | Upgrade 4 widgets with actions and modals |

### Existing components reused with no changes

| Component | Used for |
|---|---|
| `src/components/tasks/AppointmentForm.tsx` | Add / edit appointments from dashboard |
| `src/components/travel/TripForm.tsx` | Add / edit trips from dashboard |
| `PUT /api/milestones/[id]` | Toggle milestone completedAt |
| `PUT /api/appointments/[id]` | Mark appointment done |

No schema changes. No new API routes.

---

## Widget 1: Goals

### Current behaviour
Shows the 4 lowest-completion goals (sorted by milestone completion %) with a progress bar per goal.

### New behaviour
Below each goal's progress bar, the goal's milestones are listed as interactive checkboxes:

- Uncompleted milestones: checkbox unchecked, normal text
- Completed milestones: checkbox checked, title struck through, dimmed
- Clicking a checkbox calls `PUT /api/milestones/[id]` with `{ completedAt: new Date().toISOString() }` (to complete) or `{ completedAt: null }` (to undo)
- After toggle, optimistically mutate the `/api/life-areas` SWR key so the progress bar updates immediately
- All milestones are shown (no hard cap) — completed ones are shown dimmed after incomplete ones

No new API work. The `/api/life-areas` response already includes goals → milestones.

---

## Widget 2: Appointments

### Current behaviour
Shows next 5 upcoming (not-done) appointments sorted by date. Read-only.

### New behaviour

**Header additions:**
- `+ Add` button → opens `AppointmentForm` in a `Modal`, no initial data

**Per-row additions:**
- `✓` button → calls `PUT /api/appointments/[id]` with `{ done: true }`, then mutates appointments SWR data
- `Edit` button → opens `AppointmentForm` in a `Modal` pre-filled with the appointment

**Recurring appointments:** Marking done from the dashboard does not auto-schedule the next recurrence. That complexity stays on the full Appointments page.

**Data:** No change. Still fetches `/api/appointments`, filters upcoming, shows next 5.

---

## Widget 3: Travel

### Current behaviour
Shows 3 aggregate stats (countries count, trips count, total spend) and a "View Travel" link.

### New behaviour

**Top section (unchanged):** 3 stat numbers.

**"Next up" section (new):** Upcoming trips where `startDate >= today`, sorted by `startDate` ascending, up to 3 shown:
- Country name
- Cities (comma-joined from the `cities` JSON array)
- Date range formatted as "MMM D–D" (e.g. "Jul 10–20") or "MMM D – MMM D" if crossing months
- "X days away" (days until startDate)
- Edit pencil → opens `TripForm` in a `Modal` pre-filled with the trip

If no upcoming trips: show a subtle "No upcoming trips" message in the section.

**Footer:**
- `+ Add trip` button → opens `TripForm` in a `Modal` empty
- `View all →` link (unchanged)

**Data:** Already fetches `/api/travel/trips`. Filtering and sorting for upcoming trips is done client-side. No API changes.

---

## Widget 4: Gifts

### Current behaviour
Shows person cards with gift purchase progress (X/Y ideas bought) and budget progress bar.

### New behaviour

**Header additions:**
- `+ Add person` button → opens `GiftPersonForm` in a `Modal`, no initial data

**Per-card additions (each person card):**
- `Edit` button → opens `GiftPersonForm` in a `Modal` pre-filled with the person
- `+ Idea` button → opens `GiftIdeaForm` in a `Modal` with the person pre-selected

The rest of each card (name, count, budget bar) is unchanged.

**Data:** Already fetches `/api/gifts/people`. After any action, mutate to refresh.

---

## Form extraction: GiftsPage.tsx

`PersonForm` and `IdeaForm` are currently defined as named functions inside `GiftsPage.tsx`. They will be moved to separate files:

**`GiftPersonForm.tsx`** — props: `initial?: { id, name, budget, notes }`, `onSave()`, `onCancel()`

**`GiftIdeaForm.tsx`** — props: `personId: number`, `initial?: { id, title, occasion, estimatedCost, notes }`, `onSave()`, `onCancel()`

`GiftsPage.tsx` imports from those files. Behaviour is identical — only file boundaries change.

---

## Out of scope

- Recurring appointment auto-scheduling from dashboard
- Marking individual gift ideas as purchased from dashboard (use full Gifts page)
- Deleting appointments / trips / people / ideas from dashboard (use full pages)
- Adding milestones from dashboard (use Life page)
