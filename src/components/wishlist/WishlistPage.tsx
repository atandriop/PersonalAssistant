'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import Badge from '@/components/ui/Badge'
import WishlistForm from './WishlistForm'
import CategoryManager from '@/components/categories/CategoryManager'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }
interface UpgradeRef { id: number; name: string }
interface WishlistItem {
  id: number; name: string; url?: string; cost: number; priority: string
  notes?: string; purchased: boolean; categoryId: number
  category: Category; inventoryUpgrades: UpgradeRef[]
}

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }

export default function WishlistPage() {
  const { data: items = [], mutate } = useSWR<WishlistItem[]>('/api/wishlist', fetcher)
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<WishlistItem | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)

  const active = items.filter(i => !i.purchased)
  const filtered = active
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterCat || String(i.categoryId) === filterCat)

  const total = active.reduce((s, i) => s + i.cost, 0)
  const byCategory = categories.map(c => ({ ...c, subtotal: active.filter(i => i.categoryId === c.id).reduce((s, i) => s + i.cost, 0) })).filter(c => c.subtotal > 0)

  const grouped = categories
    .map(c => ({ cat: c, items: filtered.filter(i => i.categoryId === c.id).sort((a, b) => PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] - PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER]) }))
    .filter(g => g.items.length > 0)

  async function markGotIt(item: WishlistItem) {
    if (!confirm(`Move "${item.name}" to inventory?`)) return
    await fetch(`/api/wishlist/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, purchased: true, categoryId: item.categoryId }),
    })
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, cost: item.cost, quantity: 1, purchaseDate: new Date().toISOString(), notes: item.notes, categoryId: item.categoryId }),
    })
    mutate()
  }

  async function del(id: number) {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
    mutate()
  }

  function buildWishlistPrompt(): string {
    const byPriority: Record<string, typeof active> = { High: [], Medium: [], Low: [] }
    active.forEach(i => { byPriority[i.priority]?.push(i) })
    const section = (label: string, items: typeof active) =>
      items.length ? `${label.toUpperCase()} PRIORITY:\n${items.map(i => `- ${i.name} — €${i.cost.toFixed(2)}`).join('\n')}` : ''
    const sections = ['High', 'Medium', 'Low'].map(p => section(p, byPriority[p])).filter(Boolean).join('\n\n')
    const total = active.reduce((s, i) => s + i.cost, 0)
    return `Here is my current wishlist (unpurchased items only), grouped by priority:

${sections}

Total wishlist value: €${total.toFixed(2)}

Given typical budget constraints, suggest a sensible purchase order. Flag any items that seem overpriced relative to their priority, and identify any obvious quick wins (low cost, high priority).`
  }

  const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wishlist</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCats(true)} className="text-sm px-3 py-1.5 border rounded-lg dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            Categories
          </button>
          <button
            onClick={() => setShowPrompt(true)}
            disabled={active.length === 0}
            className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            AI Prompt
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add item
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: €{total.toFixed(2)}</span>
        {byCategory.map(c => (
          <Badge key={c.id} color={c.color}>
            {c.name} €{c.subtotal.toFixed(2)}
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Grouped items */}
      {grouped.map(({ cat, items }) => (
        <div key={cat.id} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{cat.name}</span>
            <span className="text-xs text-gray-400">{items.length} items · €{items.reduce((s, i) => s + i.cost, 0).toFixed(2)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                    <Badge color={PRIORITY_COLOR[item.priority]}>{item.priority}</Badge>
                    {item.inventoryUpgrades.map(u => (
                      <Badge key={u.id} color="#8b5cf6">Upgrade for: {u.name}</Badge>
                    ))}
                  </div>
                  {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{item.url}</a>}
                  {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white shrink-0">€{item.cost.toFixed(2)}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => markGotIt(item)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Got it</button>
                  <button onClick={() => setEditing(item)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => del(item.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No wishlist items yet. Add one to get started.</p>
      )}

      {showAdd && (
        <Modal title="Add wishlist item" onClose={() => setShowAdd(false)}>
          <WishlistForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit wishlist item" onClose={() => setEditing(null)}>
          <WishlistForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {showCats && (
        <Modal title="Manage categories" onClose={() => setShowCats(false)}>
          <CategoryManager onClose={() => setShowCats(false)} />
        </Modal>
      )}
      {showPrompt && (
        <PromptModal
          title="Wishlist Priority Prompt"
          prompt={buildWishlistPrompt()}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
