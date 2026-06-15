import { describe, it, expect } from 'vitest'
import { daysUntilBirthday, upcomingBirthdays } from './peopleUtils'

describe('daysUntilBirthday', () => {
  it('returns 0 for today', () => {
    const today = new Date('2026-06-15')
    expect(daysUntilBirthday('1990-06-15', today)).toBe(0)
  })
  it('returns correct days for a future birthday this year', () => {
    const today = new Date('2026-06-15')
    expect(daysUntilBirthday('1985-07-04', today)).toBe(19)
  })
  it('wraps around to next year when birthday already passed this year', () => {
    const today = new Date('2026-06-15')
    expect(daysUntilBirthday('1990-06-01', today)).toBe(351)
  })
})

describe('upcomingBirthdays', () => {
  it('returns people with birthday within withinDays', () => {
    const today = new Date('2026-06-15')
    const people = [
      { id: 1, name: 'Alice', birthday: '1990-06-20' },
      { id: 2, name: 'Bob',   birthday: '1985-07-20' },
      { id: 3, name: 'Carol', birthday: null },
    ]
    const result = upcomingBirthdays(people as any, 30, today)
    expect(result.map(r => r.id)).toEqual([1])
    expect(result[0].daysUntil).toBe(5)
  })
  it('returns empty array when no one has a birthday within range', () => {
    const today = new Date('2026-06-15')
    expect(upcomingBirthdays([], 30, today)).toEqual([])
  })
})
