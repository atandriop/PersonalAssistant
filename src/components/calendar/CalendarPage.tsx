'use client'

import { useState } from 'react'

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
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date>(today)

  function changeMonth(delta: number) {
    let m = currentMonth + delta
    let y = currentYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

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
