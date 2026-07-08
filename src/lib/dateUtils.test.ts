import { describe, it, expect } from 'vitest'
import { toLocalYMD, addDays, tripEndDate, daysInclusive } from './dateUtils'

describe('toLocalYMD', () => {
  it('formats using local calendar fields, not UTC', () => {
    // Local midnight: toISOString() would roll back a day in TZs east of UTC
    const d = new Date('2026-07-08T00:00:00')
    expect(toLocalYMD(d)).toBe('2026-07-08')
  })
  it('pads single-digit month and day', () => {
    expect(toLocalYMD(new Date('2026-01-05T00:00:00'))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('adds one day', () => {
    expect(addDays('2026-07-08', 1)).toBe('2026-07-09')
  })
  it('crosses month boundary', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
  })
  it('crosses year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('subtracts with negative days', () => {
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30')
  })
  it('handles DST spring-forward without shifting the calendar day', () => {
    // Europe DST starts last Sunday of March
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
})

describe('tripEndDate', () => {
  it('1-day trip ends on the start date', () => {
    expect(tripEndDate('2026-07-08', 1)).toBe('2026-07-08')
  })
  it('7-day trip ends 6 days after start', () => {
    expect(tripEndDate('2026-07-08', 7)).toBe('2026-07-14')
  })
})

describe('daysInclusive', () => {
  it('same day counts as 1', () => {
    expect(daysInclusive('2026-07-08', '2026-07-08')).toBe(1)
  })
  it('is the inverse of tripEndDate', () => {
    expect(daysInclusive('2026-07-08', tripEndDate('2026-07-08', 7))).toBe(7)
  })
  it('spans DST transition correctly', () => {
    expect(daysInclusive('2026-03-28', '2026-03-30')).toBe(3)
  })
})
