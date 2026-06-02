'use client'

import useSWR from 'swr'
import type { Subscription } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Holding {
  id: number; name: string; type: string
  quantity?: number | null; buyPrice?: number | null; currentPrice?: number | null
  balance?: number | null
}

interface NetWorthEntry { id: number; value: number; type: 'asset' | 'liability' }

interface WishlistItem { id: number; cost: number; priority: string; purchased: boolean }

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtDecimal(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

function holdingValue(h: Holding): number {
  return h.type === 'savings' ? (h.balance ?? 0) : (h.currentPrice ?? 0) * (h.quantity ?? 0)
}

const TYPE_COLOR: Record<string, string> = {
  stock: '#3b82f6', crypto: '#f59e0b', savings: '#10b981', other: '#8b5cf6',
}

const PRIORITY_ORDER = ['High', 'Medium', 'Low'] as const
const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }

export default function FinancePage() {
  const { data: holdings = [] } = useSWR<Holding[]>('/api/portfolio', fetcher)
  const { data: entries = [] } = useSWR<NetWorthEntry[]>('/api/net-worth/entries', fetcher)
  const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const { data: wishlist = [] } = useSWR<WishlistItem[]>('/api/wishlist', fetcher)

  const portfolioTotal = holdings.reduce((s, h) => s + holdingValue(h), 0)
  const assetTotal = portfolioTotal + entries.filter(e => e.type === 'asset').reduce((s, e) => s + e.value, 0)
  const subAnnual = subscriptions.filter(s => s.active).reduce((s, sub) => s + (sub.period === 'yearly' ? sub.cost : sub.cost * 12), 0)
  const liabilityTotal = entries.filter(e => e.type === 'liability').reduce((s, e) => s + e.value, 0) + subAnnual
  const netWorth = assetTotal - liabilityTotal

  const portfolioPnl = holdings
    .filter(h => h.quantity != null && h.currentPrice != null && h.buyPrice != null)
    .reduce((s, h) => s + ((h.currentPrice! - h.buyPrice!) * h.quantity!), 0)

  const monthlySubCost = subscriptions.filter(s => s.active).reduce((s, sub) =>
    s + (sub.period === 'yearly' ? sub.cost / 12 : sub.cost), 0)

  const totalPortfolioValue = portfolioTotal || 1
  const byType = ['stock', 'crypto', 'savings', 'other'].map(type => ({
    type,
    value: holdings.filter(h => h.type === type).reduce((s, h) => s + holdingValue(h), 0),
  })).filter(x => x.value > 0)

  const activeSubs = [...subscriptions]
    .filter(s => s.active)
    .map(s => ({ ...s, monthly: s.period === 'yearly' ? s.cost / 12 : s.cost }))
    .sort((a, b) => b.monthly - a.monthly)
  const annualSubCost = activeSubs.reduce((s, sub) => s + (sub.period === 'yearly' ? sub.cost : sub.cost * 12), 0)

  const activeWishlist = wishlist.filter(i => !i.purchased)
  const byPriority = PRIORITY_ORDER.map(p => ({
    priority: p,
    count: activeWishlist.filter(i => i.priority === p).length,
    value: activeWishlist.filter(i => i.priority === p).reduce((s, i) => s + i.cost, 0),
  })).filter(p => p.count > 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Finance</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Net Worth</p>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{fmt(netWorth)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Monthly Subscriptions</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{fmtDecimal(monthlySubCost)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Portfolio P&amp;L</p>
          <p className={`text-xl font-semibold ${portfolioPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {portfolioPnl >= 0 ? '+' : ''}{fmtDecimal(portfolioPnl)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Portfolio Breakdown</h2>
          {byType.length === 0 ? (
            <p className="text-sm text-gray-400">No portfolio holdings yet.</p>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {byType.map(x => (
                  <div
                    key={x.type}
                    style={{ width: `${(x.value / totalPortfolioValue) * 100}%`, background: TYPE_COLOR[x.type] }}
                  />
                ))}
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {byType.map(x => (
                    <tr key={x.type} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <td className="py-1.5">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLOR[x.type] }} />
                          <span className="capitalize text-gray-700 dark:text-gray-300">{x.type}</span>
                        </span>
                      </td>
                      <td className="py-1.5 text-right text-gray-900 dark:text-white font-medium">{fmt(x.value)}</td>
                      <td className="py-1.5 text-right text-gray-400 w-14">{((x.value / totalPortfolioValue) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="pt-2 text-gray-500 font-medium">Total</td>
                    <td className="pt-2 text-right font-bold text-gray-900 dark:text-white">{fmt(portfolioTotal)}</td>
                    <td className="pt-2 text-right text-gray-400">100%</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Subscriptions</h2>
          {activeSubs.length === 0 ? (
            <p className="text-sm text-gray-400">No active subscriptions.</p>
          ) : (
            <>
              <div className="flex flex-col gap-1 mb-3">
                {activeSubs.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.name}</span>
                      {s.renewalDate && (
                        <span className="text-xs text-gray-400 ml-2">
                          renews {new Date(s.renewalDate.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white shrink-0 ml-2">{fmtDecimal(s.monthly)}/mo</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>Monthly total</span><span className="font-medium">{fmtDecimal(monthlySubCost)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pt-1">
                <span>Annual total</span><span className="font-medium">{fmt(annualSubCost)}</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:col-span-2">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Wishlist</h2>
          {byPriority.length === 0 ? (
            <p className="text-sm text-gray-400">Wishlist is clear.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-1.5 font-medium">Priority</th>
                  <th className="text-right pb-1.5 font-medium">Items</th>
                  <th className="text-right pb-1.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {byPriority.map(p => (
                  <tr key={p.priority} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[p.priority] }} />
                        <span className="text-gray-700 dark:text-gray-300">{p.priority}</span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-gray-500">{p.count}</td>
                    <td className="py-1.5 text-right font-medium text-gray-900 dark:text-white">{fmt(p.value)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="pt-2 text-gray-500 font-medium">Total</td>
                  <td className="pt-2 text-right text-gray-500">{activeWishlist.length}</td>
                  <td className="pt-2 text-right font-bold text-gray-900 dark:text-white">
                    {fmt(activeWishlist.reduce((s, i) => s + i.cost, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
