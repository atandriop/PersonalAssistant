'use client'

import type { TravelTrip } from '@/types'

function formatTripMeta(startDate: string | null, endDate: string | null): string {
  if (!startDate) return ''
  const start = new Date(startDate + 'T00:00:00')
  const monthYear = start.toLocaleString('default', { month: 'short', year: 'numeric' })
  if (!endDate) return monthYear
  const end = new Date(endDate + 'T00:00:00')
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return `${monthYear} · ${days}d`
}

export default function TripCard({ trip, onClick }: {
  trip: TravelTrip
  onClick: () => void
}) {
  const isDraft = !trip.startDate

  const COST_ICONS: Record<string, string> = { airfare: '✈', hotel: '🏨', food: '🍔', entertainment: '🎭' }
  const COST_ORDER = ['airfare', 'hotel', 'food', 'entertainment']
  const categoryTotals = trip.costLines.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + l.amount
    return acc
  }, {} as Record<string, number>)
  const breakdownParts = COST_ORDER.filter(c => (categoryTotals[c] ?? 0) > 0)

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
        isDraft
          ? 'border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-400'
          : 'border border-gray-200 dark:border-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="mb-2">
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
          {trip.countryName}
        </span>
      </div>
      {trip.cities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {trip.cities.map(city => (
            <span
              key={city}
              className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full"
            >
              {city}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1">
        {isDraft ? (
          <span className="text-amber-500 dark:text-amber-400 font-medium">Add dates</span>
        ) : (
          <span>{formatTripMeta(trip.startDate, trip.endDate)}</span>
        )}
        {trip.actualCost != null && <span>€{trip.actualCost.toLocaleString()}</span>}
      </div>
      {breakdownParts.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1">
          {breakdownParts.map(c => (
            <span key={c}>{COST_ICONS[c]} €{categoryTotals[c].toLocaleString()}</span>
          ))}
        </div>
      )}
      {trip.rating != null && (
        <div className="flex gap-0.5 mb-1">
          {[1, 2, 3, 4, 5].map(n => (
            <span
              key={n}
              className={`text-sm ${n <= trip.rating! ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
            >
              ★
            </span>
          ))}
        </div>
      )}
      {trip.company && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full">{trip.company}</span>
        </div>
      )}
      {trip.companions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {trip.companions.map(p => (
            <span key={p} className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">{p}</span>
          ))}
        </div>
      )}
      {trip.notes && (
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">{trip.notes}</p>
      )}
      {trip.memories.length > 0 && (
        <a
          href={`/memories?tripId=${trip.id}`}
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center mt-2 px-2 py-0.5 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full hover:opacity-80"
        >
          {trip.memories.length} {trip.memories.length === 1 ? 'memory' : 'memories'}
        </a>
      )}
    </div>
  )
}
