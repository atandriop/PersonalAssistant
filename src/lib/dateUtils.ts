// Date helpers for YYYY-MM-DD strings anchored to the *local* calendar day.
// Never format a local-midnight Date with toISOString() — in timezones east of
// UTC it rolls back to the previous day.

/** Format a Date as YYYY-MM-DD using its local calendar fields. */
export function toLocalYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Today's date as YYYY-MM-DD in the local timezone. */
export function todayLocal(): string {
  return toLocalYMD(new Date())
}

/** Add (or subtract) whole days to a YYYY-MM-DD string. */
export function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalYMD(d)
}

/** Trip end date from a start date and an inclusive duration in days. */
export function tripEndDate(startDate: string, durationDays: number): string {
  return addDays(startDate, durationDays - 1)
}

/** Inclusive day count between two YYYY-MM-DD strings (same day = 1). */
export function daysInclusive(startYMD: string, endYMD: string): number {
  return Math.round((new Date(endYMD + 'T00:00:00').getTime() - new Date(startYMD + 'T00:00:00').getTime()) / 86400000) + 1
}
