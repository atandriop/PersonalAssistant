'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { BucketTrip, BucketExperience } from '@/types'
import PromptModal from '@/components/ui/PromptModal'
import TripCard from './TripCard'
import TripForm from './TripForm'
import ExperienceCard from './ExperienceCard'
import ExperienceForm from './ExperienceForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TRIP_FILTERS = ['All', 'Not Done', 'Done']
const EXP_STATUS_FILTERS = ['All', 'Not Done', 'Done']
const EXP_CATEGORY_FILTERS = ['Adventure', 'Learning', 'Career', 'Relationships', 'Health', 'Creative', 'Other']

export default function BucketListPage() {
  const { data: trips = [], mutate: mutateTrips } = useSWR<BucketTrip[]>('/api/bucket-list/trips', fetcher)
  const { data: experiences = [], mutate: mutateExperiences } = useSWR<BucketExperience[]>('/api/bucket-list/experiences', fetcher)

  const [tab, setTab] = useState<'trips' | 'experiences'>('trips')
  const [tripFilter, setTripFilter] = useState('All')
  const [expFilter, setExpFilter] = useState('All')
  const [addingTrip, setAddingTrip] = useState(false)
  const [addingExperience, setAddingExperience] = useState(false)
  const [editTrip, setEditTrip] = useState<BucketTrip | null>(null)
  const [editExperience, setEditExperience] = useState<BucketExperience | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  function buildBucketListPrompt(): string {
    const pendingTrips = trips.filter(t => !t.done)
    const doneTrips = trips.filter(t => t.done)
    const tripLines = pendingTrips.map(t => {
      const year = t.targetYear ? ` (target: ${t.targetYear})` : ''
      const budget = t.budget ? ` · budget: €${t.budget.toLocaleString()}` : ''
      const cities = t.cities.length > 0 ? ` — ${t.cities.join(', ')}` : ''
      return `  - ${t.destination}${cities}${year}${budget}`
    }).join('\n')

    const pendingExp = experiences.filter(e => !e.done)
    const doneExp = experiences.filter(e => e.done)
    const expByCategory: Record<string, BucketExperience[]> = {}
    pendingExp.forEach(e => {
      if (!expByCategory[e.category]) expByCategory[e.category] = []
      expByCategory[e.category].push(e)
    })
    const expLines = Object.entries(expByCategory).map(([cat, items]) =>
      `  ${cat}:\n` + items.map(e => {
        const year = e.targetYear ? ` (target: ${e.targetYear})` : ''
        return `    - ${e.title}${year}`
      }).join('\n')
    ).join('\n')

    return `Here is my bucket list as of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:

Trips — ${pendingTrips.length} pending, ${doneTrips.length} completed:
${tripLines || '  None'}

Experiences — ${pendingExp.length} pending, ${doneExp.length} completed:
${expLines || '  None'}

Please reflect on this bucket list. Identify any themes or patterns across the trips and experiences. Suggest which 2–3 items look most achievable in the next 12 months based on what's listed. Flag any categories that seem underrepresented based on a balanced life.`
  }

  const filteredTrips = trips.filter(t => {
    if (tripFilter === 'Done') return t.done
    if (tripFilter === 'Not Done') return !t.done
    return true
  })

  const filteredExperiences = experiences.filter(e => {
    if (expFilter === 'Done') return e.done
    if (expFilter === 'Not Done') return !e.done
    if (EXP_CATEGORY_FILTERS.includes(expFilter)) return e.category === expFilter
    return true
  })

  async function toggleTripDone(trip: BucketTrip) {
    await fetch(`/api/bucket-list/trips/${trip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: trip.destination,
        cities: trip.cities,
        budget: trip.budget,
        targetYear: trip.targetYear,
        notes: trip.notes,
        done: !trip.done,
      }),
    })
    mutateTrips()
  }

  async function toggleExperienceDone(experience: BucketExperience) {
    await fetch(`/api/bucket-list/experiences/${experience.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: experience.title,
        category: experience.category,
        notes: experience.notes,
        targetYear: experience.targetYear,
        done: !experience.done,
      }),
    })
    mutateExperiences()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bucket List</h1>
        <div className="flex gap-2">
          {(trips.length > 0 || experiences.length > 0) && (
            <button onClick={() => setShowPrompt(true)} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
              Generate AI Prompt
            </button>
          )}
          <button
            onClick={() => tab === 'trips' ? setAddingTrip(true) : setAddingExperience(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {tab === 'trips' ? '+ Add Trip' : '+ Add Experience'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['trips', 'experiences'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t === 'trips' ? `Trips (${trips.length})` : `Experiences (${experiences.length})`}
          </button>
        ))}
      </div>

      {/* Trips tab */}
      {tab === 'trips' && (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {TRIP_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTripFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  tripFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filteredTrips.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {tripFilter === 'All'
                ? 'No trips yet. Click "+ Add Trip" to add your first.'
                : `No ${tripFilter.toLowerCase()} trips.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(t => (
                <TripCard
                  key={t.id}
                  trip={t}
                  onToggleDone={() => toggleTripDone(t)}
                  onClick={() => setEditTrip(t)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Experiences tab */}
      {tab === 'experiences' && (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {[...EXP_STATUS_FILTERS, ...EXP_CATEGORY_FILTERS].map(f => (
              <button
                key={f}
                onClick={() => setExpFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  expFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filteredExperiences.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {expFilter === 'All'
                ? 'No experiences yet. Click "+ Add Experience" to add your first.'
                : `No ${expFilter} experiences.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExperiences.map(e => (
                <ExperienceCard
                  key={e.id}
                  experience={e}
                  onToggleDone={() => toggleExperienceDone(e)}
                  onClick={() => setEditExperience(e)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {addingTrip && (
        <TripForm
          onSave={() => { mutateTrips(); setAddingTrip(false) }}
          onCancel={() => setAddingTrip(false)}
        />
      )}
      {addingExperience && (
        <ExperienceForm
          onSave={() => { mutateExperiences(); setAddingExperience(false) }}
          onCancel={() => setAddingExperience(false)}
        />
      )}
      {editTrip && (
        <TripForm
          initial={editTrip}
          onSave={() => { mutateTrips(); setEditTrip(null) }}
          onCancel={() => setEditTrip(null)}
        />
      )}
      {editExperience && (
        <ExperienceForm
          initial={editExperience}
          onSave={() => { mutateExperiences(); setEditExperience(null) }}
          onCancel={() => setEditExperience(null)}
        />
      )}
      {showPrompt && (
        <PromptModal title="Bucket List AI Prompt" prompt={buildBucketListPrompt()} onClose={() => setShowPrompt(false)} />
      )}
    </div>
  )
}
