export function normalizeToMonthly(cost: number, period: string): number {
  if (period === 'yearly')    return cost / 12
  if (period === 'quarterly') return cost / 3
  return cost
}

/** Annualised cost for a subscription period. Always 12x normalizeToMonthly. */
export function normalizeToYearly(cost: number, period: string): number {
  return normalizeToMonthly(cost, period) * 12
}

export function calcFireNumber(monthlyBurn: number): number {
  return monthlyBurn * 12 * 25
}

export function calcRunwayMonths(liquidAssets: number, monthlyBurn: number): number {
  if (monthlyBurn === 0) return Infinity
  return liquidAssets / monthlyBurn
}

export function calcFireProgress(portfolioTotal: number, fireNumber: number): number {
  if (fireNumber === 0) return 0
  return Math.min(100, (portfolioTotal / fireNumber) * 100)
}
