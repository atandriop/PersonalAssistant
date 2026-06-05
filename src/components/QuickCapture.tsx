'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/tasks/TaskForm'
import AppointmentForm from '@/components/tasks/AppointmentForm'
import WishlistForm from '@/components/wishlist/WishlistForm'

type CaptureType = 'task' | 'appointment' | 'wishlist' | null

const TYPES = [
  { id: 'task' as const,        label: 'Task',          color: 'bg-indigo-600 hover:bg-indigo-700' },
  { id: 'appointment' as const, label: 'Appointment',   color: 'bg-blue-600 hover:bg-blue-700' },
  { id: 'wishlist' as const,    label: 'Wishlist Item', color: 'bg-purple-600 hover:bg-purple-700' },
]

export default function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<CaptureType>(null)

  function openModal() {
    setType(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setType(null)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return
      const isN = e.key === 'n' || e.key === 'N'
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key === 'k'
      if (isN || isCmdK) {
        e.preventDefault()
        openModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeType = TYPES.find(t => t.id === type)

  return (
    <>
      <button
        onClick={openModal}
        title="Quick capture (N or Ctrl+K)"
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl font-light z-40 transition-colors"
      >
        +
      </button>
      {open && (
        <Modal
          title={activeType ? `New ${activeType.label}` : 'Quick capture'}
          onClose={close}
        >
          {type === null && (
            <div className="flex flex-col gap-3 py-2">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`w-full py-3 rounded-lg text-white font-medium text-sm ${t.color} transition-colors`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {type !== null && (
            <div>
              <button
                onClick={() => setType(null)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 flex items-center gap-1"
              >
                ← Back
              </button>
              {type === 'task' && (
                <TaskForm
                  onSave={() => { close(); mutate('/api/tasks') }}
                  onCancel={close}
                />
              )}
              {type === 'appointment' && (
                <AppointmentForm
                  onSave={() => { close(); mutate('/api/appointments') }}
                  onCancel={close}
                />
              )}
              {type === 'wishlist' && (
                <WishlistForm
                  onSave={() => { close(); mutate('/api/wishlist') }}
                  onCancel={close}
                />
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
