'use client'

import { useState } from 'react'
import type { Person } from '@/types'

const RELATIONSHIPS = ['Friend', 'Family', 'Colleague', 'Acquaintance', 'Mentor', 'Partner', 'Other']

interface PersonFormProps {
  initial?: Person
  onSave: () => void
  onCancel: () => void
}

export default function PersonForm({ initial, onSave, onCancel }: PersonFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [birthday, setBirthday] = useState(initial?.birthday ?? '')
  const [relationship, setRelationship] = useState(initial?.relationship ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [lastContactDate, setLastContactDate] = useState(initial?.lastContactDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name,
      birthday: birthday || null,
      relationship: relationship || null,
      email: email || null,
      phone: phone || null,
      lastContactDate: lastContactDate || null,
      notes: notes || null,
    }
    if (initial?.id) {
      await fetch(`/api/people/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
        <input required className={inputCls} value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Birthday</label>
          <input type="date" className={inputCls} value={birthday} onChange={e => setBirthday(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last contact</label>
          <input type="date" className={inputCls} value={lastContactDate} onChange={e => setLastContactDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship</label>
        <select className={inputCls} value={relationship} onChange={e => setRelationship(e.target.value)}>
          <option value="">Select…</option>
          {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
          <input type="tel" className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea rows={3} className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Save</button>
      </div>
    </form>
  )
}
