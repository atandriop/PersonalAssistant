'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import type { Memory } from '@/types'
import MemoryCard from './MemoryCard'
import MemoryForm from './MemoryForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORIES = ['All', 'Career', 'Education', 'Travel', 'Personal', 'Other'] as const

export default function MemoriesPage() {
  const searchParams = useSearchParams()
  const tripIdFilter = searchParams.get('tripId') ? Number(searchParams.get('tripId')) : null

  const { data: memories = [], mutate } = useSWR<Memory[]>('/api/memories', fetcher)

  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [adding, setAdding] = useState(false)
  const [editMemory, setEditMemory] = useState<Memory | null>(null)

  const filtered = memories
    .filter(m => !tripIdFilter || m.trips.some(t => t.id === tripIdFilter))
    .filter(m => categoryFilter === 'All' || m.category === categoryFilter)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Memories</h1>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Add Memory
        </button>
      </div>

      {/* Trip filter banner */}
      {tripIdFilter && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-400">
          <span>Showing memories linked to this trip</span>
          <a href="/memories" className="ml-auto text-xs underline">Clear</a>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          {memories.length === 0
            ? "No memories yet. Add your first one."
            : "No memories match the current filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <MemoryCard
              key={m.id}
              memory={m}
              onClick={() => setEditMemory(m)}
            />
          ))}
        </div>
      )}

      {adding && (
        <MemoryForm
          onSave={() => { mutate(); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}
      {editMemory && (
        <MemoryForm
          initial={editMemory}
          onSave={() => { mutate(); setEditMemory(null) }}
          onCancel={() => setEditMemory(null)}
        />
      )}
    </div>
  )
}
