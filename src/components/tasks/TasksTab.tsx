'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import TaskForm from './TaskForm'
import type { Task, Subtask } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRIORITY_COLOR: Record<string, string> = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

async function toggleSubtaskApi(subtask: Subtask) {
  await fetch(`/api/tasks/subtasks/${subtask.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: !subtask.done }),
  })
}

async function deleteSubtaskApi(id: number) {
  await fetch(`/api/tasks/subtasks/${id}`, { method: 'DELETE' })
}

async function addSubtaskApi(taskId: number, title: string) {
  await fetch(`/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

function TaskRow({
  task,
  onMutate,
  onEdit,
}: {
  task: Task
  onMutate: () => void
  onEdit: (t: Task) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newSub, setNewSub] = useState('')

  const doneCount = task.subtasks.filter(s => s.done).length
  const priorityColor = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.Medium

  async function toggleDone() {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
        category: task.category,
        notes: task.notes,
        done: !task.done,
      }),
    })
    onMutate()
  }

  async function handleDeleteTask() {
    if (!confirm('Delete this task?')) return
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    onMutate()
  }

  async function handleToggleSubtask(subtask: Subtask) {
    await toggleSubtaskApi(subtask)
    onMutate()
  }

  async function handleDeleteSubtask(id: number) {
    await deleteSubtaskApi(id)
    onMutate()
  }

  async function handleAddSubtask() {
    const t = newSub.trim()
    if (!t) return
    await addSubtaskApi(task.id, t)
    setNewSub('')
    onMutate()
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(e => !e)}
      >
        <button
          onClick={e => { e.stopPropagation(); toggleDone() }}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
            task.done
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          }`}
        />
        <span className={`flex-1 text-sm font-medium min-w-0 truncate ${
          task.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
        }`}>
          {task.title}
        </span>
        {task.subtasks.length > 0 && (
          <span className="text-xs text-gray-400 shrink-0">{doneCount}/{task.subtasks.length}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityColor}`}>
          {task.priority}
        </span>
        {task.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
            {task.category}
          </span>
        )}
        {task.dueDate && (
          <span className="text-xs text-gray-400 shrink-0">{task.dueDate.slice(0, 10)}</span>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          {task.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{task.notes}</p>
          )}
          {task.sourceLink && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
              Linked from: {task.sourceLink.sourceType === 'wishlist' ? 'Wishlist' : 'Goal'} #{task.sourceLink.sourceId}
            </p>
          )}

          {/* Subtasks */}
          <div className="flex flex-col gap-1.5 mb-3">
            {task.subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSubtask(s)}
                  className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-white transition-colors ${
                    s.done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                >
                  {s.done && <span className="text-xs leading-none">✓</span>}
                </button>
                <span className={`text-sm flex-1 ${s.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {s.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(s.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add subtask…"
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
            />
            <button
              onClick={handleAddSubtask}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Add
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => onEdit(task)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Edit
            </button>
            <button onClick={handleDeleteTask} className="text-sm text-red-500 hover:underline">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  tasks,
  onMutate,
  onEdit,
  defaultOpen = true,
}: {
  title: string
  tasks: Task[]
  onMutate: () => void
  onEdit: (t: Task) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (tasks.length === 0) return null
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <span className="text-xs">{open ? '▾' : '▸'}</span>
        {title}
        <span className="font-normal text-gray-400">({tasks.length})</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {tasks.map(t => (
            <TaskRow key={t.id} task={t} onMutate={onMutate} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TasksTab() {
  const { data: tasks = [], mutate } = useSWR<Task[]>('/api/tasks', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const active = tasks.filter(t => !t.done)
  const overdue = active.filter(t => t.dueDate && t.dueDate.slice(0, 10) < today)
  const dueSoon = active.filter(
    t => t.dueDate && t.dueDate.slice(0, 10) >= today && t.dueDate.slice(0, 10) <= in7
  )
  const upcoming = active.filter(t => t.dueDate && t.dueDate.slice(0, 10) > in7)
  const noDate = active.filter(t => !t.dueDate)
  const done = tasks.filter(t => t.done)

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
          + Add task
        </button>
      </div>

      {tasks.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No tasks yet. Add your first task!</p>
      )}

      <Section title="Overdue" tasks={overdue} onMutate={mutate} onEdit={setEditing} />
      <Section title="Due soon (7 days)" tasks={dueSoon} onMutate={mutate} onEdit={setEditing} />
      <Section title="Upcoming" tasks={upcoming} onMutate={mutate} onEdit={setEditing} />
      <Section title="No due date" tasks={noDate} onMutate={mutate} onEdit={setEditing} />
      <Section title="Done" tasks={done} onMutate={mutate} onEdit={setEditing} defaultOpen={false} />

      {(showAdd || editing) && (
        <Modal title={editing ? 'Edit task' : 'New task'} onClose={closeModal}>
          <TaskForm
            initial={editing ?? undefined}
            onSave={() => { closeModal(); mutate() }}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}
