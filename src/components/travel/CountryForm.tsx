'use client'

import { useState } from 'react'
import type { TravelCountry } from '@/types'
import Combobox from '@/components/ui/Combobox'
import { useCountries } from '@/lib/useGeoData'

export default function CountryForm({ initial, onSave, onCancel }: {
  initial?: TravelCountry
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const countries = useCountries()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const body = { name: name.trim(), notes: notes.trim() || null }
    if (initial) {
      await fetch(`/api/travel/countries/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/travel/countries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    const msg = initial.tripCount > 0 ? `Delete "${initial.name}" and its ${initial.tripCount} trip(s)?` : `Delete "${initial.name}"?`
    if (!confirm(msg)) return
    await fetch(`/api/travel/countries/${initial.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Country' : 'Add Country'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country name *</label>
            <Combobox value={name} onChange={setName} options={countries} placeholder="e.g. Japan" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none" />
          </div>
          <div className="flex justify-between pt-2">
            {initial ? (
              <button type="button" onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
