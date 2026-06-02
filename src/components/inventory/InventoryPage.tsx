'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import InventoryForm from './InventoryForm'
import CategoryManager from '@/components/categories/CategoryManager'
import { useRouter } from 'next/navigation'
import ItemsTabs from '@/components/items/ItemsTabs'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }
interface UpgradeTarget { id: number; name: string; cost: number }
interface InventoryItem {
  id: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number
  category: Category; upgradeTarget?: UpgradeTarget
}

export default function InventoryPage() {
  const { data: items = [], mutate } = useSWR<InventoryItem[]>('/api/inventory', fetcher)
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const router = useRouter()

  const filtered = items
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterCat || String(i.categoryId) === filterCat)

  const total = items.reduce((s, i) => s + i.cost * i.quantity, 0)
  const withUpgrades = items.filter(i => i.upgradeTarget).length
  const byCategory = categories
    .map(c => ({ ...c, subtotal: items.filter(i => i.categoryId === c.id).reduce((s, i) => s + i.cost * i.quantity, 0) }))
    .filter(c => c.subtotal > 0)

  const grouped = categories
    .map(c => ({ cat: c, items: filtered.filter(i => i.categoryId === c.id) }))
    .filter(g => g.items.length > 0)

  async function del(id: number) {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <ItemsTabs active="inventory" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCats(true)} className="text-sm px-3 py-1.5 border rounded-lg dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            Categories
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add item
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: €{total.toFixed(2)}</span>
        {withUpgrades > 0 && <Badge color="#f59e0b">{withUpgrades} with upgrade available</Badge>}
        {byCategory.map(c => (
          <Badge key={c.id} color={c.color}>{c.name} €{c.subtotal.toFixed(2)}</Badge>
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
            <span className="text-xs text-gray-400">
              {items.length} items · €{items.reduce((s, i) => s + i.cost * i.quantity, 0).toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                    {item.quantity > 1 && <Badge color="#6b7280">×{item.quantity}</Badge>}
                    {item.upgradeTarget && (
                      <Badge color="#f97316" onClick={() => router.push('/wishlist')}>
                        Upgrade: {item.upgradeTarget.name} €{item.upgradeTarget.cost.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {item.purchaseDate && <p className="text-xs text-gray-400 mt-0.5">Bought {new Date(item.purchaseDate).toLocaleDateString()}</p>}
                  {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white shrink-0">€{(item.cost * item.quantity).toFixed(2)}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(item)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => del(item.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No inventory items yet. Add one to get started.</p>
      )}

      {showAdd && (
        <Modal title="Add inventory item" onClose={() => setShowAdd(false)}>
          <InventoryForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit inventory item" onClose={() => setEditing(null)}>
          <InventoryForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {showCats && (
        <Modal title="Manage categories" onClose={() => setShowCats(false)}>
          <CategoryManager onClose={() => setShowCats(false)} />
        </Modal>
      )}
    </div>
  )
}
