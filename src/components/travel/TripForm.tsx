'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { TravelTrip, TravelCountry } from '@/types'
import Combobox from '@/components/ui/Combobox'
import { useCountries, useCities } from '@/lib/useGeoData'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TripForm({ initial, onSave, onCancel }: {
  initial?: TravelTrip
  onSave: () => void
  onCancel: () => void
}) {
  const { data: dbCountries = [] } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)
  const allCountries = useCountries()

  const [countryName, setCountryName] = useState<string>(initial?.countryName ?? '')
  const [cities, setCities] = useState<string[]>(initial?.cities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [actualCost, setActualCost] = useState(initial?.actualCost != null ? String(initial.actualCost) : '')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const citySuggestions = useCities(countryName)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pendingCity = cityInput.trim().replace(/,+$/, '')
    const finalCities = pendingCity && !cities.includes(pendingCity) ? [...cities, pendingCity] : cities

    if (!countryName.trim()) return
    setSaving(true)

    // Resolve country: use existing DB entry by name if found, else create via countryName
    const existing = dbCountries.find(c => c.name.toLowerCase() === countryName.trim().toLowerCase())
    const body = {
      ...(existing ? { countryId: existing.id } : { countryName: countryName.trim() }),
      cities: finalCities,
      startDate: startDate || null,
      endDate: endDate || null,
      actualCost: actualCost !== '' ? Number(actualCost) : null,
      rating,
      notes: notes.trim() || null,
    }

    if (initial) {
      await fetch(`/api/travel/trips/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/travel/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm(`Delete this trip to ${initial.countryName}?`)) return
    await fetch(`/api/travel/trips/${initial.id}`, { method: 'DELETE' })
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
            <Combobox value={countryName} onChange={setCountryName} options={allCountries} placeholder="e.g. Greece" required />
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
                onChange={v => { setCityInput(v) }}
                options={citySuggestions.filter(c => !cities.includes(c))}
                placeholder={cities.length === 0 ? 'Type a city, press Enter' : ''}
                className="flex-1 min-w-[8rem] !border-0 !rounded-none !px-0 !py-0 !bg-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a city</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Cost (€)</label>
            <input type="number" min="0" value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(rating === n ? null : n)}
                  className={`text-2xl transition-colors ${n <= (rating ?? 0) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600 hover:text-amber-300'}`}>★</button>
              ))}
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
