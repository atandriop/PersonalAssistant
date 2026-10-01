import { describe, it, expect } from 'vitest'
import { computeNetWorth } from './netWorthTotals'

const stock = (currentPrice: number, quantity: number) =>
  ({ id: 1, name: 'S', type: 'stock', currentPrice, quantity })
const savings = (balance: number) => ({ id: 2, name: 'B', type: 'savings', balance })

describe('computeNetWorth', () => {
  it('sums holdings into assets', () => {
    const r = computeNetWorth({ holdings: [stock(150, 10), savings(2500)], entries: [], subscriptions: [] })
    expect(r.assets).toBe(4000)
    expect(r.total).toBe(4000)
  })

  it('counts asset entries, which were previously summed by nothing at all', () => {
    // EntryForm lets the user record type: 'asset' entries (e.g. a house). The
    // page set totalAssets = portfolioTotal and the snapshot route only ever
    // subtracted liabilities, so the value vanished from every total.
    const r = computeNetWorth({
      holdings: [],
      entries: [{ id: 1, value: 300000, type: 'asset' }],
      subscriptions: [],
    })
    expect(r.assets).toBe(300000)
    expect(r.total).toBe(300000)
  })

  it('subtracts liability entries', () => {
    const r = computeNetWorth({
      holdings: [stock(100, 10)],
      entries: [{ id: 1, value: 400, type: 'liability' }],
      subscriptions: [],
    })
    expect(r.liabilities).toBe(400)
    expect(r.total).toBe(600)
  })

  it('counts both asset and liability entries in one pass', () => {
    const r = computeNetWorth({
      holdings: [savings(1000)],
      entries: [
        { id: 1, value: 300000, type: 'asset' },
        { id: 2, value: 250000, type: 'liability' },
      ],
      subscriptions: [],
    })
    expect(r.assets).toBe(301000)
    expect(r.liabilities).toBe(250000)
    expect(r.total).toBe(51000)
  })

  it('annualises active subscriptions into liabilities', () => {
    const r = computeNetWorth({
      holdings: [],
      entries: [],
      subscriptions: [{ cost: 10, period: 'monthly', active: true }],
    })
    expect(r.liabilities).toBeCloseTo(120)
    expect(r.total).toBeCloseTo(-120)
  })

  it('annualises a quarterly subscription at 4x, not 12x', () => {
    const r = computeNetWorth({
      holdings: [],
      entries: [],
      subscriptions: [{ cost: 30, period: 'quarterly', active: true }],
    })
    expect(r.liabilities).toBeCloseTo(120)
  })

  it('leaves a yearly subscription at its stated cost', () => {
    const r = computeNetWorth({
      holdings: [], entries: [],
      subscriptions: [{ cost: 120, period: 'yearly', active: true }],
    })
    expect(r.liabilities).toBeCloseTo(120)
  })

  it('ignores inactive subscriptions', () => {
    const r = computeNetWorth({
      holdings: [], entries: [],
      subscriptions: [{ cost: 999, period: 'monthly', active: false }],
    })
    expect(r.liabilities).toBe(0)
  })

  it('returns zeroes for empty inputs', () => {
    expect(computeNetWorth({ holdings: [], entries: [], subscriptions: [] }))
      .toEqual({ assets: 0, liabilities: 0, total: 0 })
  })

  it('treats subscriptions as optional so the snapshot route can omit them', () => {
    const r = computeNetWorth({ holdings: [stock(10, 10)], entries: [] })
    expect(r.total).toBe(100)
  })

  it('reports a negative total when liabilities exceed assets', () => {
    const r = computeNetWorth({
      holdings: [savings(100)],
      entries: [{ id: 1, value: 500, type: 'liability' }],
      subscriptions: [],
    })
    expect(r.total).toBe(-400)
  })

  it('ignores an unrecognised entry type rather than guessing', () => {
    const r = computeNetWorth({
      holdings: [],
      entries: [{ id: 1, value: 50, type: 'something-else' }],
      subscriptions: [],
    })
    expect(r).toEqual({ assets: 0, liabilities: 0, total: 0 })
  })

  it('always satisfies total = assets - liabilities', () => {
    const r = computeNetWorth({
      holdings: [stock(12.5, 4), savings(1000)],
      entries: [{ id: 1, value: 5000, type: 'asset' }, { id: 2, value: 900, type: 'liability' }],
      subscriptions: [{ cost: 15, period: 'monthly', active: true }],
    })
    expect(r.total).toBeCloseTo(r.assets - r.liabilities)
  })
})
