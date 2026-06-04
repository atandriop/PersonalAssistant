'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import CollectibleForm from './CollectibleForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CollectibleItem {
  id: number
  name: string
  collectionType: string
  quantity: number
  purchasePrice: number | null
  currentValue: number | null
  condition: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const COLLECTION_TYPES = [
  { key: 'Cards', emoji: '🃏' },
  { key: 'Funko Pop', emoji: '👾' },
  { key: 'Lego', emoji: '🧱' },
  { key: 'Figures', emoji: '🎭' },
  { key: 'Books', emoji: '📚' },
]

function metaSummary(item: CollectibleItem): string {
  const m = item.metadata ?? {}
  switch (item.collectionType) {
    case 'Cards': {
      const parts = [m.set, m.grade].filter(Boolean)
      return (parts as string[]).join(' · ')
    }
    case 'Funko Pop': {
      const parts = [
        m.number ? `#${m.number}` : null,
        m.exclusive && m.exclusive !== 'None' ? `${m.exclusive} exclusive` : null,
      ].filter(Boolean)
      return (parts as string[]).join(' · ')
    }
    case 'Lego': {
      const sealed = m.sealed ? 'Sealed' : m.sealed === false ? 'Opened' : null
      return ([m.setNumber, sealed].filter(Boolean) as string[]).join(' · ')
    }
    case 'Figures': {
      return ([m.franchise, m.brand].filter(Boolean) as string[]).join(' · ')
    }
    case 'Books': {
      const vol = m.volumeNumber ? `Vol. ${m.volumeNumber}` : null
      return ([m.series, vol].filter(Boolean) as string[]).join(' · ')
    }
    default:
      return ''
  }
}

export default function CollectiblesTab() {
  const { data: items = [], mutate } = useSWR<CollectibleItem[]>('/api/collectibles', fetcher)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(COLLECTION_TYPES.map(t => t.key))
  )
  const [editItem, setEditItem] = useState<CollectibleItem | null>(null)
  const [addingType, setAddingType] = useState<string | null>(null)

  function toggleExpanded(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function deleteItem(id: number) {
    if (!confirm('Delete this collectible?')) return
    await fetch(`/api/collectibles/${id}`, { method: 'DELETE' })
    mutate()
  }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalPaid = items.reduce((s, i) => s + (i.purchasePrice ?? 0) * i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + ((i.currentValue ?? i.purchasePrice ?? 0)) * i.quantity, 0)

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm mb-4 text-gray-500 dark:text-gray-400">
          <span><span className="font-semibold text-gray-800 dark:text-gray-200">{totalItems}</span> items</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Paid <span className="font-semibold text-gray-800 dark:text-gray-200">€{totalPaid.toFixed(2)}</span></span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Value <span className="font-semibold text-green-600 dark:text-green-400">€{totalValue.toFixed(2)}</span></span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {COLLECTION_TYPES.map(({ key, emoji }) => {
          const typeItems = items.filter(i => i.collectionType === key)
          const isExpanded = expanded.has(key)

          return (
            <div key={key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => toggleExpanded(key)}
              >
                <div className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{key}</span>
                  <span className="text-xs text-gray-400">({typeItems.length})</span>
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setAddingType(key)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    + Add
                  </button>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▾' : '▸'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {typeItems.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 italic">No {key.toLowerCase()} added yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {typeItems.map(item => {
                        const summary = metaSummary(item)
                        const displayValue = item.currentValue ?? item.purchasePrice
                        return (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">{item.name}</span>
                              {summary && (
                                <span className="text-xs text-gray-400 truncate block">{summary}</span>
                              )}
                            </div>
                            {item.quantity > 1 && (
                              <span className="text-xs text-gray-400 shrink-0">×{item.quantity}</span>
                            )}
                            {displayValue != null && (
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">
                                €{(displayValue * item.quantity).toFixed(2)}
                              </span>
                            )}
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => setEditItem(item)}
                                className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-900/30"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {addingType && (
        <Modal title={`Add ${addingType}`} onClose={() => setAddingType(null)}>
          <CollectibleForm
            defaultType={addingType}
            onSave={() => { setAddingType(null); mutate() }}
            onCancel={() => setAddingType(null)}
          />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit collectible" onClose={() => setEditItem(null)}>
          <CollectibleForm
            initial={editItem}
            onSave={() => { setEditItem(null); mutate() }}
            onCancel={() => setEditItem(null)}
          />
        </Modal>
      )}
    </div>
  )
}
