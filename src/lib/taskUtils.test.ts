import { describe, it, expect } from 'vitest'
import { addInterval } from './taskUtils'

describe('addInterval', () => {
  describe('daily', () => {
    it('advances by one day', () => {
      expect(addInterval('2026-07-08', 'daily')).toBe('2026-07-09')
    })
    it('crosses a month boundary', () => {
      expect(addInterval('2026-02-28', 'daily')).toBe('2026-03-01')
    })
    it('lands on the leap day in a leap year', () => {
      expect(addInterval('2024-02-28', 'daily')).toBe('2024-02-29')
    })
    it('crosses a year boundary', () => {
      expect(addInterval('2026-12-31', 'daily')).toBe('2027-01-01')
    })
    it('keeps the calendar day across a DST spring-forward', () => {
      expect(addInterval('2026-03-28', 'daily')).toBe('2026-03-29')
      expect(addInterval('2026-03-29', 'daily')).toBe('2026-03-30')
    })
    it('keeps the calendar day across a DST fall-back', () => {
      expect(addInterval('2026-10-24', 'daily')).toBe('2026-10-25')
      expect(addInterval('2026-10-25', 'daily')).toBe('2026-10-26')
    })
  })

  describe('weekly', () => {
    it('advances by seven days', () => {
      expect(addInterval('2026-07-08', 'weekly')).toBe('2026-07-15')
    })
    it('crosses a month boundary', () => {
      expect(addInterval('2026-07-28', 'weekly')).toBe('2026-08-04')
    })
    it('crosses a year boundary', () => {
      expect(addInterval('2026-12-28', 'weekly')).toBe('2027-01-04')
    })
    it('spans a DST transition without losing a day', () => {
      expect(addInterval('2026-03-25', 'weekly')).toBe('2026-04-01')
      expect(addInterval('2026-10-22', 'weekly')).toBe('2026-10-29')
    })
  })

  describe('monthly', () => {
    it('advances by one month', () => {
      expect(addInterval('2026-07-08', 'monthly')).toBe('2026-08-08')
    })
    it('clamps Jan 31 to the last day of February', () => {
      expect(addInterval('2026-01-31', 'monthly')).toBe('2026-02-28')
    })
    it('clamps Jan 31 to Feb 29 in a leap year', () => {
      expect(addInterval('2024-01-31', 'monthly')).toBe('2024-02-29')
    })
    it('clamps a 31-day month to a 30-day month', () => {
      expect(addInterval('2026-03-31', 'monthly')).toBe('2026-04-30')
    })
    it('crosses a year boundary', () => {
      expect(addInterval('2026-12-15', 'monthly')).toBe('2027-01-15')
    })
    it('keeps day 31 when crossing into January', () => {
      expect(addInterval('2026-12-31', 'monthly')).toBe('2027-01-31')
    })
  })

  describe('yearly', () => {
    it('advances by one year', () => {
      expect(addInterval('2026-07-08', 'yearly')).toBe('2027-07-08')
    })
    it('keeps Dec 31', () => {
      expect(addInterval('2026-12-31', 'yearly')).toBe('2027-12-31')
    })
    it('advances Feb 28 to Feb 28 of a leap year', () => {
      expect(addInterval('2023-02-28', 'yearly')).toBe('2024-02-28')
    })

    it('clamps a leap day to Feb 28 in the following non-leap year', () => {
      expect(addInterval('2024-02-29', 'yearly')).toBe('2025-02-28')
    })
  })

  describe('quarterly', () => {
    it('advances by three months', () => {
      expect(addInterval('2026-07-08', 'quarterly')).toBe('2026-10-08')
    })
    it('crosses a year boundary', () => {
      expect(addInterval('2026-11-15', 'quarterly')).toBe('2027-02-15')
    })
    it('clamps Nov 30 to the last day of February', () => {
      expect(addInterval('2026-11-30', 'quarterly')).toBe('2027-02-28')
    })
  })

  describe('6months', () => {
    it('advances by six months', () => {
      expect(addInterval('2026-01-15', '6months')).toBe('2026-07-15')
    })
    it('crosses a year boundary', () => {
      expect(addInterval('2026-09-10', '6months')).toBe('2027-03-10')
    })
    it('clamps Aug 31 to the last day of February', () => {
      expect(addInterval('2026-08-31', '6months')).toBe('2027-02-28')
    })
  })

  describe('unusable input', () => {
    it('returns null for an unrecognised interval rather than the unchanged date', () => {
      // recurringInterval is a free-text column, so a typo must not silently
      // recreate the task with an identical due date.
      expect(addInterval('2026-07-08', 'biweekly')).toBeNull()
      expect(addInterval('2026-07-08', '')).toBeNull()
      expect(addInterval('2026-07-08', 'Daily')).toBeNull()
    })
    it('returns null for an unparseable date rather than NaN-NaN-NaN', () => {
      expect(addInterval('', 'daily')).toBeNull()
      expect(addInterval('not-a-date', 'daily')).toBeNull()
      expect(addInterval('2026-13-45', 'daily')).toBeNull()
    })
  })
})
