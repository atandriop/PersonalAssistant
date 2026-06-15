import { describe, it, expect } from 'vitest'
import {
  normalizeToMonthly,
  calcFireNumber,
  calcRunwayMonths,
  calcFireProgress,
} from './financialHealthUtils'

describe('normalizeToMonthly', () => {
  it('returns monthly cost as-is for monthly period', () => {
    expect(normalizeToMonthly(10, 'monthly')).toBeCloseTo(10)
  })
  it('divides yearly cost by 12', () => {
    expect(normalizeToMonthly(120, 'yearly')).toBeCloseTo(10)
  })
  it('divides quarterly cost by 3', () => {
    expect(normalizeToMonthly(30, 'quarterly')).toBeCloseTo(10)
  })
})

describe('calcFireNumber', () => {
  it('multiplies monthly burn by 12 then by 25 (4% rule)', () => {
    expect(calcFireNumber(1000)).toBe(300000)
  })
  it('returns 0 for 0 burn', () => {
    expect(calcFireNumber(0)).toBe(0)
  })
})

describe('calcRunwayMonths', () => {
  it('divides liquid assets by monthly burn', () => {
    expect(calcRunwayMonths(60000, 2000)).toBe(30)
  })
  it('returns Infinity when monthly burn is 0', () => {
    expect(calcRunwayMonths(60000, 0)).toBe(Infinity)
  })
  it('returns 0 when assets are 0', () => {
    expect(calcRunwayMonths(0, 2000)).toBe(0)
  })
})

describe('calcFireProgress', () => {
  it('returns percentage of FIRE number reached', () => {
    expect(calcFireProgress(150000, 300000)).toBeCloseTo(50)
  })
  it('returns 0 when FIRE number is 0', () => {
    expect(calcFireProgress(100, 0)).toBe(0)
  })
  it('caps at 100 when portfolio exceeds FIRE number', () => {
    expect(calcFireProgress(400000, 300000)).toBe(100)
  })
})
