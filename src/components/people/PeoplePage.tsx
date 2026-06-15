'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Person } from '@/types'
import Modal from '@/components/ui/Modal'
import PersonForm from './PersonForm'
import { daysUntilBirthday } from '@/lib/peopleUtils'
import { Plus, Pencil, Trash2, Cake, Phone, Mail, Calendar, Gift, Plane } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const RELATIONSHIP_COLOR: Record<string, string> = {
  Friend:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Family:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Colleague:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Acquaintance: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Mentor:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Partner:      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Other:        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default function PeoplePage() {
  const { data: people = [], mutate } = useSWR<Person[]>('/api/people', fetcher)
  const { data: companions = [] } = useSWR<{ id: number; name: string }[]>('/api/companions', fetcher)
  const { data: giftPeople = [] } = useSWR<{ id: number; name: string; budget: number | null; notes: string | null }[]>('/api/gifts/people', fetcher)
  const companionNames = new Set(companions.map(c => c.name.toLowerCase()))
  const giftNames = new Set(giftPeople.map(g => g.name.toLowerCase()))
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Person | undefined>()
  const [search, setSearch] = useState('')

  async function deletePerson(p: Person) {
    if (!confirm(`Delete ${p.name}?`)) return
    await fetch(`/api/people/${p.id}`, { method: 'DELETE' })
    mutate()
  }

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.relationship ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">People</h1>
        <button
          onClick={() => { setEditing(undefined); setShowForm(true) }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Add person
        </button>
      </div>

      <input
        className="w-full mb-4 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        placeholder="Search by name or relationship…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No contacts yet.</p>
      )}

      <div className="grid gap-3">
        {filtered.map(p => {
          const daysUntil = p.birthday ? daysUntilBirthday(p.birthday) : null
          const birthdayLabel = daysUntil === null ? null
            : daysUntil === 0 ? 'Birthday today!'
            : daysUntil <= 30 ? `Birthday in ${daysUntil}d`
            : null
          const isGiftPerson = giftNames.has(p.name.toLowerCase())
          const isCompanion = companionNames.has(p.name.toLowerCase())

          return (
            <div key={p.id} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                  {p.relationship && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATIONSHIP_COLOR[p.relationship] ?? RELATIONSHIP_COLOR.Other}`}>
                      {p.relationship}
                    </span>
                  )}
                  {birthdayLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 flex items-center gap-1">
                      <Cake size={10} /> {birthdayLabel}
                    </span>
                  )}
                  {isGiftPerson && (
                    <a
                      href="/gifts"
                      className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 flex items-center gap-1 hover:bg-pink-200 dark:hover:bg-pink-900/50"
                    >
                      <Gift size={10} /> Gift list
                    </a>
                  )}
                  {isCompanion && (
                    <a
                      href="/travel"
                      className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 flex items-center gap-1 hover:bg-sky-200 dark:hover:bg-sky-900/50"
                    >
                      <Plane size={10} /> Travel buddy
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                  {p.birthday && <span className="flex items-center gap-1"><Cake size={11} /> {p.birthday.slice(5)}</span>}
                  {p.email && <span className="flex items-center gap-1"><Mail size={11} /> {p.email}</span>}
                  {p.phone && <span className="flex items-center gap-1"><Phone size={11} /> {p.phone}</span>}
                  {p.lastContactDate && <span className="flex items-center gap-1"><Calendar size={11} /> Last contact {p.lastContactDate.slice(0, 10)}</span>}
                </div>
                {p.notes && <p className="text-xs text-gray-400 mt-1 truncate">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditing(p); setShowForm(true) }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Pencil size={14} /></button>
                <button onClick={() => deletePerson(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editing ? 'Edit person' : 'Add person'}>
          <PersonForm
            initial={editing}
            onSave={() => { setShowForm(false); mutate() }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  )
}
