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
  selectMode,
  selected,
  onSelect,
}: {
  task: Task
  onMutate: () => void
  onEdit: (t: Task) => void
  selectMode: boolean
  selected: boolean
  onSelect: (id: number) => void
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
        recurring: task.recurring,
        recurringInterval: task.recurringInterval,
        blockedById: task.blockedById,
        lifeAreaId: task.lifeAreaId,
        tags: task.tags,
        projectId: task.projectId,
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

  function handleRowClick() {
    if (selectMode) {
      onSelect(task.id)
    } else {
      setExpanded(e => !e)
    }
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        selectMode && selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={handleRowClick}
      >
        {selectMode ? (
          <div
            className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
              selected
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {selected && <span className="text-white text-xs">✓</span>}
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); toggleDone() }}
            className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
              task.done
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
            }`}
          />
        )}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium truncate block ${
            task.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
          }`}>
            {task.title}
          </span>
          {(task.project || task.lifeArea || (task.tags && task.tags.length > 0)) && (
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {task.project && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium border"
                  style={{ borderColor: task.project.color, color: task.project.color }}
                >
                  {task.project.name}
                </span>
              )}
              {task.lifeArea && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: task.lifeArea.color }}
                >
                  {task.lifeArea.name}
                </span>
              )}
              {task.tags?.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
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
        {task.recurring && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0" title={`Repeats ${task.recurringInterval}`}>
            ↻
          </span>
        )}
        {task.blockedByTitle && (
          <span className="text-xs text-orange-500 shrink-0" title={`Blocked by: ${task.blockedByTitle}`}>
            🚫
          </span>
        )}
        {task.dueDate && (
          <span className="text-xs text-gray-400 shrink-0">{task.dueDate.slice(0, 10)}</span>
        )}
      </div>

      {!selectMode && expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          {task.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{task.notes}</p>
          )}
          {task.sourceLink && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
              Linked from: {task.sourceLink.sourceType === 'wishlist' ? 'Wishlist' : 'Goal'} #{task.sourceLink.sourceId}
            </p>
          )}
          {task.blockedByTitle && (
            <p className="text-xs text-orange-500 dark:text-orange-400 mb-3">
              🚫 Blocked by: {task.blockedByTitle}
            </p>
          )}

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

          <div className="flex gap-3 flex-wrap">
            <button onClick={() => onEdit(task)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Edit
            </button>
            <button onClick={handleDeleteTask} className="text-sm text-red-500 hover:underline">
              Delete
            </button>
            <button
              onClick={async () => {
                const base = task.dueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
                const next = new Date(base + 'T00:00:00')
                next.setDate(next.getDate() + 1)
                await fetch(`/api/tasks/${task.id}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...task, dueDate: next.toISOString().slice(0, 10) }),
                })
                onMutate()
              }}
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
            >
              Defer +1d
            </button>
            <button
              onClick={async () => {
                const base = task.dueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
                const next = new Date(base + 'T00:00:00')
                next.setDate(next.getDate() + 7)
                await fetch(`/api/tasks/${task.id}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...task, dueDate: next.toISOString().slice(0, 10) }),
                })
                onMutate()
              }}
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
            >
              Defer +1w
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
  selectMode,
  selectedIds,
  onSelect,
  defaultOpen = true,
}: {
  title: string
  tasks: Task[]
  onMutate: () => void
  onEdit: (t: Task) => void
  selectMode: boolean
  selectedIds: Set<number>
  onSelect: (id: number) => void
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
            <TaskRow
              key={t.id}
              task={t}
              onMutate={onMutate}
              onEdit={onEdit}
              selectMode={selectMode}
              selected={selectedIds.has(t.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TasksTab() {
  const { data: tasks = [], mutate } = useSWR<Task[]>('/api/tasks', fetcher)
  const { data: projects = [] } = useSWR<{ id: number; name: string; color: string; done: boolean }[]>('/api/projects', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [projectFilter, setProjectFilter] = useState<number | ''>('')
  const [tagFilter, setTagFilter] = useState<string>('')

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags))).sort()

  const active = tasks
    .filter(t => !t.done)
    .filter(t => projectFilter === '' || t.projectId === Number(projectFilter))
    .filter(t => tagFilter === '' || t.tags.includes(tagFilter))
  const overdue = active.filter(t => t.dueDate && t.dueDate.slice(0, 10) < today)
  const dueSoon = active.filter(
    t => t.dueDate && t.dueDate.slice(0, 10) >= today && t.dueDate.slice(0, 10) <= in7
  )
  const upcoming = active.filter(t => t.dueDate && t.dueDate.slice(0, 10) > in7)
  const noDate = active.filter(t => !t.dueDate)
  const done = tasks.filter(t => t.done)

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  async function bulkMarkDone() {
    const ids = Array.from(selectedIds)
    await fetch('/api/tasks/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markDone', ids }),
    })
    mutate()
    exitSelectMode()
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds)
    if (!confirm(`Delete ${ids.length} task${ids.length !== 1 ? 's' : ''}?`)) return
    await fetch('/api/tasks/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    })
    mutate()
    exitSelectMode()
  }

  function closeModal() {
    setShowAdd(false)
    setEditing(null)
  }

  const sectionProps = { onMutate: mutate, onEdit: setEditing, selectMode, selectedIds, onSelect: toggleSelect }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {selectedIds.size} selected
            </span>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={bulkMarkDone}
                  className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark done
                </button>
                <button
                  onClick={bulkDelete}
                  className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            )}
            <button
              onClick={exitSelectMode}
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 ml-auto"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectMode(true)}
                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Select
              </button>
              <select
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All projects</option>
                {projects.filter(p => !p.done).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {allTags.length > 0 && (
                <select
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value)}
                >
                  <option value="">All tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              + Add task
            </button>
          </>
        )}
      </div>

      {tasks.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No tasks yet. Add your first task!</p>
      )}

      <Section title="Overdue" tasks={overdue} defaultOpen {...sectionProps} />
      <Section title="Due soon (7 days)" tasks={dueSoon} defaultOpen {...sectionProps} />
      <Section title="Upcoming" tasks={upcoming} defaultOpen {...sectionProps} />
      <Section title="No due date" tasks={noDate} defaultOpen {...sectionProps} />
      <Section title="Done" tasks={done} defaultOpen={false} {...sectionProps} />

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
