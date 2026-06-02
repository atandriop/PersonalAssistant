'use client'

import type { TravelCountry } from '@/types'

export default function CountryCard({ country, onClick, onFilterTrips }: {
  country: TravelCountry
  onClick: () => void
  onFilterTrips: () => void
}) {
  const firstYear = country.firstVisit ? country.firstVisit.slice(0, 4) : null

  return (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{country.name}</h3>
        {country.tripCount === 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
            standalone
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onFilterTrips() }}
          className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
        >
          {country.tripCount} {country.tripCount === 1 ? 'trip' : 'trips'}
        </button>
        {country.totalSpend > 0 && <span>€{country.totalSpend.toLocaleString()}</span>}
        {firstYear && <span>First visited {firstYear}</span>}
      </div>
    </div>
  )
}
