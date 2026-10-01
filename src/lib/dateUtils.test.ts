import { describe, it, expect } from 'vitest'
import { toLocalYMD, addDays, tripEndDate, daysInclusive, daysBetween } from './dateUtils'

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

describe('daysBetween', () => {
  it('returns 0 for the same day', () => {
    expect(daysBetween('2026-07-08', '2026-07-08')).toBe(0)
  })
  it('counts whole days forward', () => {
    expect(daysBetween('2026-07-08', '2026-07-15')).toBe(7)
  })
  it('returns a negative count when the end precedes the start', () => {
    expect(daysBetween('2026-07-15', '2026-07-08')).toBe(-7)
  })
  it('counts across a DST fall-back without losing an hour', () => {
    expect(daysBetween('2026-10-21', '2026-11-05')).toBe(15)
  })
  it('counts across a DST spring-forward without gaining an hour', () => {
    expect(daysBetween('2026-03-18', '2026-04-02')).toBe(15)
  })
  it('counts across a leap day', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2)
  })
  it('counts across a year boundary', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3)
  })
})
