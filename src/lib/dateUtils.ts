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

/**
 * Whole calendar days from startYMD to endYMD, negative if end precedes start.
 * Compares the calendar fields via Date.UTC so a DST transition in between
 * cannot add or drop an hour and skew the count.
 */
export function daysBetween(startYMD: string, endYMD: string): number {
  const [ay, am, ad] = startYMD.split('-').map(Number)
  const [by, bm, bd] = endYMD.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

/** Inclusive day count between two YYYY-MM-DD strings (same day = 1). */
export function daysInclusive(startYMD: string, endYMD: string): number {
  return daysBetween(startYMD, endYMD) + 1
}
