'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import type { TravelCountry, TravelTrip } from '@/types'
import CountryCard from './CountryCard'
import CountryForm from './CountryForm'
import TripCard from './TripCard'
import TripForm from './TripForm'
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TravelPage() {
  const searchParams = useSearchParams()

  const { data: countries = [], mutate: mutateCountries } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)
  const { data: trips = [], mutate: mutateTrips } = useSWR<TravelTrip[]>('/api/travel/trips', fetcher)

  const [tab, setTab] = useState<'countries' | 'trips'>(() =>
    searchParams.get('tab') === 'trips' ? 'trips' : 'countries'
  )
  const [countriesFilter, setCountriesFilter] = useState('All')
  const [countryFilter, setCountryFilter] = useState(() =>
    searchParams.get('country') ?? 'All'
  )
  const [addingCountry, setAddingCountry] = useState(false)
  const [addingTrip, setAddingTrip] = useState(false)
  const [editCountry, setEditCountry] = useState<TravelCountry | null>(null)
  const [editTrip, setEditTrip] = useState<TravelTrip | null>(null)
  const [bulkTrips, setBulkTrips] = useState(false)

  const TRIP_COLUMNS: ColumnDef[] = [
    { key: 'countryName', label: 'Country', type: 'text', required: true },
    { key: 'cities', label: 'Cities (comma-separated)', type: 'text' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'actualCost', label: 'Cost (€)', type: 'number' },
    { key: 'rating', label: 'Rating (1–5)', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ]

  async function handleTripsBulkSave({ upserted, deletedIds }: BulkChanges) {
    await Promise.all([
      ...upserted.map(row => {
        const cities = typeof row.cities === 'string'
          ? row.cities.split(',').map((c: string) => c.trim()).filter(Boolean)
          : []
        const body = { ...row, cities }
        return typeof row.id === 'number'
          ? fetch(`/api/travel/trips/${row.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          : fetch('/api/travel/trips', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
      }),
      ...deletedIds.map(id => fetch(`/api/travel/trips/${id}`, { method: 'DELETE' })),
    ])
    mutateTrips()
    mutateCountries()
    setBulkTrips(false)
  }

  function goToTripsFiltered(countryName: string) {
    setCountryFilter(countryName)
    setTab('trips')
  }

  const filteredCountries = countries.filter(c => {
    if (countriesFilter === 'With Trips') return c.tripCount > 0
    if (countriesFilter === 'Standalone') return c.tripCount === 0
    return true
  })

  const filteredTrips = trips.filter(t =>
    countryFilter === 'All' || t.countryName === countryFilter
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Travel</h1>
        <div className="flex gap-2">
          {tab === 'trips' && (
            <button
              onClick={() => setBulkTrips(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Edit All
            </button>
          )}
          <button
            onClick={() => tab === 'countries' ? setAddingCountry(true) : setAddingTrip(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {tab === 'countries' ? '+ Add Country' : '+ Add Trip'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['countries', 'trips'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t === 'countries' ? `Countries (${countries.length})` : `Trips (${trips.length})`}
          </button>
        ))}
      </div>

      {/* Countries tab */}
      {tab === 'countries' && (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {['All', 'With Trips', 'Standalone'].map(f => (
              <button
                key={f}
                onClick={() => setCountriesFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  countriesFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filteredCountries.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {countriesFilter === 'All'
                ? 'No countries yet. Add trips to get started.'
                : `No ${countriesFilter.toLowerCase()} countries.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCountries.map(c => (
                <CountryCard
                  key={c.id}
                  country={c}
                  onClick={() => setEditCountry(c)}
                  onFilterTrips={() => goToTripsFiltered(c.name)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Trips tab */}
      {tab === 'trips' && (
        <>
          {!bulkTrips && (
            <div className="flex gap-2 flex-wrap mb-6">
              {['All', ...countries.map(c => c.name)].map(f => (
                <button
                  key={f}
                  onClick={() => setCountryFilter(f)}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                    countryFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {bulkTrips ? (
            <BulkEditor
              columns={TRIP_COLUMNS}
              rows={trips.map(t => ({
                id: t.id,
                countryName: t.countryName,
                cities: t.cities.join(', '),
                startDate: t.startDate ?? '',
                endDate: t.endDate ?? '',
                actualCost: t.actualCost,
                rating: t.rating,
                notes: t.notes ?? '',
              }))}
              csvHint="countryName,cities,startDate,endDate,actualCost,rating,notes"
              onSave={handleTripsBulkSave}
              onCancel={() => setBulkTrips(false)}
            />
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {countryFilter === 'All'
                ? "No trips yet. Click '+ Add Trip' to log your first."
                : `No trips to ${countryFilter}.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(t => (
                <TripCard
                  key={t.id}
                  trip={t}
                  onClick={() => setEditTrip(t)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {addingCountry && (
        <CountryForm
          onSave={() => { mutateCountries(); setAddingCountry(false) }}
          onCancel={() => setAddingCountry(false)}
        />
      )}
      {addingTrip && (
        <TripForm
          onSave={() => { mutateTrips(); mutateCountries(); setAddingTrip(false) }}
          onCancel={() => setAddingTrip(false)}
        />
      )}
      {editCountry && (
        <CountryForm
          initial={editCountry}
          onSave={() => { mutateCountries(); mutateTrips(); setEditCountry(null) }}
          onCancel={() => setEditCountry(null)}
        />
      )}
      {editTrip && (
        <TripForm
          initial={editTrip}
          onSave={() => { mutateTrips(); mutateCountries(); setEditTrip(null) }}
          onCancel={() => setEditTrip(null)}
        />
      )}
    </div>
  )
}
