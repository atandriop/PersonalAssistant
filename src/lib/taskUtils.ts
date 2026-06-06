export function addInterval(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  switch (interval) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': {
      const targetMonth = (d.getMonth() + 1) % 12
      d.setMonth(d.getMonth() + 1)
      if (d.getMonth() !== targetMonth) d.setDate(0)
      break
    }
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().slice(0, 10)
}
