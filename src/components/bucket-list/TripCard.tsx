'use client'

import type { BucketTrip } from '@/types'

export default function TripCard({ trip, onToggleDone, onClick }: {
  trip: BucketTrip
  onToggleDone: () => void
  onClick: () => void
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
        trip.done
          ? 'border-green-300 dark:border-green-700 opacity-50'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-base font-semibold text-gray-900 dark:text-white ${trip.done ? 'line-through' : ''}`}>
          {trip.destination}
        </h3>
        <button
          onClick={e => { e.stopPropagation(); onToggleDone() }}
          title={trip.done ? 'Mark not done' : 'Mark done'}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
            trip.done
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          }`}
        />
      </div>
      {trip.cities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
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
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {trip.targetYear && <span>{trip.targetYear}</span>}
        {trip.budget != null && <span>€{trip.budget.toLocaleString()}</span>}
      </div>
    </div>
  )
}
