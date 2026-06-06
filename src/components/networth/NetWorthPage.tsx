'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PortfolioPage from '@/components/portfolio/PortfolioPage'
import { holdingValue, PortfolioHolding, NetWorthSnapshot } from '@/lib/netWorthUtils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORIES = ['property', 'vehicle', 'cash', 'credit_card', 'loan', 'mortgage', 'other'] as const
type Category = typeof CATEGORIES[number]

interface NetWorthEntry {
  id: number
  name: string
  value: number
  type: 'asset' | 'liability'
  category: Category
  notes: string | null
}

interface Snapshot {
  id: number; date: string; wishlistTotal: number; portfolioTotal: number
}

interface Subscription {
  id: number; name: string; cost: number; period: string; active: boolean
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function formatCategory(cat: string): string {
  if (cat === 'credit_card') return 'Credit Card'
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Line chart ───────────────────────────────────────────────────────────
const SVG_W = 600, SVG_H = 160, PAD_L = 56, PAD_R = 16, PAD_T = 12, PAD_B = 24

function LineChart({ data, color = '#10b981' }: { data: { x: number; y: number }[]; color?: string }) {
  if (data.length < 2) {
    return <p className="text-sm text-gray-400 text-center py-6">Add more data to see the trend.</p>
  }
  const minX = Math.min(...data.map(d => d.x))
  const maxX = Math.max(...data.map(d => d.x))
  const minY = Math.min(...data.map(d => d.y))
  const maxY = Math.max(...data.map(d => d.y))
  const rangeX = maxX - minX || 1
  const rangeY = (maxY - minY) * 1.1 || 1
  const adjustedMinY = minY - (maxY - minY) * 0.05
  const cW = SVG_W - PAD_L - PAD_R
  const cH = SVG_H - PAD_T - PAD_B
  const toSx = (x: number) => PAD_L + ((x - minX) / rangeX) * cW
  const toSy = (y: number) => PAD_T + cH - ((y - adjustedMinY) / rangeY) * cH
  const pts = data.map(d => ({ sx: toSx(d.x), sy: toSy(d.y), y: d.y, x: d.x }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].sx.toFixed(1)} ${(PAD_T + cH).toFixed(1)} L ${pts[0].sx.toFixed(1)} ${(PAD_T + cH).toFixed(1)} Z`
  const yTicks = [minY, (minY + maxY) / 2, maxY]
  const xLabels = [
    { sx: toSx(minX), label: new Date(minX).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) },
    { sx: toSx(maxX), label: new Date(maxX).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) },
  ]
  const gradId = `nw-grad-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: SVG_H }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={toSy(tick).toFixed(1)} x2={SVG_W - PAD_R} y2={toSy(tick).toFixed(1)}
            stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4" />
          <text x={PAD_L - 4} y={toSy(tick) + 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">
            {tick >= 1000 ? `€${(tick / 1000).toFixed(0)}k` : `€${tick.toFixed(0)}`}
          </text>
        </g>
      ))}
      {xLabels.map((l, i) => (
        <text key={i} x={l.sx} y={SVG_H - 4} textAnchor={i === 0 ? 'start' : 'end'} fontSize="9" fill="currentColor" opacity="0.5">
          {l.label}
        </text>
      ))}
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.sx.toFixed(1)} cy={p.sy.toFixed(1)} r="3" fill={color}>
          <title>{fmt(p.y)} · {new Date(p.x).toLocaleDateString()}</title>
        </circle>
      ))}
    </svg>
  )
}

