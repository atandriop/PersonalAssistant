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

      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

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
