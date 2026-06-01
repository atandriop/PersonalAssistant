'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import Badge from '@/components/ui/Badge'
import HoldingForm from './HoldingForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Holding {
  id: number; name: string; type: string
  quantity?: number | null; buyPrice?: number | null; currentPrice?: number | null
  balance?: number | null; interestRate?: number | null; notes?: string | null
}

const TYPE_COLOR: Record<string, string> = {
  stock: '#3b82f6', crypto: '#f59e0b', savings: '#10b981', other: '#8b5cf6',
}

function holdingValue(h: Holding): number {
  return h.type === 'savings' ? (h.balance ?? 0) : (h.currentPrice ?? 0) * (h.quantity ?? 0)
}

function holdingPnl(h: Holding): number {
  if (h.type === 'savings') return 0
  return ((h.currentPrice ?? 0) - (h.buyPrice ?? 0)) * (h.quantity ?? 0)
}

function projected(h: Holding): number {
  return (h.balance ?? 0) * (1 + (h.interestRate ?? 0) / 100)
}

export default function PortfolioPage() {
  const { data: holdings = [], mutate } = useSWR<Holding[]>('/api/portfolio', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)

  const filtered = holdings.filter(h => !filterType || h.type === filterType)
  const totalValue = holdings.reduce((s, h) => s + holdingValue(h), 0)
  const nonSavings = holdings.filter(h => h.type !== 'savings')
  const totalPnl = nonSavings.reduce((s, h) => s + holdingPnl(h), 0)
  const totalCost = nonSavings.reduce((s, h) => s + (h.buyPrice ?? 0) * (h.quantity ?? 0), 0)

  const byType = ['stock', 'crypto', 'savings', 'other']
    .map(t => ({ type: t, total: holdings.filter(h => h.type === t).reduce((s, h) => s + holdingValue(h), 0) }))
    .filter(x => x.total > 0)

  async function savePriceInline(h: Holding) {
    const val = Number(priceInput)
    await fetch(`/api/portfolio/${h.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...h,
        currentPrice: h.type === 'savings' ? h.currentPrice : val,
        balance: h.type === 'savings' ? val : h.balance,
      }),
    })
    setEditingPriceId(null)
    mutate()
  }

  async function del(id: number) {
    if (!confirm('Delete this holding?')) return
    await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
    mutate()
  }

  function buildPortfolioPrompt(): string {
    const lines = holdings.map(h => {
      if (h.type === 'savings') {
        return `[SAVINGS — ${h.name}]: balance €${(h.balance ?? 0).toFixed(2)}${h.interestRate ? `, interest ${h.interestRate}%` : ''}`
      }
      const v = holdingValue(h)
      const p = holdingPnl(h)
      return `[${h.type.toUpperCase()} — ${h.name}]: value €${v.toFixed(2)}, P&L ${p >= 0 ? '+' : ''}€${p.toFixed(2)}`
    }).join('\n')
    const byType = ['stock', 'crypto', 'savings', 'other']
      .map(t => {
        const total = holdings.filter(h => h.type === t).reduce((s, h) => s + holdingValue(h), 0)
        return total > 0 ? `${t} €${total.toFixed(2)}` : ''
      })
      .filter(Boolean).join(', ')
    return `Here is my current investment portfolio:

${lines}

Summary:
- Total portfolio value: €${totalValue.toFixed(2)}
- Total P&L (non-savings): ${totalPnl >= 0 ? '+' : ''}€${totalPnl.toFixed(2)}${totalCost > 0 ? ` (${((totalPnl / totalCost) * 100).toFixed(1)}%)` : ''}
- Breakdown by type: ${byType}

Please analyse this portfolio. Identify concentration risk, comment on the balance between asset types, flag any significant unrealised losses, and suggest 2-3 rebalancing considerations.`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPrompt(true)}
            disabled={holdings.length === 0}
            className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            AI Prompt
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add holding
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: €{totalValue.toFixed(2)}</span>
        {nonSavings.length > 0 && (
          <span className={`text-sm font-semibold ${totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            P&amp;L: {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
            {totalCost > 0 && <span className="text-xs ml-1 opacity-70">({((totalPnl / totalCost) * 100).toFixed(1)}%)</span>}
          </span>
        )}
        {byType.map(x => <Badge key={x.type} color={TYPE_COLOR[x.type]}>{x.type} €{x.total.toFixed(2)}</Badge>)}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All types</option>
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
          <option value="savings">Savings</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Holdings list */}
      <div className="flex flex-col gap-2">
        {filtered.map(h => {
          const v = holdingValue(h)
          const p = holdingPnl(h)
          const isSavings = h.type === 'savings'
          const displayVal = isSavings ? (h.balance ?? 0) : (h.currentPrice ?? 0)

          return (
            <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{h.name}</span>
                  <Badge color={TYPE_COLOR[h.type]}>{h.type}</Badge>
                </div>
                {!isSavings && h.quantity != null && (
                  <p className="text-xs text-gray-400 mt-0.5">qty: {h.quantity} · buy: €{h.buyPrice?.toFixed(2)}</p>
                )}
                {isSavings && h.interestRate != null && h.interestRate > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">1yr projection: €{projected(h).toFixed(2)}</p>
                )}
                {h.notes && <p className="text-xs text-gray-400">{h.notes}</p>}
              </div>

              <div className="text-right shrink-0">
                {editingPriceId === h.id ? (
                  <input
                    autoFocus type="number" step="0.01" value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    onBlur={() => savePriceInline(h)}
                    onKeyDown={e => e.key === 'Enter' && savePriceInline(h)}
                    className="w-24 border rounded px-2 py-1 text-sm text-right dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingPriceId(h.id); setPriceInput(String(displayVal)) }}
                    className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    title={isSavings ? 'Click to update balance' : 'Click to update price'}
                  >
                    €{v.toFixed(2)}
                  </button>
                )}
                {!isSavings && (
                  <div className={`text-xs font-medium ${p >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {p >= 0 ? '+' : ''}€{p.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(h)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                <button onClick={() => del(h.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No holdings yet. Add one to get started.</p>
      )}

      {showAdd && (
        <Modal title="Add holding" onClose={() => setShowAdd(false)}>
          <HoldingForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit holding" onClose={() => setEditing(null)}>
          <HoldingForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {showPrompt && (
        <PromptModal
          title="Portfolio Health Check"
          prompt={buildPortfolioPrompt()}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
