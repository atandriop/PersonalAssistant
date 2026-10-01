import { describe, it, expect } from 'vitest'
import { holdingValue, snapshotNear, fmtEur } from './netWorthUtils'

const holding = (h: Partial<Parameters<typeof holdingValue>[0]>) =>
  ({ id: 1, name: 'H', type: 'stock', ...h }) as Parameters<typeof holdingValue>[0]

const snap = (date: string, total = 100) => ({ id: 1, date, total })

describe('holdingValue', () => {
  it('uses balance for savings holdings', () => {
    expect(holdingValue(holding({ type: 'savings', balance: 2500 }))).toBe(2500)
  })
  it('multiplies price by quantity for non-savings holdings', () => {
    expect(holdingValue(holding({ type: 'stock', currentPrice: 12.5, quantity: 4 }))).toBe(50)
  })
  it('ignores balance on a non-savings holding', () => {
    expect(holdingValue(holding({ type: 'stock', currentPrice: 10, quantity: 2, balance: 9999 }))).toBe(20)
  })
  it('treats a missing savings balance as 0', () => {
    expect(holdingValue(holding({ type: 'savings', balance: null }))).toBe(0)
  })
  it('treats a missing price or quantity as 0', () => {
    expect(holdingValue(holding({ type: 'stock', currentPrice: null, quantity: 4 }))).toBe(0)
    expect(holdingValue(holding({ type: 'stock', currentPrice: 12.5, quantity: null }))).toBe(0)
    expect(holdingValue(holding({ type: 'stock' }))).toBe(0)
  })
  it('returns 0 for a zero quantity position', () => {
    expect(holdingValue(holding({ type: 'crypto', currentPrice: 50000, quantity: 0 }))).toBe(0)
  })
  it('returns a negative value for a negative savings balance (overdraft)', () => {
    expect(holdingValue(holding({ type: 'savings', balance: -300 }))).toBe(-300)
  })
  it('handles fractional quantities', () => {
    expect(holdingValue(holding({ type: 'crypto', currentPrice: 30000, quantity: 0.25 }))).toBe(7500)
  })
})

describe('snapshotNear', () => {
  const target = new Date('2026-06-15T00:00:00')

  it('returns null for an empty snapshot list', () => {
    expect(snapshotNear([], target)).toBeNull()
  })
  it('returns the only snapshot when it is within range', () => {
    expect(snapshotNear([snap('2026-06-10')], target)?.date).toBe('2026-06-10')
  })
  it('returns null when the only snapshot is outside range', () => {
    expect(snapshotNear([snap('2026-01-10')], target)).toBeNull()
  })
  it('picks the nearest snapshot regardless of list order', () => {
    const snaps = [snap('2026-06-01', 1), snap('2026-06-14', 2), snap('2026-06-25', 3)]
    expect(snapshotNear(snaps, target)?.total).toBe(2)
  })
  it('picks the nearest snapshot from after the target date', () => {
    const snaps = [snap('2026-06-05', 1), snap('2026-06-17', 2)]
    expect(snapshotNear(snaps, target)?.total).toBe(2)
  })
  it('returns an exact date match', () => {
    const snaps = [snap('2026-06-14', 1), snap('2026-06-15', 2), snap('2026-06-16', 3)]
    expect(snapshotNear(snaps, target)?.total).toBe(2)
  })
  it('keeps the first of two equally distant snapshots', () => {
    const snaps = [snap('2026-06-10', 1), snap('2026-06-20', 2)]
    expect(snapshotNear(snaps, target)?.total).toBe(1)
  })
  it('includes a snapshot exactly maxDaysDiff days away', () => {
    expect(snapshotNear([snap('2026-05-31')], target)?.date).toBe('2026-05-31')
  })
  it('excludes a snapshot one day beyond maxDaysDiff', () => {
    expect(snapshotNear([snap('2026-05-30')], target)).toBeNull()
  })
  it('honours a custom maxDaysDiff', () => {
    expect(snapshotNear([snap('2026-05-30')], target, 30)?.date).toBe('2026-05-30')
    expect(snapshotNear([snap('2026-06-10')], target, 1)).toBeNull()
  })
  it('returns null when the nearest snapshot is out of range even though others exist', () => {
    const snaps = [snap('2025-01-01', 1), snap('2026-03-01', 2)]
    expect(snapshotNear(snaps, target)).toBeNull()
  })
  it('matches a leap day snapshot', () => {
    expect(snapshotNear([snap('2024-02-29')], new Date('2024-03-05T00:00:00'))?.date).toBe('2024-02-29')
  })

  it('includes a snapshot exactly maxDaysDiff calendar days away across a DST fall-back', () => {
    expect(snapshotNear([snap('2026-10-21')], new Date('2026-11-05T00:00:00'))?.date).toBe('2026-10-21')
  })
  it('includes a snapshot exactly maxDaysDiff calendar days away across a DST spring-forward', () => {
    expect(snapshotNear([snap('2026-03-18')], new Date('2026-04-02T00:00:00'))?.date).toBe('2026-03-18')
  })
  it('measures the window from the target\'s calendar day, ignoring its wall-clock time', () => {
    expect(snapshotNear([snap('2026-05-31')], new Date('2026-06-15T23:59:00'))?.date).toBe('2026-05-31')
    expect(snapshotNear([snap('2026-05-30')], new Date('2026-06-15T23:59:00'))).toBeNull()
  })
})

describe('fmtEur', () => {
  it('formats with no decimals by default', () => {
    expect(fmtEur(1234.56)).toBe('€1,235')
  })
  it('formats zero', () => {
    expect(fmtEur(0)).toBe('€0')
  })
  it('formats a negative amount with a leading sign', () => {
    expect(fmtEur(-1234.56)).toBe('-€1,235')
  })
  it('respects an explicit decimals argument', () => {
    expect(fmtEur(1234.567, 2)).toBe('€1,234.57')
  })
  it('groups thousands', () => {
    expect(fmtEur(1_000_000_000)).toBe('€1,000,000,000')
  })
  it('rounds sub-euro amounts to zero', () => {
    expect(fmtEur(0.4)).toBe('€0')
  })
})
