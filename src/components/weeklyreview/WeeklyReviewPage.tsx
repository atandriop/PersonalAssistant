'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface WishlistItemRow { id: number; name: string; cost: number; priority: string }
interface InventoryItemRow { id: number; name: string; cost: number }
interface PortfolioHoldingRow {
  id: number; name: string; type: string
  currentPrice?: number | null; buyPrice?: number | null; quantity?: number | null
  balance?: number | null; interestRate?: number | null
}
interface WeeklyData {
  wishlistItems: WishlistItemRow[]
  inventoryItems: InventoryItemRow[]
  portfolioHoldings: PortfolioHoldingRow[]
  portfolioDelta: number | null
  weekStart: string
  weekEnd: string
}

function getWeekKey(): string {
  const d = new Date()
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `weekly-review-notes-${d.getFullYear()}-W${week}`
}

function WeekSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function WeeklyReviewPage() {
  const { data } = useSWR<WeeklyData>('/api/weekly-review', fetcher)
  const [notes, setNotes] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const weekKey = getWeekKey()

  useEffect(() => {
    setNotes(localStorage.getItem(weekKey) ?? '')
  }, [weekKey])

  function saveNotes(value: string) {
    setNotes(value)
    localStorage.setItem(weekKey, value)
  }

  function buildPrompt(): string {
    if (!data) return ''
    const { wishlistItems, inventoryItems, portfolioHoldings, portfolioDelta, weekStart, weekEnd } = data
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const wTotal = wishlistItems.reduce((s, i) => s + i.cost, 0)
    const wLines = wishlistItems.length
      ? wishlistItems.map(i => `- ${i.name} — €${i.cost.toFixed(2)} [${i.priority}]`).join('\n')
      : '(none)'
    const iLines = inventoryItems.length
      ? inventoryItems.map(i => `- ${i.name} — €${i.cost.toFixed(2)}`).join('\n')
      : '(none)'
    const pLines = portfolioHoldings.length
      ? portfolioHoldings.map(h => {
          if (h.type === 'savings') return `- ${h.name} (savings): €${(h.balance ?? 0).toFixed(2)}`
          const v = (h.currentPrice ?? 0) * (h.quantity ?? 0)
          const p = ((h.currentPrice ?? 0) - (h.buyPrice ?? 0)) * (h.quantity ?? 0)
          return `- ${h.name} (${h.type}): €${v.toFixed(2)} [P&L: ${p >= 0 ? '+' : ''}€${p.toFixed(2)}]`
        }).join('\n')
      : '(none)'
    const delta = portfolioDelta !== null
      ? `Portfolio delta vs 7 days ago: ${portfolioDelta >= 0 ? '+' : ''}€${portfolioDelta.toFixed(2)}`
      : 'Portfolio delta: not enough data'
    return `Weekly review — ${fmt(weekStart)} to ${fmt(weekEnd)}

WISHLIST (${wishlistItems.length} added${wishlistItems.length ? `, €${wTotal.toFixed(2)} total` : ''}):
${wLines}

INVENTORY (${inventoryItems.length} added):
${iLines}

PORTFOLIO (${portfolioHoldings.length} added):
${pLines}

${delta}

MY NOTES:
${notes.trim() || '(none)'}

Please identify patterns in this week's activity, flag anything I should follow up on, and suggest 2-3 priorities for next week.`
  }

  const dateRange = data
    ? `${new Date(data.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(data.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Review</h1>
          {dateRange && <p className="text-sm text-gray-400 mt-0.5">{dateRange}</p>}
        </div>
        <button
          onClick={() => setShowPrompt(true)}
          disabled={!data}
          className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Generate AI Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <WeekSection title={`Wishlist added (${data?.wishlistItems.length ?? 0})`}>
            {data?.wishlistItems.length ? (
              <ul className="flex flex-col gap-1">
                {data.wishlistItems.map(i => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{i.name}</span>
                    <span className="text-gray-500">€{i.cost.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
          </WeekSection>

          <WeekSection title={`Inventory added (${data?.inventoryItems.length ?? 0})`}>
            {data?.inventoryItems.length ? (
              <ul className="flex flex-col gap-1">
                {data.inventoryItems.map(i => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{i.name}</span>
                    <span className="text-gray-500">€{i.cost.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
          </WeekSection>

          <WeekSection title={`Portfolio changes (${data?.portfolioHoldings.length ?? 0})`}>
            {data?.portfolioHoldings.length ? (
              <ul className="flex flex-col gap-1">
                {data.portfolioHoldings.map(h => (
                  <li key={h.id} className="text-sm text-gray-800 dark:text-gray-200">
                    {h.name} <span className="text-gray-400">({h.type})</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
            {data?.portfolioDelta != null && (
              <p className={`text-sm font-medium mt-2 ${data.portfolioDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                Delta: {data.portfolioDelta >= 0 ? '+' : ''}€{data.portfolioDelta.toFixed(2)} vs 7 days ago
              </p>
            )}
          </WeekSection>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => saveNotes(e.target.value)}
            placeholder="What happened this week? What's on your mind?"
            rows={16}
            className="flex-1 border rounded-xl px-4 py-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Saved automatically. Clears at the start of a new week.</p>
        </div>
      </div>

      {showPrompt && data && (
        <PromptModal
          title="Weekly Review AI Prompt"
          prompt={buildPrompt()}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
