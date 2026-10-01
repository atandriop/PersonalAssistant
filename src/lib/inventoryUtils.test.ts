import { describe, it, expect } from 'vitest'
import { computeValue } from './inventoryUtils'

describe('computeValue', () => {
  it('returns currentValue override when set', () => {
    expect(computeValue(
      { cost: 1000, currentValue: 800, purchaseDate: '2024-01-01' },
      { valueMethod: 'depreciation', depreciationRate: 0.15 }
    )).toBe(800)
  })

  it('applies compound depreciation when method is depreciation', () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)
    const value = computeValue(
      { cost: 10000, currentValue: null, purchaseDate: twoYearsAgo },
      { valueMethod: 'depreciation', depreciationRate: 0.10 }
    )
    // 10000 * (0.9)^2 = 8100, allow ±100 for date floating point
    expect(value).toBeGreaterThan(8000)
    expect(value).toBeLessThan(8200)
  })

  it('falls back to cost when method is cost', () => {
    expect(computeValue(
      { cost: 500, currentValue: null, purchaseDate: '2024-01-01' },
      { valueMethod: 'cost', depreciationRate: null }
    )).toBe(500)
  })

  it('falls back to cost when purchaseDate is null', () => {
    expect(computeValue(
      { cost: 500, currentValue: null, purchaseDate: null },
      { valueMethod: 'depreciation', depreciationRate: 0.15 }
    )).toBe(500)
  })

  it('falls back to cost when depreciationRate is null', () => {
    expect(computeValue(
      { cost: 500, currentValue: null, purchaseDate: '2024-01-01' },
      { valueMethod: 'depreciation', depreciationRate: null }
    )).toBe(500)
  })

  it('clamps value to zero minimum (fully depreciated)', () => {
    const tenYearsAgo = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)
    const value = computeValue(
      { cost: 1000, currentValue: null, purchaseDate: tenYearsAgo },
      { valueMethod: 'depreciation', depreciationRate: 0.50 }
    )
    expect(value).toBeGreaterThanOrEqual(0)
  })
})

describe('computeValue with an unusable depreciationRate', () => {
  const item = { cost: 1000, currentValue: null, purchaseDate: '2024-01-01' }

  it('falls back to cost when the rate exceeds 1 instead of returning NaN', () => {
    // Math.pow(1 - 1.5, fractionalYears) is a negative base to a fractional
    // power = NaN, and Math.max(0, NaN) is NaN, which poisons every total.
    expect(computeValue(item, { valueMethod: 'depreciation', depreciationRate: 1.5 })).toBe(1000)
  })
  it('falls back to cost for a negative rate', () => {
    expect(computeValue(item, { valueMethod: 'depreciation', depreciationRate: -0.2 })).toBe(1000)
  })
  it('returns 0 for a rate of exactly 1', () => {
    expect(computeValue(item, { valueMethod: 'depreciation', depreciationRate: 1 })).toBe(0)
  })
  it('falls back to cost for an unparseable purchaseDate', () => {
    expect(computeValue(
      { cost: 1000, currentValue: null, purchaseDate: 'not-a-date' },
      { valueMethod: 'depreciation', depreciationRate: 0.2 },
    )).toBe(1000)
  })
  it('never returns a non-finite number', () => {
    const value = computeValue(item, { valueMethod: 'depreciation', depreciationRate: 2 })
    expect(Number.isFinite(value)).toBe(true)
  })
})
