export interface PortfolioHolding {
  type: string
  quantity?: number | null
  currentPrice?: number | null
  balance?: number | null
}

export interface NetWorthSnapshot {
  id: number
  date: string   // 'YYYY-MM-DD'
  total: number
}

export function holdingValue(h: PortfolioHolding): number {
  if (h.type === 'savings') return h.balance ?? 0
  return (h.currentPrice ?? 0) * (h.quantity ?? 0)
}

/**
 * Returns the snapshot whose date is nearest to targetDate,
 * or null if the closest one is more than maxDaysDiff days away.
 */
export function snapshotNear(
  snapshots: NetWorthSnapshot[],
  targetDate: Date,
  maxDaysDiff = 15,
): NetWorthSnapshot | null {
  if (snapshots.length === 0) return null
  const target = targetDate.getTime()
  let best: NetWorthSnapshot | null = null
  let bestDiff = Infinity
  for (const s of snapshots) {
    const diff = Math.abs(new Date(s.date + 'T00:00:00').getTime() - target)
    if (diff < bestDiff) { bestDiff = diff; best = s }
  }
  return bestDiff <= maxDaysDiff * 86_400_000 ? best : null
}

export function fmtEur(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: decimals,
  }).format(n)
}
