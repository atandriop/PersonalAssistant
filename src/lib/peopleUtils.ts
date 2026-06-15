export function daysUntilBirthday(birthday: string, today: Date = new Date()): number {
  const [year, month, day] = birthday.split('-').map(Number)
  const thisYear = new Date(Date.UTC(today.getUTCFullYear(), month - 1, day))

  if (thisYear < today) {
    const nextYear = new Date(Date.UTC(today.getUTCFullYear() + 1, month - 1, day))
    return Math.round((nextYear.getTime() - today.getTime()) / 86400000)
  }
  return Math.round((thisYear.getTime() - today.getTime()) / 86400000)
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
