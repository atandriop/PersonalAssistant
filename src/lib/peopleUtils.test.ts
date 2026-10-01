import { describe, it, expect } from 'vitest'
import { daysUntilBirthday, upcomingBirthdays } from './peopleUtils'

describe('daysUntilBirthday', () => {
  it('returns 0 for today', () => {
    const today = new Date('2026-06-15T12:00:00')
    expect(daysUntilBirthday('1990-06-15', today)).toBe(0)
  })
  it('returns correct days for a future birthday this year', () => {
    const today = new Date('2026-06-15T12:00:00')
    expect(daysUntilBirthday('1985-07-04', today)).toBe(19)
  })
  it('wraps around to next year when birthday already passed this year', () => {
    const today = new Date('2026-06-15T12:00:00')
    expect(daysUntilBirthday('1990-06-01', today)).toBe(351)
  })
})

describe('upcomingBirthdays', () => {
  it('returns people with birthday within withinDays', () => {
    const today = new Date('2026-06-15T12:00:00')
    const people = [
      { id: 1, name: 'Alice', birthday: '1990-06-20' },
      { id: 2, name: 'Bob',   birthday: '1985-07-20' },
      { id: 3, name: 'Carol', birthday: null },
    ]
    const result = upcomingBirthdays(people, 30, today)
    expect(result.map(r => r.id)).toEqual([1])
    expect(result[0].daysUntil).toBe(5)
  })
  it('returns empty array when no one has a birthday within range', () => {
    const today = new Date('2026-06-15T12:00:00')
    expect(upcomingBirthdays([], 30, today)).toEqual([])
  })
})

describe('daysUntilBirthday at a wall-clock time of day', () => {
  // The existing cases above all pass an exact-UTC-midnight Date, which hides
  // the comparison between a UTC-midnight anniversary and a real instant.
  it('returns 0 for a birthday today in the afternoon', () => {
    expect(daysUntilBirthday('1990-06-15', new Date('2026-06-15T14:30:00'))).toBe(0)
  })
  it('returns 1 for a birthday tomorrow in the afternoon', () => {
    expect(daysUntilBirthday('1990-06-16', new Date('2026-06-15T14:30:00'))).toBe(1)
  })
  it('returns 5 for a birthday five days out in the afternoon', () => {
    expect(daysUntilBirthday('1990-06-20', new Date('2026-06-15T14:30:00'))).toBe(5)
  })
  it('gives the same count at one minute past midnight and one minute to midnight', () => {
    expect(daysUntilBirthday('1990-06-20', new Date('2026-06-15T00:01:00')))
      .toBe(daysUntilBirthday('1990-06-20', new Date('2026-06-15T23:59:00')))
  })
  it('rolls to next year late in the day on the day after the birthday', () => {
    expect(daysUntilBirthday('1990-06-14', new Date('2026-06-15T23:00:00'))).toBe(364)
  })
  it('clamps a Feb 29 birthday to Feb 28 in a non-leap year', () => {
    expect(daysUntilBirthday('2000-02-29', new Date('2026-02-01T10:00:00'))).toBe(27)
  })
  it('keeps a birthday that is today in the upcoming list', () => {
    const people = [{ id: 1, birthday: '1990-06-15' }]
    const result = upcomingBirthdays(people, 30, new Date('2026-06-15T14:30:00'))
    expect(result.map(r => r.daysUntil)).toEqual([0])
  })
})
