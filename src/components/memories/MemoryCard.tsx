'use client'

import type { Memory } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  Career: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Education: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Travel: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Personal: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function formatMemoryDate(date: string, endDate: string | null): string {
  const start = new Date(date + 'T00:00:00')
  const startStr = start.toLocaleString('default', { month: 'short', year: 'numeric' })
  if (!endDate) return startStr
  const end = new Date(endDate + 'T00:00:00')
  const endStr = end.toLocaleString('default', { month: 'short', year: 'numeric' })
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`
}

export default function MemoryCard({ memory, onClick }: {
  memory: Memory
  onClick: () => void
}) {
  return (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">{memory.title}</h3>
        <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full font-medium ${CATEGORY_COLORS[memory.category] ?? CATEGORY_COLORS.Other}`}>
          {memory.category}
        </span>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {formatMemoryDate(memory.date, memory.endDate)}
      </p>

      {memory.location && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{memory.location}</p>
      )}

      {memory.notes && (
        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2">{memory.notes}</p>
      )}

      {memory.company && (
        <div className="mt-1">
          <span className="text-xs px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full">{memory.company}</span>
        </div>
      )}

      {memory.companions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {memory.companions.map(p => (
            <span key={p} className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">{p}</span>
          ))}
        </div>
      )}

      {memory.trips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2" onClick={e => e.stopPropagation()}>
          {memory.trips.map(t => (
            <a
              key={t.id}
              href={`/travel?tab=trips&country=${encodeURIComponent(t.countryName)}`}
              className="px-2 py-0.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full hover:opacity-80"
            >
              {t.countryName}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
