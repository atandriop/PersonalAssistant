'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import AppointmentForm from './AppointmentForm'
import type { Appointment } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORY_COLOR: Record<string, string> = {
  Medical: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const INTERVAL_LABEL: Record<string, string> = {
  monthly: 'every month',
  quarterly: 'every 3 months',
  '6months': 'every 6 months',
  yearly: 'every year',
}

function advanceDate(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (interval === '6months') d.setMonth(d.getMonth() + 6)
  else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function ApptRow({
  appt,
  onMutate,
  onEdit,
}: {
  appt: Appointment
  onMutate: () => void
  onEdit: (a: Appointment) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const categoryColor = CATEGORY_COLOR[appt.category] ?? CATEGORY_COLOR.Other

  async function markDone() {
    await fetch(`/api/appointments/${appt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appt, done: true }),
    })
    onMutate()
  }

  async function markDoneAndScheduleNext() {
    try {
      await fetch(`/api/appointments/${appt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appt, done: true }),
      })
      const nextDate = advanceDate(appt.date, appt.recurringInterval ?? 'yearly')
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: appt.title,
          date: nextDate,
          time: appt.time,
          location: appt.location,
          category: appt.category,
          notes: appt.notes,
          cost: appt.cost,
          recurring: true,
          recurringInterval: appt.recurringInterval,
        }),
      })
      onMutate()
    } catch {
      alert('Failed to schedule next occurrence. Please try again.')
      onMutate()
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this appointment?')) return
    await fetch(`/api/appointments/${appt.id}`, { method: 'DELETE' })
    onMutate()
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${categoryColor}`}>
          {appt.category}
        </span>
        <span className={`flex-1 text-sm font-medium min-w-0 truncate ${
          appt.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
        }`}>
          {appt.title}
        </span>
        {appt.recurring && (
          <span className="text-xs text-gray-400 shrink-0">↻</span>
        )}
        {appt.cost != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">€{appt.cost}</span>
        )}
        <span className="text-xs text-gray-400 shrink-0">
          {appt.date}{appt.time ? ` ${appt.time}` : ''}
        </span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          {appt.location && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">📍 {appt.location}</p>
          )}
          {appt.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{appt.notes}</p>
          )}
          {appt.recurring && appt.recurringInterval && (
            <p className="text-xs text-gray-400 mb-3">
              Recurring: {INTERVAL_LABEL[appt.recurringInterval] ?? appt.recurringInterval}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!appt.done && (
              appt.recurring
                ? (
                  <button
                    onClick={markDoneAndScheduleNext}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                  >
                    Mark done & schedule next
                  </button>
                )
                : (
                  <button
                    onClick={markDone}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                  >
                    Mark done
                  </button>
                )
            )}
            <button onClick={() => onEdit(appt)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Edit
            </button>
            <button onClick={handleDelete} className="text-sm text-red-500 hover:underline">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ApptSection({
  title,
  appts,
  onMutate,
  onEdit,
  defaultOpen = true,
}: {
  title: string
  appts: Appointment[]
  onMutate: () => void
  onEdit: (a: Appointment) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (appts.length === 0) return null
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <span className="text-xs">{open ? '▾' : '▸'}</span>
        {title}
        <span className="font-normal text-gray-400">({appts.length})</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {appts.map(a => (
            <ApptRow key={a.id} appt={a} onMutate={onMutate} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppointmentsTab() {
  const { data: appointments = [], mutate } = useSWR<Appointment[]>('/api/appointments', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const active = appointments.filter(a => !a.done)
  const overdue = active.filter(a => a.date < today)
  const thisWeek = active.filter(a => a.date >= today && a.date <= in7)
  const upcoming = active.filter(a => a.date > in7)
  const done = appointments.filter(a => a.done)

  function closeModal() {
    setShowAdd(false)
    setEditing(null)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          + Add appointment
        </button>
      </div>

      {appointments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No appointments yet.</p>
      )}

      <ApptSection title="Overdue" appts={overdue} onMutate={mutate} onEdit={setEditing} />
      <ApptSection title="This week" appts={thisWeek} onMutate={mutate} onEdit={setEditing} />
      <ApptSection title="Upcoming" appts={upcoming} onMutate={mutate} onEdit={setEditing} />
      <ApptSection title="Done" appts={done} onMutate={mutate} onEdit={setEditing} defaultOpen={false} />

      {(showAdd || editing) && (
        <Modal title={editing ? 'Edit appointment' : 'New appointment'} onClose={closeModal}>
          <AppointmentForm
            initial={editing ?? undefined}
            onSave={() => { closeModal(); mutate() }}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}
