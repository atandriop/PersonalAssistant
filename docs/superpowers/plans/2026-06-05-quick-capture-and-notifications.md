# Quick Capture Extension + Browser Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend QuickCapture to support Task/Appointment/Wishlist creation with Cmd+K, and add in-page browser notifications for overdue tasks and today's appointments.

**Architecture:** Two independent changes. QuickCapture.tsx gains a type-picker step and a second keyboard trigger. A new NotificationScheduler component (no UI) mounts in the root layout and uses the Notifications API + setTimeout to fire overdue and appointment reminders.

**Tech Stack:** Next.js 14, React 18, TypeScript, Web Notifications API, SWR mutate

---

## File Map

| File | Change |
|------|--------|
| `src/components/QuickCapture.tsx` | Add Cmd+K trigger; add `type` state and type-picker UI; import + render AppointmentForm and WishlistForm |
| `src/components/NotificationScheduler.tsx` | New file — permission, overdue notification, appointment setTimeout reminders |
| `src/app/layout.tsx` | Import and render `NotificationScheduler` |

---

## Task 1: Extended QuickCapture

**Files:**
- Modify: `src/components/QuickCapture.tsx`

**Context:** The current file opens a TaskForm modal on `N` keypress. We're replacing the entire file with a version that adds Cmd+K and a type-picker step. The three form components exist at:
- `src/components/tasks/TaskForm.tsx` (already imported)
- `src/components/tasks/AppointmentForm.tsx`
- `src/components/wishlist/WishlistForm.tsx`

- [ ] **Step 1: Replace `QuickCapture.tsx` with the extended version**

Replace the entire contents of `src/components/QuickCapture.tsx` with:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/tasks/TaskForm'
import AppointmentForm from '@/components/tasks/AppointmentForm'
import WishlistForm from '@/components/wishlist/WishlistForm'

type CaptureType = 'task' | 'appointment' | 'wishlist' | null

const TYPES = [
  { id: 'task' as const,        label: 'Task',          color: 'bg-indigo-600 hover:bg-indigo-700' },
  { id: 'appointment' as const, label: 'Appointment',   color: 'bg-blue-600 hover:bg-blue-700' },
  { id: 'wishlist' as const,    label: 'Wishlist Item', color: 'bg-purple-600 hover:bg-purple-700' },
]

export default function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<CaptureType>(null)

  function openModal() {
    setType(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setType(null)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return
      const isN = e.key === 'n' || e.key === 'N'
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key === 'k'
      if (isN || isCmdK) {
        e.preventDefault()
        openModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeType = TYPES.find(t => t.id === type)

  return (
    <>
      <button
        onClick={openModal}
        title="Quick capture (N or Ctrl+K)"
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl font-light z-40 transition-colors"
      >
        +
      </button>
      {open && (
        <Modal
          title={activeType ? `New ${activeType.label}` : 'Quick capture'}
          onClose={close}
        >
          {type === null && (
            <div className="flex flex-col gap-3 py-2">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`w-full py-3 rounded-lg text-white font-medium text-sm ${t.color} transition-colors`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {type !== null && (
            <div>
              <button
                onClick={() => setType(null)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 flex items-center gap-1"
              >
                ← Back
              </button>
              {type === 'task' && (
                <TaskForm
                  onSave={() => { close(); mutate('/api/tasks') }}
                  onCancel={close}
                />
              )}
              {type === 'appointment' && (
                <AppointmentForm
                  onSave={() => { close(); mutate('/api/appointments') }}
                  onCancel={close}
                />
              )}
              {type === 'wishlist' && (
                <WishlistForm
                  onSave={() => { close(); mutate('/api/wishlist') }}
                  onCancel={close}
                />
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/QuickCapture.tsx
git commit -m "feat: extend QuickCapture with type picker and Cmd+K trigger"
```

---

## Task 2: NotificationScheduler component

**Files:**
- Create: `src/components/NotificationScheduler.tsx`

**Context:** This is a headless component (`return null`) that runs a single `useEffect` on mount. It requests Notification permission, checks for overdue tasks (once per day via localStorage), and schedules setTimeout reminders for today's appointments with a time set. All timers are cleared on unmount.

The API routes it calls:
- `GET /api/tasks?done=false` → array of `{ id, dueDate, done, ... }`
- `GET /api/appointments` → array of `{ id, title, date, time, done, ... }`

- [ ] **Step 1: Create `src/components/NotificationScheduler.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface Task {
  id: number
  dueDate?: string | null
}

interface Appointment {
  id: number
  title: string
  date: string
  time?: string | null
  done?: boolean
}

export default function NotificationScheduler() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    async function init() {
      if (typeof window === 'undefined' || !('Notification' in window)) return

      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()

      if (permission !== 'granted') return

      const today = new Date().toISOString().slice(0, 10)

      // Overdue tasks — fire once per calendar day
      const overdueKey = `notif_overdue_${today}`
      if (!localStorage.getItem(overdueKey)) {
        const tasks: Task[] = await fetch('/api/tasks?done=false')
          .then(r => r.json())
          .catch(() => [])
        const overdue = tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) < today)
        if (overdue.length > 0) {
          new Notification('Homebase', {
            body: `You have ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'} — review them now`,
          })
          localStorage.setItem(overdueKey, '1')
        }
      }

      // Appointment reminders — 15 min before each timed appointment today
      const appointments: Appointment[] = await fetch('/api/appointments')
        .then(r => r.json())
        .catch(() => [])
      const now = Date.now()

      for (const appt of appointments) {
        if (appt.date !== today || !appt.time || appt.done) continue
        const apptMs = new Date(`${today}T${appt.time}`).getTime()
        const msUntilReminder = apptMs - now - 15 * 60 * 1000
        if (msUntilReminder > 0) {
          const id = setTimeout(() => {
            new Notification('Homebase', {
              body: `Appointment in 15 min: ${appt.title} at ${appt.time}`,
            })
          }, msUntilReminder)
          timers.current.push(id)
        }
      }
    }

    init()
    return () => timers.current.forEach(clearTimeout)
  }, [])

  return null
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/NotificationScheduler.tsx
git commit -m "feat: NotificationScheduler — overdue tasks + appointment reminders"
```

---

## Task 3: Mount NotificationScheduler in root layout

**Files:**
- Modify: `src/app/layout.tsx`

**Context:** The root layout currently renders `<Sidebar />`, `<main>`, and `<QuickCapture />`. We add `<NotificationScheduler />` as a sibling.

- [ ] **Step 1: Update `src/app/layout.tsx`**

Replace the entire file with:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import QuickCapture from '@/components/QuickCapture'
import NotificationScheduler from '@/components/NotificationScheduler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Homebase',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <QuickCapture />
          <NotificationScheduler />
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: mount NotificationScheduler in root layout"
```

---

## Verification

After all tasks are committed:

- [ ] Start dev server: `npm run dev`
- [ ] Press `Ctrl+K` (or `N` from any page not focused on an input) — modal should open showing 3 type buttons
- [ ] Click **Task** → TaskForm renders with a `← Back` link; click back → type picker returns
- [ ] Click **Appointment** → AppointmentForm renders; fill title + date + save → modal closes
- [ ] Click **Wishlist Item** → WishlistForm renders; fill name + cost + save → modal closes
- [ ] Browser should have prompted for notification permission on first load (check browser address bar for the bell icon)
- [ ] To test overdue notification: open browser console, run `localStorage.removeItem('notif_overdue_2026-06-05')`, then reload — if you have overdue tasks, a notification should fire
- [ ] To test appointment reminder: add an appointment for today with a time 16+ minutes in the future; reload the app; at T-15 min the notification fires
