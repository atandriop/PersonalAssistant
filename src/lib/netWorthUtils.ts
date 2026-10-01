import { toLocalYMD, daysBetween } from '@/lib/dateUtils'

export interface PortfolioHolding {
  id: number
  name: string
  type: string
  quantity?: number | null
  currentPrice?: number | null
  /** Total paid for the position, not a per-unit price. */
  buyPrice?: number | null
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
/**
 * Profit or loss on a tradable position, or null if it has none (savings, or an
 * incomplete position). `buyPrice` is the TOTAL paid for the position — the form
 * labels it "Total buy price" — so it is subtracted, never multiplied by
 * quantity.
 */
export function holdingPnl(h: PortfolioHolding): number | null {
  if (h.type === 'savings') return null
  if (h.quantity == null || h.currentPrice == null || h.buyPrice == null) return null
  return h.currentPrice * h.quantity - h.buyPrice
}

/** Total amount paid for a tradable position, or null if not recorded. */
export function holdingCostBasis(h: PortfolioHolding): number | null {
  if (h.type === 'savings') return null
  if (h.buyPrice == null) return null
  return h.buyPrice
}

export function snapshotNear(
  snapshots: NetWorthSnapshot[],
  targetDate: Date,
  maxDaysDiff = 15,
): NetWorthSnapshot | null {
  if (snapshots.length === 0) return null
  // Compare calendar days, not raw milliseconds: a DST transition between the
  // snapshot and the target shifts the elapsed time by an hour, which silently
  // pushed an exactly-in-range snapshot out of the window.
  const targetYMD = toLocalYMD(targetDate)
  let best: NetWorthSnapshot | null = null
  let bestDiff = Infinity
  for (const s of snapshots) {
    const diff = Math.abs(daysBetween(s.date, targetYMD))
    if (diff < bestDiff) { bestDiff = diff; best = s }
  }
  return bestDiff <= maxDaysDiff ? best : null
}

export function fmtEur(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: decimals,
  }).format(n)
}
