'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import type { Memory } from '@/types'
import MemoryCard from './MemoryCard'
import MemoryForm from './MemoryForm'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORIES = ['All', 'Career', 'Education', 'Travel', 'Personal', 'Other'] as const

export default function MemoriesPage() {
  const searchParams = useSearchParams()
  const tripIdFilter = searchParams.get('tripId') ? Number(searchParams.get('tripId')) : null

  const { data: memories = [], mutate } = useSWR<Memory[]>('/api/memories', fetcher)

  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editMemory, setEditMemory] = useState<Memory | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds)
    if (!confirm(`Delete ${ids.length} memor${ids.length !== 1 ? 'ies' : 'y'}?`)) return
    await fetch('/api/memories/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    })
    mutate()
    exitSelectMode()
  }

  const allTags = Array.from(new Set(memories.flatMap(m => m.tags))).sort()

  function buildMemoriesPrompt(): string {
    const sorted = [...memories].sort((a, b) => a.date.localeCompare(b.date))
    const lines = sorted.map(m => {
      const dateStr = m.endDate ? `${m.date} – ${m.endDate}` : m.date
      const locationStr = m.location ? ` · ${m.location}` : ''
      const tripStr = m.trips.length > 0 ? ` (linked to: ${m.trips.map(t => t.countryName).join(', ')})` : ''
      const notesStr = m.notes ? `\n    Notes: ${m.notes}` : ''
      return `- [${m.category}] ${m.title} (${dateStr}${locationStr})${tripStr}${notesStr}`
    }).join('\n')
    return `Here are my logged life memories, sorted chronologically:

${lines}

Please reflect on this life timeline. Identify recurring themes or patterns across categories, highlight any significant transitions or chapters, and suggest one or two things I might want to document or explore further based on what seems underrepresented.`
  }

  const filtered = memories
    .filter(m => !tripIdFilter || m.trips.some(t => t.id === tripIdFilter))
    .filter(m => categoryFilter === 'All' || m.category === categoryFilter)
    .filter(m => !tagFilter || m.tags.includes(tagFilter))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Memories</h1>
        <div className="flex gap-2">
          {selectMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.size} selected</span>
              {selectedIds.size > 0 && (
                <button onClick={bulkDelete} className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Delete
                </button>
              )}
              <button onClick={exitSelectMode} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          ) : (
            <>
              {memories.length > 0 && (
                <>
                  <button onClick={() => setSelectMode(true)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Select
                  </button>
                  <button
                    onClick={() => setShowPrompt(true)}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                  >
                    Generate AI Prompt
                  </button>
                </>
              )}
              <button
                onClick={() => setAdding(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                + Add Memory
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trip filter banner */}
      {tripIdFilter && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-400">
          <span>Showing memories linked to this trip</span>
          <a href="/memories" className="ml-auto text-xs underline">Clear</a>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap mb-3">
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

      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setTagFilter(null)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${!tagFilter ? 'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            All tags
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${tagFilter === tag ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          {memories.length === 0
            ? "No memories yet. Add your first one."
            : "No memories match the current filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <div key={m.id} className="relative">
              {selectMode && (
                <div
                  className={`absolute inset-0 z-10 rounded-xl cursor-pointer border-2 transition-colors ${
                    selectedIds.has(m.id) ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => toggleSelect(m.id)}
                />
              )}
              {selectMode && selectedIds.has(m.id) && (
                <div className="absolute top-2 left-2 z-20 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
              <MemoryCard memory={m} onClick={() => !selectMode && setEditMemory(m)} />
            </div>
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
      {showPrompt && (
        <PromptModal
          title="Memories AI Prompt"
          prompt={buildMemoriesPrompt()}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
