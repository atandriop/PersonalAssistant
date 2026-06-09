const PERIOD_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

export function advanceRenewalDate(renewalDate: string, period: string): string {
  const d = new Date(renewalDate)
  const originalDay = d.getDate()
  const months = PERIOD_MONTHS[period] ?? 1
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(originalDay, lastDay))
  return d.toISOString().slice(0, 10)
}
