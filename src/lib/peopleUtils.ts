/**
 * The birthday's anniversary in a given year as a UTC-midnight timestamp,
 * clamping Feb 29 to Feb 28 in non-leap years rather than rolling into March.
 */
function anniversaryUTC(year: number, month: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Date.UTC(year, month - 1, Math.min(day, lastDay))
}

/**
 * Whole days until the next anniversary of `birthday`, 0 if it is today.
 * Both sides are reduced to a calendar day before differencing — comparing a
 * UTC-midnight anniversary against a wall-clock instant made every countdown
 * off by one after noon UTC, and reported a birthday today as 365.
 */
export function daysUntilBirthday(birthday: string, today: Date = new Date()): number {
  const [, month, day] = birthday.split('-').map(Number)
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  let target = anniversaryUTC(today.getFullYear(), month, day)
  if (target < todayUTC) target = anniversaryUTC(today.getFullYear() + 1, month, day)

  return Math.round((target - todayUTC) / 86400000)
}

export function upcomingBirthdays<T extends { id: number; birthday: string | null }>(
  people: T[],
  withinDays: number,
  today: Date = new Date()
): (T & { daysUntil: number })[] {
  return people
    .filter(p => p.birthday !== null)
    .map(p => ({ ...p, daysUntil: daysUntilBirthday(p.birthday!, today) }))
    .filter(p => p.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}
