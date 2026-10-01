import { toLocalYMD } from '@/lib/dateUtils'

const DAY_STEPS: Record<string, number> = { daily: 1, weekly: 7 }
const MONTH_STEPS: Record<string, number> = { monthly: 1, quarterly: 3, '6months': 6, yearly: 12 }

/** Every interval addInterval understands. Use to validate before persisting. */
export const RECURRING_INTERVALS = [...Object.keys(DAY_STEPS), ...Object.keys(MONTH_STEPS)]

export function isRecurringInterval(interval: unknown): interval is string {
  return typeof interval === 'string' && RECURRING_INTERVALS.includes(interval)
}

/** Add whole months in place, clamping to the last day of the target month. */
function addMonthsClamped(d: Date, months: number): void {
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
}

/**
 * Next occurrence of a YYYY-MM-DD date for a recurrence interval, or null if
 * the interval is not recognised or the date is unparseable. Callers must treat
 * null as "cannot schedule" — returning the input unchanged would silently
 * recreate a task on the same day, forever.
 */
export function addInterval(dateStr: string, interval: string): string | null {
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null

  const days = DAY_STEPS[interval]
  if (days !== undefined) {
    d.setDate(d.getDate() + days)
    return toLocalYMD(d)
  }

  const months = MONTH_STEPS[interval]
  if (months !== undefined) {
    addMonthsClamped(d, months)
    return toLocalYMD(d)
  }

  return null
}
