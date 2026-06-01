'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }

interface WishlistItem {
  id?: number; name: string; url?: string; cost: number;
  priority: string; notes?: string; categoryId: number
}

interface Props {
  initial?: WishlistItem
  onSave: () => void
  onCancel: () => void
}

export default function WishlistForm({ initial, onSave, onCancel }: Props) {
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 'Medium')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId?.toString() ?? '')

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(String(categories[0].id))
  }, [categories, categoryId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, url: url || null, cost: Number(cost), priority, notes: notes || null, categoryId: Number(categoryId) }
    if (initial?.id) {
      await fetch(`/api/wishlist/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Item name" className={field} />
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" className={field} />
      <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className={field} />
      <select value={priority} onChange={e => setPriority(e.target.value)} className={field}>
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={field} required>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
