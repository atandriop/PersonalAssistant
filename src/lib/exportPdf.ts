import { getTaskStatus, HomeItem, MaintenanceTask } from './maintenance'
import { computeValue } from '@/lib/inventoryUtils'

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return `€${n.toFixed(2)}`
}

function holdingValue(h: { type: string; quantity: number | null; currentPrice: number | null; balance: number | null }): number {
  return h.type === 'savings' ? (h.balance ?? 0) : (h.currentPrice ?? 0) * (h.quantity ?? 0)
}

export async function exportPdf(): Promise<void> {
  const [
    tasks, memories, lifeAreas, activeHabits, archivedHabits,
    appointments, wishlist, inventory, collectibles, giftPeople,
    travelCountries, travelTrips, bucketTrips, bucketExperiences,
    subscriptions, maintenanceItems, documents, netWorthEntries, portfolio,
  ] = await Promise.all([
    fetch('/api/tasks').then(r => r.json()),
    fetch('/api/memories').then(r => r.json()),
    fetch('/api/life-areas').then(r => r.json()),
    fetch('/api/habits').then(r => r.json()),
    fetch('/api/habits?archived=true').then(r => r.json()),
    fetch('/api/appointments').then(r => r.json()),
    fetch('/api/wishlist').then(r => r.json()),
    fetch('/api/inventory').then(r => r.json()),
    fetch('/api/collectibles').then(r => r.json()),
    fetch('/api/gifts/people').then(r => r.json()),
    fetch('/api/travel/countries').then(r => r.json()),
    fetch('/api/travel/trips').then(r => r.json()),
    fetch('/api/bucket-list/trips').then(r => r.json()),
    fetch('/api/bucket-list/experiences').then(r => r.json()),
    fetch('/api/subscriptions').then(r => r.json()),
    fetch('/api/maintenance/items').then(r => r.json()),
    fetch('/api/documents').then(r => r.json()),
    fetch('/api/net-worth/entries').then(r => r.json()),
    fetch('/api/portfolio').then(r => r.json()),
  ])

  const habits = [...activeHabits, ...archivedHabits]

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Tasks
  const openTasks = tasks.filter((t: { done: boolean }) => !t.done)
  const taskRows = tasks.map((t: { done: boolean; title: string; priority: string; dueDate: string | null; category: string | null }) =>
    `<tr class="${t.done ? 'done' : ''}"><td>${esc(t.title)}</td><td>${esc(t.priority)}</td><td>${t.dueDate ? t.dueDate.slice(0, 10) : '—'}</td><td>${esc(t.category)}</td></tr>`
  ).join('')

  // Appointments
  const sortedAppts = [...appointments].sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date))
  const apptRows = sortedAppts.map((a: { title: string; date: string; time: string | null; category: string; location: string | null; cost: number | null }) =>
    `<tr><td>${esc(a.title)}</td><td>${a.date}</td><td>${a.time ?? '—'}</td><td>${esc(a.category)}</td><td>${esc(a.location)}</td><td>${fmt(a.cost)}</td></tr>`
  ).join('')

  // Goals
  const goalRows = lifeAreas.flatMap((a: { name: string; goals: { title: string; timePeriod: string; milestones: { completedAt: string | null }[] }[] }) =>
    a.goals.map((g: { title: string; timePeriod: string; milestones: { completedAt: string | null }[] }) => {
      const done = g.milestones.filter((m: { completedAt: string | null }) => m.completedAt).length
      return `<tr><td>${esc(a.name)}</td><td>${esc(g.title)}</td><td>${esc(g.timePeriod)}</td><td>${done}/${g.milestones.length}</td></tr>`
    })
  ).join('')

  // Habits
  const habitRows = habits.map((h: { name: string; color: string }) =>
    `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${h.color};margin-right:6px"></span>${esc(h.name)}</td></tr>`
  ).join('')

  // Memories
  const memoryRows = memories.map((m: { title: string; date: string; category: string; location: string | null }) =>
    `<tr><td>${esc(m.title)}</td><td>${m.date}</td><td>${esc(m.category)}</td><td>${esc(m.location)}</td></tr>`
  ).join('')

  // Travel — Countries
  const countryRows = [...travelCountries]
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
    .map((c: { name: string; tripCount: number; totalSpend: number }) =>
      `<tr><td>${esc(c.name)}</td><td>${c.tripCount}</td><td>${fmt(c.totalSpend)}</td></tr>`
    ).join('')

  // Travel — Trips
  const tripRows = [...travelTrips]
    .sort((a: { startDate: string | null }, b: { startDate: string | null }) =>
      (b.startDate ?? '').localeCompare(a.startDate ?? '')
    )
    .map((t: { countryName: string; cities: string[] | string; startDate: string | null; endDate: string | null; actualCost: number | null }) => {
      const cities = Array.isArray(t.cities) ? t.cities.join(', ') : (t.cities ?? '—')
      return `<tr><td>${esc(t.countryName)}</td><td>${esc(cities)}</td><td>${t.startDate ?? '—'}</td><td>${t.endDate ?? '—'}</td><td>${fmt(t.actualCost)}</td></tr>`
    }).join('')

  // Bucket List — Trips
  const bTripRows = bucketTrips.map((t: { destination: string; budget: number | null; targetYear: number | null; done: boolean }) =>
    `<tr><td>${esc(t.destination)}</td><td>${fmt(t.budget)}</td><td>${t.targetYear ?? '—'}</td><td>${t.done ? '✓' : '—'}</td></tr>`
  ).join('')

  // Bucket List — Experiences
  const bExpRows = bucketExperiences.map((e: { title: string; category: string; targetYear: number | null; done: boolean }) =>
    `<tr><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td>${e.targetYear ?? '—'}</td><td>${e.done ? '✓' : '—'}</td></tr>`
  ).join('')

  // Wishlist
  const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
  const activeWish = wishlist.filter((w: { purchased: boolean }) => !w.purchased)
  const wishRows = [...activeWish]
    .sort((a: { priority: string }, b: { priority: string }) =>
      (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    )
    .map((w: { name: string; category: { name: string } | null; priority: string; cost: number }) =>
      `<tr><td>${esc(w.name)}</td><td>${esc(w.category?.name)}</td><td>${esc(w.priority)}</td><td>${fmt(w.cost)}</td></tr>`
    ).join('')

  // Inventory
  type InvItem = { name: string; category: { name: string; valueMethod: string; depreciationRate: number | null } | null; quantity: number; cost: number; currentValue: number | null; purchaseDate: string | null }
  const invCostTotal = inventory.reduce((s: number, i: InvItem) => s + i.cost * i.quantity, 0)
  const invValueTotal = inventory.reduce((s: number, i: InvItem) => {
    const cat = i.category ?? { valueMethod: 'cost', depreciationRate: null }
    return s + computeValue({ cost: i.cost, currentValue: i.currentValue, purchaseDate: i.purchaseDate }, cat) * i.quantity
  }, 0)
  const invRows = inventory.map((i: InvItem) => {
    const cat = i.category ?? { valueMethod: 'cost', depreciationRate: null }
    const val = computeValue({ cost: i.cost, currentValue: i.currentValue, purchaseDate: i.purchaseDate }, cat)
    return `<tr><td>${esc(i.name)}</td><td>${esc(i.category?.name)}</td><td>${i.quantity}</td><td>${fmt(i.cost * i.quantity)}</td><td>${fmt(val * i.quantity)}</td></tr>`
  }).join('')

  // Collectibles
  const collectibleRows = collectibles.map((c: { name: string; collectionType: string; condition: string | null; purchasePrice: number | null; currentValue: number | null }) =>
    `<tr><td>${esc(c.name)}</td><td>${esc(c.collectionType)}</td><td>${esc(c.condition)}</td><td>${fmt(c.purchasePrice)}</td><td>${fmt(c.currentValue)}</td></tr>`
  ).join('')

  // Gifts
  const giftRows = giftPeople.map((p: { name: string; budget: number | null; ideas: { title: string; occasion: string | null; estimatedCost: number | null; purchased: boolean }[] }) => {
    const bought = p.ideas.filter((i: { purchased: boolean }) => i.purchased).length
    const ideaRows = p.ideas.map((i: { title: string; occasion: string | null; estimatedCost: number | null; purchased: boolean }) =>
      `<tr style="background:#f9f9f9"><td style="padding-left:24px">${esc(i.title)}</td><td>${esc(i.occasion)}</td><td>${i.purchased ? '✓' : '—'}</td><td>${fmt(i.estimatedCost)}</td></tr>`
    ).join('')
    return `<tr style="background:#f0f0f0;font-weight:bold"><td colspan="4">${esc(p.name)} — ${bought}/${p.ideas.length} bought${p.budget != null ? ` · Budget: ${fmt(p.budget)}` : ''}</td></tr>${ideaRows}`
  }).join('')

  // Subscriptions
  const activeSubs = subscriptions.filter((s: { active: boolean }) => s.active)
  const subRows = [...activeSubs]
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
    .map((s: { name: string; cost: number; period: string; renewalDate: string | null }) =>
      `<tr><td>${esc(s.name)}</td><td>${fmt(s.cost)}</td><td>${esc(s.period)}</td><td>${s.renewalDate ? s.renewalDate.slice(0, 10) : '—'}</td></tr>`
    ).join('')

  // Maintenance
  const maintRows = maintenanceItems.flatMap((item: HomeItem) =>
    item.tasks.map((task: MaintenanceTask) => {
      const { status, nextDue } = getTaskStatus(task)
      if (status === 'none') return ''
      const statusColor = status === 'overdue' ? '#dc2626' : status === 'due-soon' ? '#d97706' : '#16a34a'
      return `<tr><td>${esc(item.name)}</td><td>${esc(task.description)}</td><td style="color:${statusColor};font-weight:500">${status === 'overdue' ? 'Overdue' : status === 'due-soon' ? 'Due Soon' : 'OK'}${nextDue ? ` (${nextDue})` : ''}</td></tr>`
    })
  ).filter(Boolean).join('')

  // Documents
  const sortedDocs = [...documents].sort((a: { expiryDate: string | null }, b: { expiryDate: string | null }) => {
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return a.expiryDate.localeCompare(b.expiryDate)
  })
  const docRows = sortedDocs.map((d: { name: string; category: string; expiryDate: string | null }) =>
    `<tr><td>${esc(d.name)}</td><td>${esc(d.category)}</td><td>${d.expiryDate ?? '—'}</td></tr>`
  ).join('')

  // Net Worth
  const assets = netWorthEntries.filter((e: { type: string }) => e.type === 'asset')
  const liabilities = netWorthEntries.filter((e: { type: string }) => e.type === 'liability')
  const assetsTotal = assets.reduce((s: number, e: { value: number }) => s + e.value, 0)
  const liabsTotal = liabilities.reduce((s: number, e: { value: number }) => s + e.value, 0)
  const netTotal = assetsTotal - liabsTotal
  const assetRows = [...assets]
    .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
    .map((e: { name: string; category: string; value: number }) =>
      `<tr><td>${esc(e.name)}</td><td>${esc(e.category)}</td><td>${fmt(e.value)}</td></tr>`
    ).join('')
  const liabRows = [...liabilities]
    .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
    .map((e: { name: string; category: string; value: number }) =>
      `<tr><td>${esc(e.name)}</td><td>${esc(e.category)}</td><td>${fmt(e.value)}</td></tr>`
    ).join('')

  // Portfolio
  const portfolioTotal = portfolio.reduce((s: number, h: { type: string; quantity: number | null; currentPrice: number | null; balance: number | null }) => s + holdingValue(h), 0)
  const portRows = portfolio.map((h: { name: string; type: string; quantity: number | null; currentPrice: number | null; balance: number | null }) =>
    `<tr><td>${esc(h.name)}</td><td>${esc(h.type)}</td><td>${h.quantity != null ? h.quantity : '—'}</td><td>${h.currentPrice != null ? fmt(h.currentPrice) : '—'}</td><td>${fmt(holdingValue(h))}</td></tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Homebase Export — ${today}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #111; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 28px; color: #444; break-after: avoid; }
  h3 { font-size: 13px; margin-top: 16px; margin-bottom: 4px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
  th { text-align: left; padding: 6px 8px; background: #f0f0f0; border-bottom: 2px solid #ccc; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tfoot td { font-weight: bold; background: #f8f8f8; border-top: 2px solid #ccc; }
  .done td { text-decoration: line-through; color: #999; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  @media print { @page { margin: 1.5cm; } }
</style>
</head>
<body>
<h1>Homebase Export — ${today}</h1>

<h2>Tasks (${openTasks.length} open / ${tasks.length} total)</h2>
<table>
  <thead><tr><th>Title</th><th>Priority</th><th>Due Date</th><th>Category</th></tr></thead>
  <tbody>${taskRows}</tbody>
</table>

<h2>Appointments (${appointments.length} total)</h2>
<table>
  <thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Category</th><th>Location</th><th>Cost</th></tr></thead>
  <tbody>${apptRows}</tbody>
</table>

<h2>Goals</h2>
<table>
  <thead><tr><th>Area</th><th>Goal</th><th>Period</th><th>Milestones</th></tr></thead>
  <tbody>${goalRows}</tbody>
</table>

<h2>Habits (${habits.length})</h2>
<table>
  <thead><tr><th>Habit</th></tr></thead>
  <tbody>${habitRows}</tbody>
</table>

<h2>Memories (${memories.length})</h2>
<table>
  <thead><tr><th>Title</th><th>Date</th><th>Category</th><th>Location</th></tr></thead>
  <tbody>${memoryRows}</tbody>
</table>

<h2>Travel</h2>
<h3>Countries (${travelCountries.length})</h3>
<table>
  <thead><tr><th>Country</th><th>Trips</th><th>Total Spend</th></tr></thead>
  <tbody>${countryRows}</tbody>
</table>
<h3>Trips (${travelTrips.length})</h3>
<table>
  <thead><tr><th>Country</th><th>Cities</th><th>Start</th><th>End</th><th>Cost</th></tr></thead>
  <tbody>${tripRows}</tbody>
</table>

<h2>Bucket List</h2>
<h3>Trips (${bucketTrips.length})</h3>
<table>
  <thead><tr><th>Destination</th><th>Budget</th><th>Target Year</th><th>Done</th></tr></thead>
  <tbody>${bTripRows}</tbody>
</table>
<h3>Experiences (${bucketExperiences.length})</h3>
<table>
  <thead><tr><th>Title</th><th>Category</th><th>Target Year</th><th>Done</th></tr></thead>
  <tbody>${bExpRows}</tbody>
</table>

<h2>Wishlist (${activeWish.length} items)</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Priority</th><th>Cost</th></tr></thead>
  <tbody>${wishRows}</tbody>
</table>

<h2>Inventory (${inventory.length} items · cost ${fmt(invCostTotal)} · value ${fmt(invValueTotal)})</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Quantity</th><th>Cost</th><th>Value</th></tr></thead>
  <tbody>${invRows}</tbody>
</table>

<h2>Collectibles (${collectibles.length} items)</h2>
<table>
  <thead><tr><th>Name</th><th>Type</th><th>Condition</th><th>Purchase Price</th><th>Current Value</th></tr></thead>
  <tbody>${collectibleRows}</tbody>
</table>

<h2>Gifts</h2>
<table>
  <thead><tr><th>Item</th><th>Occasion</th><th>Purchased</th><th>Est. Cost</th></tr></thead>
  <tbody>${giftRows}</tbody>
</table>

<h2>Subscriptions (${activeSubs.length} active)</h2>
<table>
  <thead><tr><th>Name</th><th>Cost</th><th>Period</th><th>Renewal Date</th></tr></thead>
  <tbody>${subRows}</tbody>
</table>

<h2>Maintenance</h2>
<table>
  <thead><tr><th>Item</th><th>Task</th><th>Status</th></tr></thead>
  <tbody>${maintRows || '<tr><td colspan="3" style="color:#999">All maintenance tasks up to date.</td></tr>'}</tbody>
</table>

<h2>Documents (${documents.length} total)</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Expiry Date</th></tr></thead>
  <tbody>${docRows}</tbody>
</table>

<h2>Net Worth</h2>
<h3>Assets</h3>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Value</th></tr></thead>
  <tbody>${assetRows}</tbody>
  <tfoot><tr><td colspan="2">Total Assets</td><td>${fmt(assetsTotal)}</td></tr></tfoot>
</table>
<h3>Liabilities</h3>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Value</th></tr></thead>
  <tbody>${liabRows}</tbody>
  <tfoot><tr><td colspan="2">Total Liabilities</td><td>${fmt(liabsTotal)}</td></tr></tfoot>
</table>
<p style="font-size:15px;font-weight:bold;margin-top:8px">Net Worth: ${fmt(netTotal)}</p>

<h2>Portfolio</h2>
<table>
  <thead><tr><th>Name</th><th>Type</th><th>Quantity</th><th>Current Price</th><th>Value</th></tr></thead>
  <tbody>${portRows}</tbody>
  <tfoot><tr><td colspan="4">Total Portfolio Value</td><td>${fmt(portfolioTotal)}</td></tr></tfoot>
</table>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }
}
