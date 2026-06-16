'use client'

import { useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { User } from 'lucide-react'
import type { TravelCountry, TravelTrip, Companion } from '@/types'
import CountryCard from './CountryCard'
import CountryForm from './CountryForm'
import TripCard from './TripCard'
import TripForm from './TripForm'
import WorldMap from './WorldMap'
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function CollapsibleSection({ label, count, labelColor, defaultOpen, labelSuffix, children }: {
  label: string
  count: number
  labelColor?: string
  defaultOpen?: boolean
  labelSuffix?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 mb-3 group w-full text-left"
      >
        <span className={`text-sm font-semibold uppercase tracking-wide ${labelColor}`}>{label}</span>
        <span className="text-gray-400 text-sm font-normal normal-case tracking-normal">({count})</span>
        <span className="text-gray-400 text-xs ml-1">{open ? '▾' : '▸'}</span>
        {labelSuffix && <span onClick={e => e.stopPropagation()}>{labelSuffix}</span>}
      </button>
      {open && children}
    </div>
  )
}

export default function TravelPage() {
  const { data: countries = [], mutate: mutateCountries } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)
  const { data: trips = [], mutate: mutateTrips } = useSWR<TravelTrip[]>('/api/travel/trips', fetcher)
  const { data: companions = [], mutate: mutateCompanions } = useSWR<Companion[]>('/api/companions', fetcher)
  const { data: allPeople = [] } = useSWR<{ id: number; name: string }[]>('/api/people', fetcher)
  const [linkingCompanion, setLinkingCompanion] = useState<string | null>(null)

  const [countriesFilter, setCountriesFilter] = useState('All')
  const [countryFilter, setCountryFilter] = useState('All')
  const [addingCountry, setAddingCountry] = useState(false)
  const [addingTrip, setAddingTrip] = useState(false)
  const [editCountry, setEditCountry] = useState<TravelCountry | null>(null)
  const [editTrip, setEditTrip] = useState<TravelTrip | null>(null)
  const [bulkTrips, setBulkTrips] = useState(false)

  async function linkCompanion(companionName: string, personId: number | null) {
    const companion = companions.find(c => c.name.toLowerCase() === companionName.toLowerCase())
    if (!companion) return
    await fetch(`/api/companions/${companion.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId }),
    })
    setLinkingCompanion(null)
    mutateCompanions()
  }

  const TRIP_COLUMNS: ColumnDef[] = [
    { key: 'countryName', label: 'Country', type: 'text', required: true },
    { key: 'cities', label: 'Cities (comma-separated)', type: 'text' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'duration', label: 'Duration (days)', type: 'number' },
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
        let endDate: string | null = null
        if (row.startDate && row.duration) {
          const d = new Date(row.startDate + 'T00:00:00')
          d.setDate(d.getDate() + Number(row.duration) - 1)
          endDate = d.toISOString().slice(0, 10)
        }
        const body = { ...row, cities, endDate }
        return typeof row.id === 'number'
          ? fetch(`/api/travel/trips/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          : fetch('/api/travel/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }),
      ...deletedIds.map(id => fetch(`/api/travel/trips/${id}`, { method: 'DELETE' })),
    ])
    mutateTrips()
    mutateCountries()
    setBulkTrips(false)
  }

  const filteredCountries = countries.filter(c => {
    if (countriesFilter === 'With Trips') return c.tripCount > 0
    if (countriesFilter === 'Standalone') return c.tripCount === 0
    return true
  })

  const today = new Date().toISOString().slice(0, 10)

  // Build companion → trips map
  const byCompanion = new Map<string, typeof trips>()
  trips.forEach(t => {
    t.companions.forEach(p => {
      if (!byCompanion.has(p)) byCompanion.set(p, [])
      byCompanion.get(p)!.push(t)
    })
  })
  const companionList = Array.from(byCompanion.entries()).sort((a, b) => b[1].length - a[1].length)

  // Build company → trips map
  const byCompany = new Map<string, typeof trips>()
  trips.forEach(t => {
    if (t.company) {
      if (!byCompany.has(t.company)) byCompany.set(t.company, [])
      byCompany.get(t.company)!.push(t)
    }
  })

  const filteredTrips = trips.filter(t =>
    countryFilter === 'All' || t.countryName === countryFilter
  )

  const upcomingTrips = filteredTrips
    .filter(t => !t.startDate || t.startDate >= today)
    .sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'))

  const pastTrips = filteredTrips
    .filter(t => t.startDate && t.startDate < today)
    .sort((a, b) => b.startDate!.localeCompare(a.startDate!))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Travel</h1>

      {/* World map */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
            {countries.length} {countries.length === 1 ? 'country' : 'countries'} visited
          </p>
        </div>
        <WorldMap visitedCountries={countries.map(c => c.name)} />
      </div>

      {/* Trips section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Trips <span className="text-sm font-normal text-gray-400 ml-1">({trips.length})</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkTrips(true)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Edit All
            </button>
            <button
              onClick={() => setAddingTrip(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + Add Trip
            </button>
          </div>
        </div>

        {!bulkTrips && (
          <div className="flex gap-2 flex-wrap mb-4">
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
              duration: (t.startDate && t.endDate)
                ? Math.round((new Date(t.endDate + 'T00:00:00').getTime() - new Date(t.startDate + 'T00:00:00').getTime()) / 86400000) + 1
                : '',
              actualCost: t.actualCost,
              rating: t.rating,
              notes: t.notes ?? '',
            }))}
            csvHint="countryName,cities,startDate,endDate,actualCost,rating,notes"
            onSave={handleTripsBulkSave}
            onCancel={() => setBulkTrips(false)}
          />
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
            {countryFilter === 'All' ? "No trips yet. Click '+ Add Trip' to log your first." : `No trips to ${countryFilter}.`}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {upcomingTrips.length > 0 && (
              <CollapsibleSection
                label="Upcoming"
                count={upcomingTrips.length}
                labelColor="text-blue-600 dark:text-blue-400"
                defaultOpen
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />)}
                </div>
              </CollapsibleSection>
            )}

            {pastTrips.length > 0 && (
              <CollapsibleSection
                label="Past"
                count={pastTrips.length}
                labelColor="text-gray-400 dark:text-gray-500"
                defaultOpen={upcomingTrips.length === 0}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />)}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}
      </div>

      {/* Countries section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Countries <span className="text-sm font-normal text-gray-400 ml-1">({countries.length})</span>
          </h2>
          <button
            onClick={() => setAddingCountry(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Add Country
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
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
          <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
            {countriesFilter === 'All' ? 'No countries yet.' : `No ${countriesFilter.toLowerCase()} countries.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCountries.map(c => (
              <CountryCard
                key={c.id}
                country={c}
                onClick={() => setEditCountry(c)}
                onFilterTrips={() => setCountryFilter(c.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* By Person */}
      {companionList.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">By Person</h2>
          <div className="flex flex-col gap-4">
            {(() => {
              const companionPersonIdMap = new Map(companions.map(c => [c.name.toLowerCase(), c.personId]))
              return companionList.map(([person, personTrips]) => {
                const linkedPersonId = companionPersonIdMap.get(person.toLowerCase()) ?? null
                const companionLinkSuffix = linkedPersonId ? (
                  <a href="/people" title="View in People" className="ml-1 text-blue-500 hover:text-blue-600 inline-flex items-center">
                    <User size={12} />
                  </a>
                ) : linkingCompanion === person ? (
                  <select
                    autoFocus
                    className="ml-1 text-xs border rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white px-1 py-0"
                    defaultValue=""
                    onChange={e => linkCompanion(person, e.target.value ? Number(e.target.value) : null)}
                    onBlur={() => setLinkingCompanion(null)}
                  >
                    <option value="">— pick person —</option>
                    {allPeople.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setLinkingCompanion(person)}
                    title="Link to People entry"
                    className="ml-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 inline-flex items-center"
                  >
                    <User size={12} />
                  </button>
                )
                return (
                  <CollapsibleSection
                    key={person}
                    label={person}
                    count={personTrips.length}
                    labelColor="text-purple-600 dark:text-purple-400"
                    defaultOpen={false}
                    labelSuffix={companionLinkSuffix}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...personTrips]
                        .sort((a: TravelTrip, b: TravelTrip) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
                        .map((t: TravelTrip) => <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />)}
                    </div>
                  </CollapsibleSection>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* By Company */}
      {byCompany.size > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">By Company</h2>
          <div className="flex flex-col gap-4">
            {Array.from(byCompany.entries()).sort((a, b) => b[1].length - a[1].length).map(([co, coTrips]) => (
              <CollapsibleSection
                key={co}
                label={co}
                count={coTrips.length}
                labelColor="text-amber-600 dark:text-amber-400"
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...coTrips]
                    .sort((a: TravelTrip, b: TravelTrip) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
                    .map((t: TravelTrip) => <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />)}
                </div>
              </CollapsibleSection>
            ))}
          </div>
        </div>
      )}

      {addingCountry && <CountryForm onSave={() => { mutateCountries(); setAddingCountry(false) }} onCancel={() => setAddingCountry(false)} />}
      {addingTrip && <TripForm onSave={() => { mutateTrips(); mutateCountries(); setAddingTrip(false) }} onCancel={() => setAddingTrip(false)} />}
      {editCountry && <CountryForm initial={editCountry} onSave={() => { mutateCountries(); mutateTrips(); setEditCountry(null) }} onCancel={() => setEditCountry(null)} />}
      {editTrip && <TripForm initial={editTrip} onSave={() => { mutateTrips(); mutateCountries(); setEditTrip(null) }} onCancel={() => setEditTrip(null)} />}
    </div>
  )
}
