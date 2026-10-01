import { holdingValue, type PortfolioHolding } from '@/lib/netWorthUtils'
import { normalizeToYearly } from '@/lib/financialHealthUtils'

export interface NetWorthEntryLike {
  id?: number
  value: number
  type: string
}

export interface SubscriptionLike {
  cost: number
  period: string
  active: boolean
}

export interface NetWorthInputs {
  holdings: PortfolioHolding[]
  entries: NetWorthEntryLike[]
  subscriptions?: SubscriptionLike[]
}

export interface NetWorthTotals {
  assets: number
  liabilities: number
  total: number
}

/**
 * The single net-worth formula, shared by the page, the finance overview, the
 * dashboard widget and the snapshot route.
 *
 * These used to compute it three different ways: the page set assets to the
 * portfolio total alone (so `type: 'asset'` entries were counted by nothing),
 * the page added annualised subscriptions to liabilities while the snapshot
 * route did not (so the chart was permanently offset from the tile), and the
 * subscription annualisation ignored the 'quarterly' period (billing it at 3x).
 */
export function computeNetWorth({ holdings, entries, subscriptions = [] }: NetWorthInputs): NetWorthTotals {
  const portfolioTotal = holdings.reduce((s, h) => s + holdingValue(h), 0)
  const assetEntries = entries.filter(e => e.type === 'asset').reduce((s, e) => s + e.value, 0)
  const liabilityEntries = entries.filter(e => e.type === 'liability').reduce((s, e) => s + e.value, 0)
  const subscriptionAnnual = subscriptions
    .filter(s => s.active)
    .reduce((s, sub) => s + normalizeToYearly(sub.cost, sub.period), 0)

  const assets = portfolioTotal + assetEntries
  const liabilities = liabilityEntries + subscriptionAnnual

  return { assets, liabilities, total: assets - liabilities }
}
