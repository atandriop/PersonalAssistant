'use client'

import useSWR from 'swr'
import { SUBSCRIPTION_CATEGORIES } from '@/components/subscriptions/SubscriptionsPage'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Subscription { id: number; cost: number; period: string; active: boolean; category: string }
interface Trip { id: number; startDate: string | null; endDate: string | null; actualCost: number | null }
interface Appointment { id: number; date: string; cost: number | null }
interface InventoryItem { id: number; cost: number; quantity: number; createdAt: string }
interface HomeItem { logs: MaintenanceLog[] }
interface MaintenanceLog { id: number; date: string; cost: number | null }
interface GiftPerson { ideas: GiftIdea[] }
interface GiftIdea { id: number; estimatedCost: number | null; purchased: boolean; createdAt: string }

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function isThisYear(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr).getFullYear() === new Date().getFullYear()
}

export default function CostsTab() {
  const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const { data: trips = [] } = useSWR<Trip[]>('/api/travel/trips', fetcher)
  const { data: appointments = [] } = useSWR<Appointment[]>('/api/appointments', fetcher)
  const { data: inventory = [] } = useSWR<InventoryItem[]>('/api/inventory', fetcher)
  const { data: maintenanceItems = [] } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const { data: giftPeople = [] } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)

  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31, 23, 59, 59)
  const daysElapsed = Math.ceil((now.getTime() - startOfYear.getTime()) / 86400000)
  const daysInYear = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / 86400000)
  const daysRemaining = daysInYear - daysElapsed

  const today = now.toISOString().slice(0, 10)

  // Trips
  const pastTrips = trips.filter(t => {
    const anchor = t.endDate ?? t.startDate
    return anchor && isThisYear(anchor) && anchor <= today
  })
  const futureTrips = trips.filter(t => t.startDate && isThisYear(t.startDate) && t.startDate > today)
  const tripsYtd = pastTrips.reduce((s, t) => s + (t.actualCost ?? 0), 0)
  const tripsRemaining = futureTrips.reduce((s, t) => s + (t.actualCost ?? 0), 0)

  // Appointments
  const pastAppts = appointments.filter(a => isThisYear(a.date) && a.date <= today)
  const futureAppts = appointments.filter(a => isThisYear(a.date) && a.date > today)
  const apptsYtd = pastAppts.reduce((s, a) => s + (a.cost ?? 0), 0)
  const apptsRemaining = futureAppts.reduce((s, a) => s + (a.cost ?? 0), 0)

  // Subscriptions by category
  const activeSubs = subscriptions.filter(s => s.active)
  const subsByCategory = SUBSCRIPTION_CATEGORIES.map(cat => {
    const catSubs = activeSubs.filter(s => (s.category ?? 'Other') === cat)
    const annualTotal = catSubs.reduce((s, sub) => s + (sub.period === 'yearly' ? sub.cost : sub.cost * 12), 0)
    return {
      category: cat,
      ytd: annualTotal * (daysElapsed / daysInYear),
      remaining: annualTotal * (daysRemaining / daysInYear),
    }
  }).filter(g => g.ytd > 0 || g.remaining > 0)

  const subsYtd = subsByCategory.reduce((s, g) => s + g.ytd, 0)
  const subsRemaining = subsByCategory.reduce((s, g) => s + g.remaining, 0)

  // Purchases (inventory)
  const purchasesYtd = inventory
    .filter(i => isThisYear(i.createdAt))
    .reduce((s, i) => s + i.cost * i.quantity, 0)

  // Maintenance
  const allLogs: MaintenanceLog[] = maintenanceItems.flatMap(item => item.logs)
  const maintenanceYtd = allLogs
    .filter(l => isThisYear(l.date) && l.date <= today)
    .reduce((s, l) => s + (l.cost ?? 0), 0)

  // Gifts
  const allIdeas: GiftIdea[] = giftPeople.flatMap(p => p.ideas)
  const giftsYtd = allIdeas
    .filter(i => i.purchased && isThisYear(i.createdAt))
    .reduce((s, i) => s + (i.estimatedCost ?? 0), 0)

  const totalYtd = tripsYtd + apptsYtd + subsYtd + purchasesYtd + maintenanceYtd + giftsYtd
  const totalRemaining = tripsRemaining + apptsRemaining + subsRemaining
  const totalYear = totalYtd + totalRemaining

  type Row = { label: string; ytd: number; remaining: number; isSubCategory?: boolean }

  const rows: Row[] = [
    { label: 'Trips', ytd: tripsYtd, remaining: tripsRemaining },
    { label: 'Appointments', ytd: apptsYtd, remaining: apptsRemaining },
    ...subsByCategory.map(g => ({ label: g.category, ytd: g.ytd, remaining: g.remaining, isSubCategory: true })),
    { label: 'Purchases', ytd: purchasesYtd, remaining: 0 },
    { label: 'Maintenance', ytd: maintenanceYtd, remaining: 0 },
    { label: 'Gifts', ytd: giftsYtd, remaining: 0 },
  ].filter(r => r.ytd > 0 || r.remaining > 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{year} Costs</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Spent so far</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(totalYtd)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Projected remaining</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(totalRemaining)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 mb-4">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <span className="font-medium uppercase tracking-wide">Year estimate: {fmt(totalYear)}</span>
          <div className="flex gap-8">
            <span>Spent YTD</span>
            <span>Remaining</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                <td className={`py-2.5 ${row.isSubCategory ? 'pl-8 text-gray-500 dark:text-gray-400' : 'pl-4 font-medium text-gray-700 dark:text-gray-300'}`}>
                  {row.isSubCategory ? `↳ ${row.label}` : row.label}
                </td>
                <td className="py-2.5 pr-4 text-right text-gray-900 dark:text-white w-32">{fmt(row.ytd)}</td>
                <td className="py-2.5 pr-4 text-right text-gray-400 w-32">{row.remaining > 0 ? fmt(row.remaining) : '—'}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-gray-700">
              <td className="py-3 pl-4 font-bold text-gray-900 dark:text-white">Total</td>
              <td className="py-3 pr-4 text-right font-bold text-gray-900 dark:text-white">{fmt(totalYtd)}</td>
              <td className="py-3 pr-4 text-right font-bold text-gray-400">{fmt(totalRemaining)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Subscriptions are pro-rated ({daysElapsed} days elapsed of {daysInYear}). Maintenance and gift figures are totals only.
      </p>
    </div>
  )
}
