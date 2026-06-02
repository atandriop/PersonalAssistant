'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { TravelTrip, TravelCountry } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TripForm({ initial, onSave, onCancel }: {
  initial?: TravelTrip
  onSave: () => void
  onCancel: () => void
}) {
  const { data: countries = [] } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)

  const [countryId, setCountryId] = useState<string>(initial?.countryId?.toString() ?? '')
  const [newCountryName, setNewCountryName] = useState('')
  const [cities, setCities] = useState<string[]>(initial?.cities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [actualCost, setActualCost] = useState(initial?.actualCost != null ? String(initial.actualCost) : '')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  function addCity(value: string) {
    const trimmed = value.trim().replace(/,+$/, '')
    if (trimmed && !cities.includes(trimmed)) setCities(prev => [...prev, trimmed])
    setCityInput('')
  }

  function handleCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCity(cityInput) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pendingCity = cityInput.trim().replace(/,+$/, '')
    const finalCities = pendingCity && !cities.includes(pendingCity) ? [...cities, pendingCity] : cities

    const isNewCountry = countryId === 'new'
    const numericCountryId = isNewCountry ? null : (countryId ? Number(countryId) : null)
    const hasCountry = isNewCountry ? !!newCountryName.trim() : !!numericCountryId
    if (!hasCountry) return

    setSaving(true)
    const body = {
      ...(isNewCountry
        ? { countryName: newCountryName.trim() }
        : { countryId: numericCountryId }),
      cities: finalCities,
      startDate: startDate || null,
      endDate: endDate || null,
      actualCost: actualCost !== '' ? Number(actualCost) : null,
      rating,
      notes: notes.trim() || null,
    }
    if (initial) {
      await fetch(`/api/travel/trips/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/travel/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Trip' : 'Add Trip'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Country *
            </label>
            <select
              value={countryId}
              onChange={e => setCountryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select country…</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="new">＋ New country…</option>
            </select>
            {countryId === 'new' && (
              <input
                value={newCountryName}
                onChange={e => setNewCountryName(e.target.value)}
                placeholder="Country name"
                className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            )}
          </div>
          {/* Cities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cities / Stops
            </label>
            <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[2.5rem]">
              {cities.map(city => (
                <span
                  key={city}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                >
                  {city}
                  <button
                    type="button"
                    onClick={() => setCities(prev => prev.filter(c => c !== city))}
                    className="hover:text-blue-900 dark:hover:text-blue-200 leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={handleCityKeyDown}
                onBlur={() => addCity(cityInput)}
                placeholder={cities.length === 0 ? 'Type a city, press Enter' : ''}
                className="flex-1 min-w-[8rem] outline-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Actual Cost (€)
            </label>
            <input
              type="number"
              min="0"
              value={actualCost}
              onChange={e => setActualCost(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className={`text-2xl transition-colors ${
                    n <= (rating ?? 0)
                      ? 'text-amber-400'
                      : 'text-gray-200 dark:text-gray-600 hover:text-amber-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>
          <div className="flex justify-between pt-2">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
