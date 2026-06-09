import { describe, it, expect } from 'vitest'
import { advanceRenewalDate } from './subscriptionUtils'

describe('advanceRenewalDate', () => {
  it('advances a monthly subscription by 1 month', () => {
    expect(advanceRenewalDate('2026-06-09', 'monthly')).toBe('2026-07-09')
  })

  it('advances a quarterly subscription by 3 months', () => {
    expect(advanceRenewalDate('2026-06-09', 'quarterly')).toBe('2026-09-09')
  })

  it('advances a yearly subscription by 12 months', () => {
    expect(advanceRenewalDate('2026-06-09', 'yearly')).toBe('2027-06-09')
  })

  it('handles month-end dates (e.g. Jan 31 → Feb 28)', () => {
    expect(advanceRenewalDate('2026-01-31', 'monthly')).toBe('2026-02-28')
  })
})
