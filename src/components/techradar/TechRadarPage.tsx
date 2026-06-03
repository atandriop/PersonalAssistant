'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Badge from '@/components/ui/Badge'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface TechRadarItem {
  id: number; name: string; ring: string; category: string; notes?: string | null
  previousRing?: string | null; ringChangedAt?: string | null
}

const RINGS = [
  { key: 'adopt', label: 'Adopt', color: '#10b981', desc: 'Using confidently in production' },
  { key: 'trial', label: 'Trial', color: '#f59e0b', desc: 'Actively evaluating' },
  { key: 'assess', label: 'Assess', color: '#3b82f6', desc: 'Worth watching' },
  { key: 'hold', label: 'Hold', color: '#6b7280', desc: 'Moving away from' },
] as const

const CATEGORIES = ['language', 'framework', 'tool', 'platform'] as const
const CAT_COLOR: Record<string, string> = {
  language: '#6366f1', framework: '#ec4899', tool: '#14b8a6', platform: '#f97316',
}

function InlineAddForm({ ringKey, onSave, onCancel }: {
  ringKey: string
  onSave: (data: { name: string; ring: string; category: string; notes: string | null }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('tool')
  const [notes, setNotes] = useState('')
  const f = 'border rounded-lg px-2 py-1.5 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white w-full'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, ring: ringKey, category, notes: notes || null })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={f} />
      <select value={category} onChange={e => setCategory(e.target.value)} className={f}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
      </select>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className={f} />
      <div className="flex gap-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded px-2 py-1 text-xs font-medium hover:bg-blue-700">Add</button>
        <button type="button" onClick={onCancel} className="px-2 py-1 text-xs border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function TechRadarPage() {
  const { data: items = [], mutate } = useSWR<TechRadarItem[]>('/api/tech-radar', fetcher)
  const [filterCat, setFilterCat] = useState('')
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())

  const filtered = filterCat ? items.filter(i => i.category === filterCat) : items

  async function addItem(data: { name: string; ring: string; category: string; notes: string | null }) {
    await fetch('/api/tech-radar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setAddingTo(null)
    mutate()
  }

  async function moveRing(item: TechRadarItem, newRing: string) {
    await fetch(`/api/tech-radar/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, ring: newRing }),
    })
    mutate()
  }

  function startEdit(item: TechRadarItem) {
    setEditingId(item.id); setEditName(item.name)
    setEditCategory(item.category); setEditNotes(item.notes ?? '')
  }

  async function saveEdit(item: TechRadarItem) {
    await fetch(`/api/tech-radar/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, ring: item.ring, category: editCategory, notes: editNotes || null }),
    })
    setEditingId(null); mutate()
  }

  async function del(id: number) {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/tech-radar/${id}`, { method: 'DELETE' })
    mutate()
  }

  function toggleNotes(id: number) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function buildPrompt(): string {
    const sections = RINGS.map(r => {
      const ring = items.filter(i => i.ring === r.key)
      if (!ring.length) return `${r.label.toUpperCase()}:\n(none)`
      return `${r.label.toUpperCase()}:\n${ring.map(i => `- ${i.name} (${i.category})${i.notes ? `: ${i.notes}` : ''}`).join('\n')}`
    }).join('\n\n')
    return `Here is my tech radar:\n\n${sections}\n\nBased on current industry trends (2026), what am I missing in each ring? Flag anything in Adopt that may be worth reconsidering, and suggest 2-3 technologies I should move from Assess to Trial.`
  }

  const ef = 'border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tech Radar</h1>
        <button onClick={() => setShowPrompt(true)} disabled={items.length === 0}
          className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
          AI Prompt
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterCat === cat ? 'bg-blue-600 text-white border-blue-600' : 'dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {RINGS.map(ring => {
          const ringItems = filtered.filter(i => i.ring === ring.key)
          return (
            <div key={ring.key} className="bg-white dark:bg-gray-900 border rounded-xl p-4" style={{ borderColor: ring.color + '40' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-sm" style={{ color: ring.color }}>● {ring.label}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{ring.desc}</p>
                </div>
                <button onClick={() => setAddingTo(addingTo === ring.key ? null : ring.key)}
                  className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  + Add
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {ringItems.map(item => (
                  <div key={item.id} className="group">
                    {editingId === item.id ? (
                      <div className="flex flex-col gap-1.5 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className={ef} />
                        <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className={ef}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                        <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes" className={ef} />
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(item)} className="flex-1 bg-blue-600 text-white rounded px-2 py-1 text-xs">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                            <Badge color={CAT_COLOR[item.category]}>{item.category}</Badge>
                            {item.previousRing && (
                              <span className="text-xs text-gray-400 dark:text-gray-500" title={item.ringChangedAt ? `Moved on ${item.ringChangedAt}` : undefined}>
                                ← {item.previousRing}
                              </span>
                            )}
                            {item.notes && (
                              <button onClick={() => toggleNotes(item.id)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                {expandedNotes.has(item.id) ? '▲' : '▼'}
                              </button>
                            )}
                          </div>
                          {item.notes && expandedNotes.has(item.id) && (
                            <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select value={item.ring} onChange={e => moveRing(item, e.target.value)}
                            className="text-xs border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
                            {RINGS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                          </select>
                          <button onClick={() => startEdit(item)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">✎</button>
                          <button onClick={() => del(item.id)} className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {ringItems.length === 0 && addingTo !== ring.key && (
                  <p className="text-xs text-gray-400">Nothing here yet.</p>
                )}
              </div>

              {addingTo === ring.key && (
                <InlineAddForm ringKey={ring.key} onSave={addItem} onCancel={() => setAddingTo(null)} />
              )}
            </div>
          )
        })}
      </div>

      {showPrompt && (
        <PromptModal title="Tech Radar AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />
      )}
    </div>
  )
}
