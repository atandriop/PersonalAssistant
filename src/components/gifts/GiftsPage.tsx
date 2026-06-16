'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { User } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import GiftPersonForm from './GiftPersonForm'
import GiftIdeaForm from './GiftIdeaForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface GiftIdea {
  id: number
  giftPersonId: number
  title: string
  occasion: string | null
  estimatedCost: number | null
  purchased: boolean
  notes: string | null
}

interface GiftPerson {
  id: number
  name: string
  budget: number | null
  notes: string | null
  personId: number | null
  ideas: GiftIdea[]
}

function fmt(n: number) {
  return `€${n % 1 === 0 ? n : n.toFixed(2)}`
}

// ─── Person detail (expanded) ─────────────────────────────────────────────
function PersonDetail({ person, onMutate }: { person: GiftPerson; onMutate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<GiftIdea | null>(null)

  async function togglePurchased(idea: GiftIdea) {
    await fetch(`/api/gifts/ideas/${idea.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: idea.title, occasion: idea.occasion, estimatedCost: idea.estimatedCost, purchased: !idea.purchased, notes: idea.notes }),
    })
    onMutate()
  }

  async function deleteIdea(id: number) {
    await fetch(`/api/gifts/ideas/${id}`, { method: 'DELETE' })
    onMutate()
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-3 pt-2">
      {person.ideas.length === 0 && <p className="text-sm text-gray-400 py-1">No ideas yet.</p>}
      {person.ideas.map(idea => (
        <div key={idea.id} className="flex items-center gap-2 py-1.5 group border-b border-gray-50 dark:border-gray-800 last:border-0">
          <button
            onClick={() => togglePurchased(idea)}
            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${idea.purchased ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}
          >
            {idea.purchased && <span className="text-white text-xs">✓</span>}
          </button>
          <span className={`text-sm flex-1 ${idea.purchased ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{idea.title}</span>
          {idea.occasion && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">{idea.occasion}</span>
          )}
          {idea.estimatedCost != null && (
            <span className="text-xs text-gray-400 shrink-0">{fmt(idea.estimatedCost)}</span>
          )}
          <div className="hidden group-hover:flex gap-1 shrink-0">
            <button onClick={() => setEditing(idea)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
            <button onClick={() => deleteIdea(idea.id)} className="text-xs px-1.5 py-0.5 text-red-400 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
          </div>
        </div>
      ))}
      <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-500 hover:text-blue-600">+ Add idea</button>

      {showAdd && <Modal title="Add gift idea" onClose={() => setShowAdd(false)}><GiftIdeaForm personId={person.id} onSave={() => { setShowAdd(false); onMutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit gift idea" onClose={() => setEditing(null)}><GiftIdeaForm personId={person.id} initial={editing} onSave={() => { setEditing(null); onMutate() }} onCancel={() => setEditing(null)} /></Modal>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function GiftsPage() {
  const { data: people = [], mutate } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
  const { data: allPeople = [] } = useSWR<{ id: number; name: string }[]>('/api/people', fetcher)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<GiftPerson | null>(null)
  const [linkingId, setLinkingId] = useState<number | null>(null)

  async function deletePerson(id: number) {
    if (!confirm('Delete this person and all their gift ideas?')) return
    await fetch(`/api/gifts/people/${id}`, { method: 'DELETE' })
    mutate()
  }

  async function linkPerson(giftPersonId: number, personId: number | null) {
    const gp = people.find(p => p.id === giftPersonId)
    if (!gp) return
    await fetch(`/api/gifts/people/${giftPersonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: gp.name, budget: gp.budget, notes: gp.notes, personId }),
    })
    setLinkingId(null)
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gifts</h1>
        <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add person</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {people.map(person => {
          const isExpanded = expandedId === person.id
          const purchased = person.ideas.filter(i => i.purchased)
          const committedSpend = purchased.reduce((s, i) => s + (i.estimatedCost ?? 0), 0)
          const budgetPct = person.budget ? Math.min(100, Math.round((committedSpend / person.budget) * 100)) : null

          return (
            <div key={person.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-4 cursor-pointer flex items-center gap-3" onClick={() => setExpandedId(isExpanded ? null : person.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{person.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {purchased.length}/{person.ideas.length} bought
                    </span>
                  </div>
                  {budgetPct !== null && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${budgetPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(committedSpend)} / {fmt(person.budget!)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {person.personId ? (
                    <Link
                      href="/people"
                      title="View in People"
                      className="p-1 text-blue-500 hover:text-blue-600"
                    >
                      <User size={14} />
                    </Link>
                  ) : linkingId === person.id ? (
                    <select
                      autoFocus
                      className="text-xs border rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white px-1 py-0.5"
                      defaultValue=""
                      onChange={e => linkPerson(person.id, e.target.value ? Number(e.target.value) : null)}
                      onBlur={() => setLinkingId(null)}
                    >
                      <option value="">— pick person —</option>
                      {allPeople.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setLinkingId(person.id)}
                      title="Link to People entry"
                      className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500"
                    >
                      <User size={14} />
                    </button>
                  )}
                  <button onClick={() => setEditing(person)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => deletePerson(person.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? '▾' : '▸'}</span>
              </div>
              {isExpanded && <PersonDetail person={person} onMutate={mutate} />}
            </div>
          )
        })}
      </div>

      {people.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No people yet. Add one to start planning gifts.</p>}

      {showAdd && <Modal title="Add person" onClose={() => setShowAdd(false)}><GiftPersonForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit person" onClose={() => setEditing(null)}><GiftPersonForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
    </div>
  )
}
