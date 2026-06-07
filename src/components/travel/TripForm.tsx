'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { TravelTrip, TravelCountry } from '@/types'
import Combobox from '@/components/ui/Combobox'
import { useCountries, useCities } from '@/lib/useGeoData'
import { useCompanions, useCompanies } from '@/lib/usePeopleCompanies'
import CostBreakdown, { type CostLinePayload } from './CostBreakdown'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TripForm({ initial, onSave, onCancel }: {
  initial?: TravelTrip
  onSave: () => void
  onCancel: () => void
}) {
  const { data: dbCountries = [] } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)
  const allCountries = useCountries()
  const { names: allCompanions, ensureCompanion } = useCompanions()
  const { names: allCompanies, ensureCompany } = useCompanies()

  const [countryName, setCountryName] = useState<string>(initial?.countryName ?? '')
  const [cities, setCities] = useState<string[]>(initial?.cities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [companions, setCompanions] = useState<string[]>(initial?.companions ?? [])
  const [companionInput, setCompanionInput] = useState('')
  const [company, setCompany] = useState(initial?.company ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [duration, setDuration] = useState<string>(() => {
    if (initial?.startDate && initial?.endDate) {
      const start = new Date(initial.startDate + 'T00:00:00')
      const end   = new Date(initial.endDate   + 'T00:00:00')
      const days  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      return String(days)
    }
    return ''
  })
  const [costLines, setCostLines] = useState<CostLinePayload[]>([])
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const citySuggestions = useCities(countryName)

  function addCity(city: string) {
    const trimmed = city.trim().replace(/,+$/, '')
    if (trimmed && !cities.includes(trimmed)) setCities(prev => [...prev, trimmed])
    setCityInput('')
  }

  function addCompanion(name: string) {
    const trimmed = name.trim().replace(/,+$/, '')
    if (!trimmed || companions.includes(trimmed)) { setCompanionInput(''); return }
    setCompanions(prev => [...prev, trimmed])
    setCompanionInput('')
    ensureCompanion(trimmed)
  }

  function handleCompanyBlurOrSelect(name: string) {
    const trimmed = name.trim()
    if (trimmed) ensureCompany(trimmed)
    setCompany(trimmed)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pendingCity = cityInput.trim().replace(/,+$/, '')
    const finalCities = pendingCity && !cities.includes(pendingCity) ? [...cities, pendingCity] : cities

    if (!countryName.trim()) return
    setSaving(true)

    // Resolve country: use existing DB entry by name if found, else create via countryName
    const existing = dbCountries.find(c => c.name.toLowerCase() === countryName.trim().toLowerCase())
    let endDate: string | null = null
    if (startDate && duration) {
      const d = new Date(startDate + 'T00:00:00')
      d.setDate(d.getDate() + Number(duration) - 1)
      endDate = d.toISOString().slice(0, 10)
    }

    const body = {
      ...(existing ? { countryId: existing.id } : { countryName: countryName.trim() }),
      cities: finalCities,
      companions,
      company: company.trim() || null,
      startDate: startDate || null,
      endDate,
      ...(costLines.length > 0
        ? { costLines }
        : { actualCost: initial?.actualCost ?? null }),
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
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {cities.map(city => (
                  <span key={city} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                    {city}
                    <button type="button" onClick={() => setCities(prev => prev.filter(c => c !== city))} className="hover:text-blue-900 dark:hover:text-blue-200 leading-none">&times;</button>
                  </span>
                ))}
              </div>
            )}
            <Combobox
              value={cityInput}
              onChange={setCityInput}
              onSelect={addCity}
              options={citySuggestions.filter(c => !cities.includes(c))}
              placeholder="Type a city, press Enter…"
            />
            <p className="text-xs text-gray-400 mt-1">Press Enter to add · click × to remove</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Companions</label>
            {companions.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {companions.map(p => (
                  <span key={p} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                    {p}
                    <button type="button" onClick={() => setCompanions(prev => prev.filter(c => c !== p))} className="hover:text-purple-900 dark:hover:text-purple-100 leading-none">&times;</button>
                  </span>
                ))}
              </div>
            )}
            <Combobox
              value={companionInput}
              onChange={setCompanionInput}
              onSelect={addCompanion}
              options={allCompanions.filter(c => !companions.includes(c))}
              placeholder="Type a name, press Enter…"
            />
            <p className="text-xs text-gray-400 mt-1">People you travelled with</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company / Work trip</label>
            <Combobox
              value={company}
              onChange={setCompany}
              onSelect={handleCompanyBlurOrSelect}
              options={allCompanies}
              placeholder="e.g. Accenture"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (days)</label>
              <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 7"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>
          {startDate && duration && (
            <p className="text-xs text-gray-400 -mt-2">
              End date: {(() => {
                const d = new Date(startDate + 'T00:00:00')
                d.setDate(d.getDate() + Number(duration) - 1)
                return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              })()}
            </p>
          )}

          <CostBreakdown
            initialLines={initial?.costLines ?? []}
            onChange={setCostLines}
          />

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
