'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/tasks/TaskForm'

export default function QuickCapture() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Quick capture (N)"
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl font-light z-40 transition-colors"
      >
        +
      </button>
      {open && (
        <Modal title="Quick capture" onClose={() => setOpen(false)}>
          <TaskForm
            onSave={() => { setOpen(false); mutate('/api/tasks') }}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  )
}
