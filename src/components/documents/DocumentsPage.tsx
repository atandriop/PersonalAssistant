'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Document } from '@/types'
import DocumentCard from './DocumentCard'
import DocumentForm from './DocumentForm'
import DocumentDetailModal from './DocumentDetailModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const FILTER_CATEGORIES = ['All', 'Identity', 'Finance', 'Vehicle', 'Health', 'Insurance', 'Other']

export default function DocumentsPage() {
  const { data: docs = [], mutate } = useSWR<Document[]>('/api/documents', fetcher)
  const [filter, setFilter] = useState('All')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Document | null>(null)
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
    if (!confirm(`Delete ${ids.length} document${ids.length !== 1 ? 's' : ''}?`)) return
    await fetch('/api/documents/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    })
    mutate()
    exitSelectMode()
  }

  const allTags = Array.from(new Set(docs.flatMap(d => d.tags))).sort()

  const filtered = docs
    .filter(d => filter === 'All' || d.category === filter)
    .filter(d => !tagFilter || d.tags.includes(tagFilter))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents Vault</h1>
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
          <div className="flex gap-2">
            {docs.length > 0 && (
              <button onClick={() => setSelectMode(true)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                Select
              </button>
            )}
            <button
              onClick={() => setUploading(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + Upload
            </button>
          </div>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap mb-3">
        {FILTER_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tag filter pills */}
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

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          {docs.length === 0
            ? 'No documents yet. Click "+ Upload" to add your first document.'
            : `No documents match the current filter.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => (
            <div key={doc.id} className="relative">
              {selectMode && (
                <div
                  className={`absolute inset-0 z-10 rounded-xl cursor-pointer border-2 transition-colors ${
                    selectedIds.has(doc.id) ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => toggleSelect(doc.id)}
                />
              )}
              {selectMode && selectedIds.has(doc.id) && (
                <div className="absolute top-2 left-2 z-20 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
              <DocumentCard doc={doc} onClick={() => !selectMode && setSelected(doc)} />
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {uploading && (
        <DocumentForm
          onSave={() => { mutate(); setUploading(false) }}
          onCancel={() => setUploading(false)}
        />
      )}

      {/* Detail modal */}
      {selected && (
        <DocumentDetailModal
          doc={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
