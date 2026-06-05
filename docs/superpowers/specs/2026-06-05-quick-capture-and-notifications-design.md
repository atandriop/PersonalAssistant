# Quick Capture Extension + Browser Notifications — Design Spec

## Overview

Two independent functional improvements. Feature 1 extends the existing `QuickCapture` component to support multiple entity types and adds Cmd+K as a trigger. Feature 2 adds in-page browser notifications for overdue tasks and today's appointments.

---

## Feature 1 — Extended QuickCapture

### Current state

`src/components/QuickCapture.tsx` already exists and mounts in the root layout. It opens a task-creation modal via the `N` key and a fixed `+` floating button. It only creates tasks.

### Changes

**File:** `src/components/QuickCapture.tsx`

**New trigger:** Add `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) to the existing `keydown` listener alongside `N`. The floating `+` button stays unchanged.

**Type picker step:** When the modal opens, `type` state is `null`. The modal body shows three buttons: **Task**, **Appointment**, **Wishlist Item**. Clicking one sets `type` and renders the corresponding form. A `← Back` link resets `type` to `null` without closing the modal.

| Type | Form component | SWR key to mutate after save |
|------|---------------|------------------------------|
| Task | `TaskForm` (already used) | `/api/tasks` |
| Appointment | `AppointmentForm` | `/api/appointments` |
| Wishlist Item | `WishlistForm` | `/api/wishlist` |

After any form saves, the modal closes and the relevant SWR cache is invalidated.

**No new files.** All three form components already exist. `QuickCapture.tsx` imports the two new ones.

---

## Feature 2 — In-page Browser Notifications

### Scope

In-page only: notifications fire while the browser tab is open. No service worker. No server changes.

### New file

`src/components/NotificationScheduler.tsx` — a `useEffect`-only component with no visible UI. Mounts once in `src/app/layout.tsx` alongside `QuickCapture`.

### Behaviour

**Permission:** On first mount, calls `Notification.requestPermission()`. If the result is `'denied'` or `'default'`, the component returns early and does nothing further. No retry logic — if the user denied, they stay denied until they change browser settings.

**Overdue task notification:**
- Fetches `/api/tasks?done=false` on mount
- Filters tasks where `dueDate` exists and `dueDate.slice(0, 10) < today`
- If count > 0 and `localStorage.getItem('notif_overdue_' + today)` is not set:
  - Fires: title `"Homebase"`, body `"You have N overdue task(s) — review them now"`
  - Sets `localStorage.setItem('notif_overdue_' + today, '1')` to prevent repeat on same-day refreshes
- `today` = `new Date().toISOString().slice(0, 10)`

**Appointment reminders:**
- Fetches `/api/appointments` on mount
- Filters for appointments where `date === today` and `time` is set and `done !== true`
- For each, computes `msUntilReminder = appointmentTimeMs - Date.now() - 15 * 60 * 1000`
- If `msUntilReminder > 0`: schedules `setTimeout` to fire notification: title `"Homebase"`, body `"Appointment in 15 min: {title} at {time}"`
- All `setTimeout` IDs are stored in a ref and cleared on unmount

### Layout change

`src/app/layout.tsx` imports and renders `<NotificationScheduler />` as a sibling of `<QuickCapture />`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/QuickCapture.tsx` | Add Cmd+K trigger; add type picker step; import and render AppointmentForm + WishlistForm |
| `src/components/NotificationScheduler.tsx` | New file — permission request + overdue notification + appointment reminders |
| `src/app/layout.tsx` | Import and render `NotificationScheduler` |
