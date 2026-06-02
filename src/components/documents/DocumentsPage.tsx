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
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Document | null>(null)

  const filtered = filter === 'All' ? docs : docs.filter(d => d.category === filter)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents Vault</h1>
        <button
          onClick={() => setUploading(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Upload
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
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

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          {filter === 'All'
            ? 'No documents yet. Click "+ Upload" to add your first document.'
            : `No ${filter} documents.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => (
            <DocumentCard key={doc.id} doc={doc} onClick={() => setSelected(doc)} />
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