// ─── Entry form ───────────────────────────────────────────────────────────
function EntryForm({ initial, defaultType, onSave, onCancel }: {
  initial?: NetWorthEntry
  defaultType: 'asset' | 'liability'
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [value, setValue] = useState(initial?.value?.toString() ?? '')
  const [type, setType] = useState<'asset' | 'liability'>(initial?.type ?? defaultType)
  const [category, setCategory] = useState<Category>(initial?.category ?? 'other')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, value: Number(value), type, category, notes: notes || null }
    if (initial?.id) {
      await fetch(`/api/net-worth/entries/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/net-worth/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Home, Car loan)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input required type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="Value (€)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <div className="flex gap-2">
        <select value={type} onChange={e => setType(e.target.value as 'asset' | 'liability')} className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value as Category)} className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          {CATEGORIES.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
        </select>
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add entry'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function NetWorthPage() {
  const { data: entries = [], mutate: mutateEntries } = useSWR<NetWorthEntry[]>('/api/net-worth/entries', fetcher)
  const { data: holdings = [] } = useSWR<PortfolioHolding[]>('/api/portfolio', fetcher)
  const { data: snapshots = [], mutate: mutateSnapshots } = useSWR<NetWorthSnapshot[]>('/api/net-worth/snapshots', fetcher)
  const { data: snapshots2 = [], mutate: mutateSnapshots2 } = useSWR<Snapshot[]>('/api/snapshots', fetcher)
  const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const [addType, setAddType] = useState<'asset' | 'liability'>('asset')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<NetWorthEntry | null>(null)
  const [showPortfolio, setShowPortfolio] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (sessionStorage.getItem('lastNetWorthSnapshot') === today) return
    fetch('/api/net-worth/snapshots', { method: 'POST' }).then(r => {
      if (!r.ok) return
      sessionStorage.setItem('lastNetWorthSnapshot', today)
      mutateSnapshots()
    })
  }, [mutateSnapshots])

  useEffect(() => {
    const today = new Date().toDateString()
    if (sessionStorage.getItem('lastSnapshot') === today) return
    fetch('/api/snapshots', { method: 'POST' }).then(r => {
      if (!r.ok) return
      sessionStorage.setItem('lastSnapshot', today)
      mutateSnapshots2()
    })
  }, [mutateSnapshots2])

  const portfolioTotal = holdings.reduce((s, h) => s + holdingValue(h), 0)
  const liabilityEntries = entries.filter(e => e.type === 'liability')
  const totalAssets = portfolioTotal
  const subscriptionAnnualTotal = subscriptions
    .filter(s => s.active)
    .reduce((sum, s) => sum + (s.period === 'yearly' ? s.cost : s.cost * 12), 0)
  const totalLiabilities = liabilityEntries.reduce((s, e) => s + e.value, 0) + subscriptionAnnualTotal
  const netWorth = totalAssets - totalLiabilities

  const sortedSnapshots = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = sortedSnapshots.map(s => ({ x: new Date(s.date).getTime(), y: s.total }))

  const sortedSnapshots2 = [...snapshots2].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const wishlistChartData = sortedSnapshots2.map(s => ({ x: new Date(s.date).getTime(), y: s.wishlistTotal }))
  const portfolioChartData = sortedSnapshots2.map(s => ({ x: new Date(s.date).getTime(), y: s.portfolioTotal }))

  async function deleteEntry(id: number) {
    if (!confirm('Delete this entry?')) return
    await fetch(`/api/net-worth/entries/${id}`, { method: 'DELETE' })
    mutateEntries()
  }

  function groupByCategory(list: NetWorthEntry[]) {
    const groups: Record<string, NetWorthEntry[]> = {}
    list.forEach(e => {
      if (!groups[e.category]) groups[e.category] = []
      groups[e.category].push(e)
    })
    return groups
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Net Worth</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Net Worth</p>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{fmt(netWorth)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Assets</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{fmt(totalAssets)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Liabilities</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{fmt(totalLiabilities)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Net Worth Over Time</h2>
        <LineChart data={chartData} />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Wishlist Total Over Time</h2>
        <LineChart data={wishlistChartData} color="#3b82f6" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Portfolio Value Over Time</h2>
        <LineChart data={portfolioChartData} color="#10b981" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assets <span className="text-green-600 dark:text-green-400 font-bold ml-1">{fmt(totalAssets)}</span></h2>
            <button
              onClick={() => setShowPortfolio(true)}
              className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Manage portfolio →
            </button>
          </div>

          {holdings.length === 0 ? (
            <p className="text-sm text-gray-400">No portfolio holdings yet.</p>
          ) : (
            <div>
              {holdings.map(h => (
                <div key={h.id} className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{h.name}</span>
                  <span className="text-sm text-gray-900 dark:text-white">{fmt(holdingValue(h))}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400">Portfolio total</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{fmt(portfolioTotal)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Liabilities <span className="text-red-500 font-bold ml-1">{fmt(totalLiabilities)}</span></h2>
            <button onClick={() => { setAddType('liability'); setShowAdd(true) }} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">+ Add</button>
          </div>

          {Object.entries(groupByCategory(liabilityEntries)).map(([cat, items]) => (
            <div key={cat} className="mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{formatCategory(cat)}</p>
              {items.map(e => (
                <div key={e.id} className="flex justify-between items-center py-1 group">
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{e.name}</span>
                  <span className="text-sm text-gray-900 dark:text-white mr-3">{fmt(e.value)}</span>
                  <div className="hidden group-hover:flex gap-1">
                    <button onClick={() => setEditing(e)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                    <button onClick={() => deleteEntry(e.id)} className="text-xs px-1.5 py-0.5 text-red-400 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {subscriptionAnnualTotal > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Subscriptions</p>
              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Subscriptions (annual)</span>
                  <p className="text-xs text-gray-400 italic">estimated annual cost</p>
                </div>
                <span className="text-sm text-gray-900 dark:text-white mr-3">{fmt(subscriptionAnnualTotal)}</span>
              </div>
            </div>
          )}

          {liabilityEntries.length === 0 && subscriptionAnnualTotal === 0 && (
            <p className="text-sm text-gray-400">No liabilities yet.</p>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title={`Add ${addType}`} onClose={() => setShowAdd(false)}>
          <EntryForm defaultType={addType} onSave={() => { setShowAdd(false); mutateEntries() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit entry" onClose={() => setEditing(null)}>
          <EntryForm initial={editing} defaultType={editing.type} onSave={() => { setEditing(null); mutateEntries() }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {showPortfolio && (
        <Modal title="Portfolio Holdings" onClose={() => setShowPortfolio(false)}>
          <div className="max-h-[70vh] overflow-y-auto -mx-4 px-4">
            <PortfolioPage hideHeader />
          </div>
        </Modal>
      )}
    </div>
  )
}
