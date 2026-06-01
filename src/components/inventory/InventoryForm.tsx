'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }
interface WishlistItem { id: number; name: string; cost: number }
interface InventoryItem {
  id?: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number; upgradeTargetId?: number
}

interface Props {
  initial?: InventoryItem
  onSave: () => void
  onCancel: () => void
}

export default function InventoryForm({ initial, onSave, onCancel }: Props) {
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const { data: wishlistItems = [] } = useSWR<WishlistItem[]>('/api/wishlist', fetcher)
  const [name, setName] = useState(initial?.name ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '1')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ? initial.purchaseDate.slice(0, 10) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId?.toString() ?? '')
  const [upgradeTargetId, setUpgradeTargetId] = useState(initial?.upgradeTargetId?.toString() ?? '')

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(String(categories[0].id))
  }, [categories, categoryId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name, cost: Number(cost), quantity: Number(quantity),
      purchaseDate: purchaseDate || null, notes: notes || null,
      categoryId: Number(categoryId),
      upgradeTargetId: upgradeTargetId ? Number(upgradeTargetId) : null,
    }
    if (initial?.id) {
      await fetch(`/api/inventory/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Item name" className={field} />
      <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className={field} />
      <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={field} />
      <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={field} />
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={field} required>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={upgradeTargetId} onChange={e => setUpgradeTargetId(e.target.value)} className={field}>
        <option value="">No upgrade target</option>
        {wishlistItems.map(w => <option key={w.id} value={w.id}>{w.name} (€{w.cost.toFixed(2)})</option>)}
      </select>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={field} />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add item'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">
          Cancel
        </button>
      </div>
    </form>
  )
}
