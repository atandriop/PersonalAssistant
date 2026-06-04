'use client'

import { useState } from 'react'

interface GiftIdeaFormInput {
  id?: number
  title: string
  occasion: string | null
  estimatedCost: number | null
  notes: string | null
  purchased?: boolean
}

export default function GiftIdeaForm({ personId, initial, onSave, onCancel }: {
  personId: number
  initial?: GiftIdeaFormInput
  onSave: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [occasion, setOccasion] = useState(initial?.occasion ?? '')
  const [estimatedCost, setEstimatedCost] = useState(initial?.estimatedCost?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      title,
      occasion: occasion || null,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      purchased: initial?.purchased ?? false,
      notes: notes || null,
    }
    if (initial?.id) {
      await fetch(`/api/gifts/ideas/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch(`/api/gifts/people/${personId}/ideas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Gift idea" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="Occasion (e.g. Birthday, Christmas)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="number" step="0.01" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="Estimated cost (optional, €)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add idea'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}
