'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import WishlistForm from '@/components/wishlist/WishlistForm'
import InventoryForm from '@/components/inventory/InventoryForm'
import CategoryManager from '@/components/categories/CategoryManager'
import TaskForm from '@/components/tasks/TaskForm'
import PromptModal from '@/components/ui/PromptModal'
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'
const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }

interface WishlistItem {
  id: number; name: string; url?: string; cost: number; priority: string
  notes?: string; purchased: boolean; categoryId: number
  category: Category; inventoryUpgrades: { id: number; name: string }[]
}

interface InventoryItem {
  id: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number
  category: Category; upgradeTarget?: { id: number; name: string; cost: number }
}

const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

export default function ItemsPage() {
  const { data: wishItems = [], mutate: mutateWish } = useSWR<WishlistItem[]>('/api/wishlist', fetcher)
  const { data: invItems = [], mutate: mutateInv } = useSWR<InventoryItem[]>('/api/inventory', fetcher)
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showAddWish, setShowAddWish] = useState(false)
  const [showAddInv, setShowAddInv] = useState(false)
  const [editWish, setEditWish] = useState<WishlistItem | null>(null)
  const [editInv, setEditInv] = useState<InventoryItem | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [addToTask, setAddToTask] = useState<{ title: string; sourceId: number } | null>(null)
  const [toInventory, setToInventory] = useState<WishlistItem | null>(null)
  const [bulkWish, setBulkWish] = useState(false)
  const [bulkInv, setBulkInv] = useState(false)
  const [collapsedCats, setCollapsedCats] = useState<Set<number>>(new Set())

  function toggleCat(id: number) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const q = search.toLowerCase()
  const activeWish = wishItems.filter(i => !i.purchased)
  const filteredWish = activeWish
    .filter(i => !q || i.name.toLowerCase().includes(q))
    .filter(i => !filterCat || String(i.categoryId) === filterCat)
  const filteredInv = invItems
    .filter(i => !q || i.name.toLowerCase().includes(q))
    .filter(i => !filterCat || String(i.categoryId) === filterCat)

  const allCatIds = new Set([
    ...filteredWish.map(i => i.categoryId),
    ...filteredInv.map(i => i.categoryId),
  ])
  const visibleCategories = categories.filter(c => allCatIds.has(c.id))

  const wishTotal = activeWish.reduce((s, i) => s + i.cost, 0)
  const invTotal = invItems.reduce((s, i) => s + i.cost * i.quantity, 0)
  const withUpgrades = invItems.filter(i => i.upgradeTarget).length

  async function markGotIt(item: WishlistItem) {
    if (!confirm(`Move "${item.name}" to inventory?`)) return
    await fetch(`/api/wishlist/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, purchased: true, categoryId: item.categoryId }),
    })
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, cost: item.cost, quantity: 1, purchaseDate: new Date().toISOString(), notes: item.notes, categoryId: item.categoryId, upgradeTargetId: item.id }),
    })
    mutateWish()
    mutateInv()
  }

  async function delWish(id: number) {
    if (!confirm('Delete this wishlist item?')) return
    await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
    mutateWish()
  }

  async function delInv(id: number) {
    if (!confirm('Delete this inventory item?')) return
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    mutateInv()
  }

  const WISHLIST_COLUMNS: ColumnDef[] = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'cost', label: 'Cost (€)', type: 'number', required: true },
    { key: 'priority', label: 'Priority', type: 'select', options: [
      { label: 'High', value: 'High' },
      { label: 'Medium', value: 'Medium' },
      { label: 'Low', value: 'Low' },
    ]},
    { key: 'categoryId', label: 'Category', type: 'select', options: categories.map(c => ({ label: c.name, value: String(c.id) })) },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ]

  const INVENTORY_COLUMNS: ColumnDef[] = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'cost', label: 'Cost (€)', type: 'number', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
    { key: 'categoryId', label: 'Category', type: 'select', options: categories.map(c => ({ label: c.name, value: String(c.id) })) },
    { key: 'notes', label: 'Notes', type: 'text' },
  ]

  async function handleWishlistBulkSave({ upserted, deletedIds }: BulkChanges) {
    await Promise.all([
      ...upserted.map(row =>
        typeof row.id === 'number'
          ? fetch(`/api/wishlist/${row.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(row),
            })
          : fetch('/api/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(row),
            })
      ),
      ...deletedIds.map(id => fetch(`/api/wishlist/${id}`, { method: 'DELETE' })),
    ])
    mutateWish()
    setBulkWish(false)
  }

  async function handleInventoryBulkSave({ upserted, deletedIds }: BulkChanges) {
    await Promise.all([
      ...upserted.map(row =>
        typeof row.id === 'number'
          ? fetch(`/api/inventory/${row.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(row),
            })
          : fetch('/api/inventory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(row),
            })
      ),
      ...deletedIds.map(id => fetch(`/api/inventory/${id}`, { method: 'DELETE' })),
    ])
    mutateInv()
    setBulkInv(false)
  }

  function buildPrompt(): string {
    const byPriority: Record<string, typeof activeWish> = { High: [], Medium: [], Low: [] }
    activeWish.forEach(i => { byPriority[i.priority]?.push(i) })
    const section = (label: string, items: typeof activeWish) =>
      items.length ? `${label.toUpperCase()} PRIORITY:\n${items.map(i => `- ${i.name} — €${i.cost.toFixed(2)}`).join('\n')}` : ''
    const sections = ['High', 'Medium', 'Low'].map(p => section(p, byPriority[p])).filter(Boolean).join('\n\n')
    return `Here is my current wishlist (unpurchased items only), grouped by priority:\n\n${sections}\n\nTotal wishlist value: €${wishTotal.toFixed(2)}\n\nGiven typical budget constraints, suggest a sensible purchase order. Flag any items that seem overpriced relative to their priority, and identify any obvious quick wins (low cost, high priority).`
  }

  const purchasedNeedingInventory = wishItems.filter(i => i.purchased && i.inventoryUpgrades.length === 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Items</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCats(true)} className="text-sm px-3 py-1.5 border rounded-lg dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            Categories
          </button>
          <button onClick={() => setShowPrompt(true)} disabled={activeWish.length === 0}
            className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            AI Prompt
          </button>
          <button onClick={() => setBulkInv(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            Edit Inventory
          </button>
          <button onClick={() => setBulkWish(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            Edit Wishlist
          </button>
          <button onClick={() => setShowAddInv(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            + Inventory
          </button>
          <button onClick={() => setShowAddWish(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Wishlist
          </button>
        </div>
      </div>


      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Wishlist to spend: <span className="font-semibold text-gray-800 dark:text-gray-200">€{wishTotal.toFixed(2)}</span></span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-gray-500 dark:text-gray-400">Owned value: <span className="font-semibold text-gray-800 dark:text-gray-200">€{invTotal.toFixed(2)}</span></span>
        {withUpgrades > 0 && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <Badge color="#f59e0b">{withUpgrades} with upgrade planned</Badge>
          </>
        )}
      </div>

      <div className={bulkWish || bulkInv ? 'hidden' : ''}>

      {/* Shared filters */}
      <div className="flex gap-2 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all items…"
          className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white flex-1 max-w-xs" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wishlist</span>
          <span className="text-xs text-gray-400">{filteredWish.length} items</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Inventory</span>
          <span className="text-xs text-gray-400">{filteredInv.length} items</span>
        </div>
      </div>

      {/* Per-category rows */}
      {visibleCategories.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No items yet. Add wishlist or inventory items to get started.</p>
      )}

      {visibleCategories.map(cat => {
        const catInv = filteredInv.filter(i => i.categoryId === cat.id)
        const catWish = filteredWish
          .filter(i => i.categoryId === cat.id)
          .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
        const isCatCollapsed = collapsedCats.has(cat.id)

        return (
          <div key={cat.id} className="mb-8">
            <div
              className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-100 dark:border-gray-800 cursor-pointer select-none"
              onClick={() => toggleCat(cat.id)}
            >
              <span className="text-gray-400 text-xs">{isCatCollapsed ? '▸' : '▾'}</span>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat.name}</span>
              <span className="text-xs text-gray-400">{catInv.length} owned · {catWish.length} wanted</span>
            </div>
            {!isCatCollapsed && (
              <div className="grid grid-cols-2 gap-4">
                {/* Wishlist column — LEFT */}
                <div className="flex flex-col gap-2">
                  {catWish.length === 0 ? (
                    <p className="text-xs text-gray-300 dark:text-gray-600 italic py-1">Nothing on wishlist</p>
                  ) : catWish.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                            <Badge color={PRIORITY_COLOR[item.priority]}>{item.priority}</Badge>
                            {item.inventoryUpgrades.map(u => (
                              <Badge key={u.id} color="#8b5cf6">Upgrades: {u.name}</Badge>
                            ))}
                          </div>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-0.5">{item.url}</a>
                          )}
                          {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">€{item.cost.toFixed(2)}</span>
                          <div className="flex gap-1 mt-1 justify-end flex-wrap">
                            <button onClick={() => markGotIt(item)} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Got it</button>
                            <button onClick={() => setEditWish(item)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                            <button onClick={() => setAddToTask({ title: item.name, sourceId: item.id })} className="text-xs text-indigo-500 hover:underline">+Task</button>
                            <button onClick={() => delWish(item.id)} className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-900/30">Del</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inventory column — RIGHT */}
                <div className="flex flex-col gap-2">
                  {catInv.length === 0 ? (
                    <p className="text-xs text-gray-300 dark:text-gray-600 italic py-1">Nothing owned</p>
                  ) : catInv.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                            {item.quantity > 1 && <Badge color="#6b7280">×{item.quantity}</Badge>}
                          </div>
                          {item.upgradeTarget && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-amber-500">→ upgrade:</span>
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{item.upgradeTarget.name}</span>
                              <span className="text-xs text-gray-400">€{item.upgradeTarget.cost.toFixed(2)}</span>
                            </div>
                          )}
                          {item.purchaseDate && (
                            <p className="text-xs text-gray-400 mt-0.5">Bought {new Date(item.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          )}
                          {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">€{(item.cost * item.quantity).toFixed(2)}</span>
                          <div className="flex gap-1 mt-1 justify-end">
                            <button onClick={() => setEditInv(item)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                            <button onClick={() => delInv(item.id)} className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-900/30">Del</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Purchased — not yet in inventory */}
      {purchasedNeedingInventory.length > 0 && (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Purchased — not yet in inventory ({purchasedNeedingInventory.length})
          </h2>
          <div className="flex flex-col gap-2">
            {purchasedNeedingInventory.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-white truncate block">{item.name}</span>
                  {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white shrink-0">€{item.cost.toFixed(2)}</span>
                <button onClick={() => setToInventory(item)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                  → Inventory
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>{/* end hidden wrapper */}

      {bulkWish && (
        <BulkEditor
          columns={WISHLIST_COLUMNS}
          rows={wishItems.filter(i => !i.purchased).map(w => ({
            id: w.id,
            name: w.name,
            cost: w.cost,
            priority: w.priority,
            categoryId: String(w.categoryId),
            url: w.url ?? '',
            notes: w.notes ?? '',
          }))}
          csvHint="name,cost,priority,categoryId,url,notes"
          onSave={handleWishlistBulkSave}
          onCancel={() => setBulkWish(false)}
        />
      )}

      {bulkInv && (
        <BulkEditor
          columns={INVENTORY_COLUMNS}
          rows={invItems.map(i => ({
            id: i.id,
            name: i.name,
            cost: i.cost,
            quantity: i.quantity,
            purchaseDate: i.purchaseDate ? i.purchaseDate.slice(0, 10) : '',
            categoryId: String(i.categoryId),
            notes: i.notes ?? '',
          }))}
          csvHint="name,cost,quantity,purchaseDate,categoryId,notes"
          onSave={handleInventoryBulkSave}
          onCancel={() => setBulkInv(false)}
        />
      )}

      {/* Modals */}
      {showAddWish && (
        <Modal title="Add wishlist item" onClose={() => setShowAddWish(false)}>
          <WishlistForm onSave={() => { setShowAddWish(false); mutateWish() }} onCancel={() => setShowAddWish(false)} />
        </Modal>
      )}
      {editWish && (
        <Modal title="Edit wishlist item" onClose={() => setEditWish(null)}>
          <WishlistForm initial={editWish} onSave={() => { setEditWish(null); mutateWish() }} onCancel={() => setEditWish(null)} />
        </Modal>
      )}
      {showAddInv && (
        <Modal title="Add inventory item" onClose={() => setShowAddInv(false)}>
          <InventoryForm onSave={() => { setShowAddInv(false); mutateInv() }} onCancel={() => setShowAddInv(false)} />
        </Modal>
      )}
      {editInv && (
        <Modal title="Edit inventory item" onClose={() => setEditInv(null)}>
          <InventoryForm initial={editInv} onSave={() => { setEditInv(null); mutateInv() }} onCancel={() => setEditInv(null)} />
        </Modal>
      )}
      {showCats && (
        <Modal title="Manage categories" onClose={() => setShowCats(false)}>
          <CategoryManager onClose={() => setShowCats(false)} />
        </Modal>
      )}
      {showPrompt && (
        <PromptModal title="Wishlist AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />
      )}
      {toInventory && (
        <Modal title={`Add "${toInventory.name}" to Inventory`} onClose={() => setToInventory(null)}>
          <InventoryForm
            initial={{ name: toInventory.name, cost: toInventory.cost, quantity: 1, categoryId: toInventory.categoryId, upgradeTargetId: toInventory.id }}
            onSave={() => { setToInventory(null); mutateWish(); mutateInv() }}
            onCancel={() => setToInventory(null)}
          />
        </Modal>
      )}
      {addToTask && (
        <Modal title="Add to Tasks" onClose={() => setAddToTask(null)}>
          <TaskForm preTitle={addToTask.title} preSourceLink={{ sourceType: 'wishlist', sourceId: addToTask.sourceId }}
            onSave={() => setAddToTask(null)} onCancel={() => setAddToTask(null)} />
        </Modal>
      )}
    </div>
  )
}
