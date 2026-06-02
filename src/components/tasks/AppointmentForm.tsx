'use client'

import { useState } from 'react'
import type { Appointment } from '@/types'

const CATEGORIES = ['Medical', 'Vehicle', 'Personal', 'Other']
const INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: '6months', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
]

interface AppointmentFormProps {
  initial?: Appointment
  onSave: () => void
  onCancel: () => void
}

export default function AppointmentForm({ initial, onSave, onCancel }: AppointmentFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '')
  const [recurring, setRecurring] = useState(initial?.recurring ?? false)
  const [recurringInterval, setRecurringInterval] = useState(initial?.recurringInterval ?? 'yearly')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      title,
      date,
      time: time || null,
      location: location || null,
      category,
      notes: notes || null,
      cost: cost ? Number(cost) : null,
      recurring,
      recurringInterval: recurring ? recurringInterval : null,
    }
    if (initial?.id) {
      await fetch(`/api/appointments/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
        <input required className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
          <input required type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
          <input type="time" className={inputCls} value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
          <select required className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            placeholder="0.00"
            value={cost}
            onChange={e => setCost(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
        <input className={inputCls} placeholder="e.g. Dr. Smith's office" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea rows={2} className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={recurring}
            onChange={e => setRecurring(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring</span>
        </label>
        {recurring && (
          <select
            className={`mt-2 ${inputCls}`}
            value={recurringInterval}
            onChange={e => setRecurringInterval(e.target.value)}
          >
            {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          Save
        </button>
      </div>
    </form>
  )
}
