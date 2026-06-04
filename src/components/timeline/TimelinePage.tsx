'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface TripEntry {
  id: number
  countryName: string
  cities: string[]
  startDate: string | null
  notes: string | null
}

interface MemoryEntry {
  id: number
  title: string
  date: string
  category: string
  location: string | null
  notes: string | null
}

type TimelineItem =
  | { kind: 'trip'; date: string; data: TripEntry }
  | { kind: 'memory'; date: string; data: MemoryEntry }

export default function TimelinePage() {
  const { data: trips = [] } = useSWR<TripEntry[]>('/api/travel/trips', fetcher)
  const { data: memories = [] } = useSWR<MemoryEntry[]>('/api/memories', fetcher)

  const items: TimelineItem[] = [
    ...trips
      .filter(t => t.startDate)
      .map(t => ({ kind: 'trip' as const, date: t.startDate!, data: t })),
    ...memories.map(m => ({ kind: 'memory' as const, date: m.date, data: m })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        No trips or memories yet. Add some to build your timeline.
      </p>
    )
  }

  const rendered: Array<{ type: 'separator'; label: string } | { type: 'item'; item: TimelineItem }> = []
  let lastYM = ''
  for (const item of items) {
    const ym = item.date.slice(0, 7)
    if (ym !== lastYM) {
      const [y, m] = ym.split('-')
      rendered.push({
        type: 'separator',
        label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      })
      lastYM = ym
    }
    rendered.push({ type: 'item', item })
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {rendered.map((entry, idx) => {
        if (entry.type === 'separator') {
          return (
            <div key={`sep-${idx}`} className="flex items-center gap-2 mt-4 mb-1 first:mt-0">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{entry.label}</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            </div>
          )
        }
        const { item } = entry
        return (
          <div key={`${item.kind}-${item.data.id}`} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
              item.kind === 'trip'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            }`}>
              {item.kind === 'trip' ? 'Trip' : 'Memory'}
            </span>
            <div className="min-w-0 flex-1">
              {item.kind === 'trip' ? (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.data.countryName}</p>
                  {item.data.cities.length > 0 && (
                    <p className="text-xs text-gray-400">{item.data.cities.join(', ')}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.data.title}</p>
                  {item.data.location && <p className="text-xs text-gray-400">{item.data.location}</p>}
                </>
              )}
              {item.data.notes && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {item.data.notes.length > 100 ? item.data.notes.slice(0, 100) + '…' : item.data.notes}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {new Date(item.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
