'use client'

import { useState } from 'react'
import type { BucketTrip } from '@/types'
import Combobox from '@/components/ui/Combobox'
import { useCountries, useCities } from '@/lib/useGeoData'

export default function TripForm({ initial, onSave, onCancel }: {
  initial?: BucketTrip
  onSave: () => void
  onCancel: () => void
}) {
  const allCountries = useCountries()
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [cities, setCities] = useState<string[]>(initial?.cities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [budget, setBudget] = useState(initial?.budget != null ? String(initial.budget) : '')
  const [targetYear, setTargetYear] = useState(initial?.targetYear != null ? String(initial.targetYear) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const citySuggestions = useCities(destination)

  function addCity(city: string) {
    const trimmed = city.trim().replace(/,+$/, '')
    if (trimmed && !cities.includes(trimmed)) setCities(prev => [...prev, trimmed])
    setCityInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!destination.trim()) return
    const pendingCity = cityInput.trim().replace(/,+$/, '')
    const finalCities = pendingCity && !cities.includes(pendingCity) ? [...cities, pendingCity] : cities
    setSaving(true)
    const body = {
      destination: destination.trim(),
      cities: finalCities,
      budget: budget !== '' ? Number(budget) : null,
      targetYear: targetYear !== '' ? Number(targetYear) : null,
      notes: notes.trim() || null,
    }
    if (initial) {
      await fetch(`/api/bucket-list/trips/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, done: initial.done }) })
    } else {
      await fetch('/api/bucket-list/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm(`Delete "${initial.destination}"?`)) return
    await fetch(`/api/bucket-list/trips/${initial.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Trip' : 'Add Trip'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination *</label>
            <Combobox value={destination} onChange={setDestination} options={allCountries} placeholder="e.g. Japan" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cities / Stops</label>
            <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[2.5rem]">
              {cities.map(city => (
                <span key={city} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  {city}
                  <button type="button" onClick={() => setCities(prev => prev.filter(c => c !== city))} className="hover:text-blue-900 dark:hover:text-blue-200 leading-none">&times;</button>
                </span>
              ))}
              <Combobox
                value={cityInput}
                onChange={setCityInput}
                onSelect={addCity}
                options={citySuggestions.filter(c => !cities.includes(c))}
                placeholder={cities.length === 0 ? 'Type a city, press Enter' : ''}
                className="flex-1 min-w-[8rem] !border-0 !rounded-none !px-0 !py-0 !bg-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a city</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget (€)</label>
              <input type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Year</label>
              <input type="number" min="2024" max="2100" value={targetYear} onChange={e => setTargetYear(e.target.value)} placeholder="e.g. 2027"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
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
