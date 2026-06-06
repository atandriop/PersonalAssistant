'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export type EventSourceType = 'task' | 'appointment' | 'trip' | 'subscription' | 'document' | 'maintenance'

export interface CalEvent {
  id: string
  type: EventSourceType
  date: Date
  endDate?: Date   // only for trips spanning multiple days
  title: string
  meta: string     // secondary line shown in agenda
}

export const SOURCE_COLOR: Record<EventSourceType, string> = {
  task:         '#3b82f6',
  appointment:  '#10b981',
  trip:         '#f59e0b',
  subscription: '#8b5cf6',
  document:     '#ef4444',
  maintenance:  '#6b7280',
}

export const SOURCE_LABEL: Record<EventSourceType, string> = {
  task:         'Task',
  appointment:  'Appointment',
  trip:         'Travel',
  subscription: 'Subscription',
  document:     'Document',
  maintenance:  'Maintenance',
}

// Raw shapes returned by each API endpoint
interface RawTask        { id: number; title: string; dueDate: string | null; priority: string; category: string | null }
interface RawAppointment { id: number; title: string; date: string; time: string | null; category: string; location: string | null; done: boolean }
interface RawTrip        { id: number; startDate: string | null; endDate: string | null; countryName: string; cities: string[] }
interface RawSubscription{ id: number; name: string; cost: number; period: string; renewalDate: string | null; active: boolean }
interface RawDocument    { id: number; name: string; expiryDate: string | null; category: string }
interface RawMaintItem   { id: number; name: string; tasks: { id: number; description: string; dueDate: string | null }[] }

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildCalendarCells(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1)
  // Convert Sun=0 to Mon=0 offset
  let startDow = first.getDay() - 1
  if (startDow < 0) startDow = 6

  const prevMonthDays = new Date(year, month, 0).getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = startDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  const remaining = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })

  return cells
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function CalendarPage() {
  const today = new Date()
  const [currentYear, setCurrentYear]   = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay]   = useState<Date>(today)

  const LS_FILTER_KEY = 'calendar-hidden-sources'
  const ALL_TYPES: EventSourceType[] = ['task', 'appointment', 'trip', 'subscription', 'document', 'maintenance']

  const [activeTypes, setActiveTypes] = useState<Set<EventSourceType>>(() => {
    if (typeof window === 'undefined') return new Set(ALL_TYPES)
    try {
      const raw = localStorage.getItem(LS_FILTER_KEY)
      if (raw) {
        const hidden = JSON.parse(raw) as EventSourceType[]
        return new Set(ALL_TYPES.filter(t => !hidden.includes(t)))
      }
    } catch { /* ignore */ }
    return new Set(ALL_TYPES)
  })

  function toggleType(type: EventSourceType) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      const hidden = ALL_TYPES.filter(t => !next.has(t))
      localStorage.setItem(LS_FILTER_KEY, JSON.stringify(hidden))
      return next
    })
  }

  function changeMonth(delta: number) {
    let m = currentMonth + delta
    let y = currentYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

  const { data: rawTasks = [] }         = useSWR<RawTask[]>('/api/tasks?done=false', fetcher)
  const { data: rawAppointments = [] }  = useSWR<RawAppointment[]>('/api/appointments', fetcher)
  const { data: rawTrips = [] }         = useSWR<RawTrip[]>('/api/travel/trips', fetcher)
  const { data: rawSubscriptions = [] } = useSWR<RawSubscription[]>('/api/subscriptions', fetcher)
  const { data: rawDocuments = [] }     = useSWR<RawDocument[]>('/api/documents', fetcher)
  const { data: rawMaint = [] }         = useSWR<RawMaintItem[]>('/api/maintenance/items', fetcher)

  const allEvents = useMemo<CalEvent[]>(() => {
    const events: CalEvent[] = []

    rawTasks.forEach(t => {
      if (!t.dueDate) return
      events.push({
        id: `task-${t.id}`, type: 'task',
        date: new Date(t.dueDate + 'T00:00:00'),
        title: t.title,
        meta: [t.priority + ' priority', t.category].filter(Boolean).join(' · '),
      })
    })

    rawAppointments.forEach(a => {
      if (a.done) return
      events.push({
        id: `appt-${a.id}`, type: 'appointment',
        date: new Date(a.date + 'T00:00:00'),
        title: a.title,
        meta: [a.time, a.category, a.location].filter(Boolean).join(' · '),
      })
    })

    rawTrips.forEach(t => {
      if (!t.startDate) return
      events.push({
        id: `trip-${t.id}`, type: 'trip',
        date: new Date(t.startDate + 'T00:00:00'),
        endDate: t.endDate ? new Date(t.endDate + 'T00:00:00') : undefined,
        title: t.countryName + (t.cities?.length ? ` — ${t.cities.join(', ')}` : ''),
        meta: t.endDate ? `${t.startDate} – ${t.endDate}` : t.startDate,
      })
    })

    rawSubscriptions.forEach(s => {
      if (!s.active || !s.renewalDate) return
      events.push({
        id: `sub-${s.id}`, type: 'subscription',
        date: new Date(s.renewalDate + 'T00:00:00'),
        title: s.name,
        meta: `€${s.cost} · ${s.period}`,
      })
    })

    rawDocuments.forEach(d => {
      if (!d.expiryDate) return
      events.push({
        id: `doc-${d.id}`, type: 'document',
        date: new Date(d.expiryDate + 'T00:00:00'),
        title: d.name,
        meta: d.category,
      })
    })

    rawMaint.forEach(item => {
      item.tasks.forEach(task => {
        if (!task.dueDate) return
        events.push({
          id: `maint-${task.id}`, type: 'maintenance',
          date: new Date(task.dueDate + 'T00:00:00'),
          title: task.description,
          meta: item.name,
        })
      })
    })

    return events
  }, [rawTasks, rawAppointments, rawTrips, rawSubscriptions, rawDocuments, rawMaint])

  const cells = buildCalendarCells(currentYear, currentMonth)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Calendar</h1>

      <div className="flex gap-6 items-start">
        {/* Left: Grid */}
        <div className="w-80 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-lg leading-none"
            >‹</button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-lg leading-none"
            >›</button>
          </div>

          <div className="grid grid-cols-7 mb-0.5">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(({ date, isCurrentMonth }, i) => {
              const isToday = isSameDay(date, today)
              const isSelected = isSameDay(date, selectedDay)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(date)}
                  className={`
                    flex flex-col items-center pt-1 pb-1.5 rounded-md min-h-[44px] transition-colors
                    ${!isCurrentMonth ? 'opacity-25' : ''}
                    ${isSelected
                      ? 'bg-blue-600'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
                  `}
                >
                  <span className={`
                    text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full
                    ${isSelected ? 'text-white' : isToday
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'}
                  `}>
                    {date.getDate()}
                  </span>
                  {/* dots rendered in Task 4 */}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Agenda */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            {selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-600">No events</p>
        </div>
      </div>
    </div>
  )
}
