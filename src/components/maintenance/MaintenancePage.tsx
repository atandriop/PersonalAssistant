'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface MaintenanceTask {
  id: number
  homeItemId: number
  description: string
  intervalMonths: number | null
  dueDate: string | null
  lastDoneDate: string | null
  createdAt: string
}

interface MaintenanceLog {
  id: number
  homeItemId: number
  description: string
  date: string
  cost: number | null
  notes: string | null
}

interface HomeItem {
  id: number
  name: string
  notes: string | null
  tasks: MaintenanceTask[]
  logs: MaintenanceLog[]
  createdAt: string
}

type TaskStatus = 'overdue' | 'due-soon' | 'ok' | 'none'

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function getTaskStatus(task: MaintenanceTask): { status: TaskStatus; nextDue: string | null } {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let nextDue: string | null = null
  if (task.intervalMonths != null) {
    const base = task.lastDoneDate ?? task.createdAt.slice(0, 10)
    nextDue = addMonths(base, task.intervalMonths)
  } else if (task.dueDate != null) {
    nextDue = task.dueDate
  }

  if (!nextDue) return { status: 'none', nextDue: null }
  if (nextDue < today) return { status: 'overdue', nextDue }
  if (nextDue <= in30) return { status: 'due-soon', nextDue }
  return { status: 'ok', nextDue }
}

function getItemStatus(item: HomeItem): TaskStatus {
  if (item.tasks.length === 0) return 'none'
  const statuses = item.tasks.map(t => getTaskStatus(t).status)
  if (statuses.includes('overdue')) return 'overdue'
  if (statuses.includes('due-soon')) return 'due-soon'
  if (statuses.every(s => s === 'ok')) return 'ok'
  return 'none'
}

const STATUS_BORDER: Record<TaskStatus, string> = {
  overdue: 'border-red-500',
  'due-soon': 'border-amber-500',
  ok: 'border-green-500',
  none: 'border-gray-200 dark:border-gray-700',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  overdue: 'text-red-500',
  'due-soon': 'text-amber-500',
  ok: 'text-green-600 dark:text-green-400',
  none: 'text-gray-400',
}

// ─── Item form ────────────────────────────────────────────────────────────
function ItemForm({ initial, onSave, onCancel }: { initial?: HomeItem; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/maintenance/items/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, notes: notes || null }) })
    } else {
      await fetch('/api/maintenance/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, notes: notes || null }) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Item name (e.g. Boiler, Car)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add item'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ─── Task form ────────────────────────────────────────────────────────────
function TaskForm({ itemId, initial, onSave, onCancel }: { itemId: number; initial?: MaintenanceTask; onSave: () => void; onCancel: () => void }) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [type, setType] = useState<'recurring' | 'once'>(initial?.intervalMonths != null ? 'recurring' : 'once')
  const [intervalMonths, setIntervalMonths] = useState(initial?.intervalMonths?.toString() ?? '12')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      description,
      intervalMonths: type === 'recurring' ? Number(intervalMonths) : null,
      dueDate: type === 'once' ? dueDate : null,
      lastDoneDate: initial?.lastDoneDate ?? null,
    }
    if (initial?.id) {
      await fetch(`/api/maintenance/tasks/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch(`/api/maintenance/items/${itemId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={description} onChange={e => setDescription(e.target.value)} placeholder="Task description (e.g. Annual service)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setType('recurring')} className={`flex-1 py-2 text-sm rounded-lg border ${type === 'recurring' ? 'bg-blue-600 text-white border-blue-600' : 'dark:border-gray-600 dark:text-gray-300'}`}>Recurring</button>
        <button type="button" onClick={() => setType('once')} className={`flex-1 py-2 text-sm rounded-lg border ${type === 'once' ? 'bg-blue-600 text-white border-blue-600' : 'dark:border-gray-600 dark:text-gray-300'}`}>One-off</button>
      </div>
      {type === 'recurring' ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Every</span>
          <input required type="number" min="1" value={intervalMonths} onChange={e => setIntervalMonths(e.target.value)} className="w-20 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          <span className="text-sm text-gray-600 dark:text-gray-400">months</span>
        </div>
      ) : (
        <input required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add task'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ─── Log form ─────────────────────────────────────────────────────────────
function LogForm({ itemId, prefillDescription, onSave, onCancel }: { itemId: number; prefillDescription?: string; onSave: () => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [description, setDescription] = useState(prefillDescription ?? '')
  const [date, setDate] = useState(today)
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/maintenance/items/${itemId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, date, cost: cost ? Number(cost) : null, notes: notes || null }),
    })
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (e.g. Annual service)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost (optional)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">Save log</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ─── Mark done form ───────────────────────────────────────────────────────
function MarkDoneForm({ task, onSave, onCancel }: { task: MaintenanceTask; onSave: (date: string) => void; onCancel: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">Logging <strong>{task.description}</strong> as done on:</p>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(date)} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700">Confirm</button>
        <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

// ─── Item detail (expanded card content) ─────────────────────────────────
function ItemDetail({ item, onMutate }: { item: HomeItem; onMutate: () => void }) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null)
  const [markingDoneTask, setMarkingDoneTask] = useState<MaintenanceTask | null>(null)
  const [showAddLog, setShowAddLog] = useState(false)

  async function deleteTask(id: number) {
    await fetch(`/api/maintenance/tasks/${id}`, { method: 'DELETE' })
    onMutate()
  }

  async function deleteLog(id: number) {
    await fetch(`/api/maintenance/logs/${id}`, { method: 'DELETE' })
    onMutate()
  }

  async function handleMarkDone(task: MaintenanceTask, logDate: string) {
    await Promise.all([
      fetch(`/api/maintenance/items/${item.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: task.description, date: logDate }),
      }),
      fetch(`/api/maintenance/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: task.description, intervalMonths: task.intervalMonths, dueDate: task.dueDate, lastDoneDate: logDate }),
      }),
    ])
    setMarkingDoneTask(null)
    onMutate()
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3">
      {/* Tasks section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Scheduled tasks</p>
          <button onClick={() => setShowAddTask(true)} className="text-xs text-blue-500 hover:text-blue-600">+ Add task</button>
        </div>
        {item.tasks.length === 0 && <p className="text-sm text-gray-400">No tasks yet.</p>}
        {item.tasks.map(task => {
          const { status, nextDue } = getTaskStatus(task)
          return (
            <div key={task.id} className="flex items-center gap-2 py-1.5 group border-b border-gray-50 dark:border-gray-800 last:border-0">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900 dark:text-white">{task.description}</span>
                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">
                  {task.intervalMonths != null ? `every ${task.intervalMonths}mo` : task.dueDate}
                </span>
                {nextDue && (
                  <span className={`ml-1 text-xs ${STATUS_LABEL[status]}`}>
                    · {status === 'overdue' ? 'overdue' : `due ${nextDue}`}
                  </span>
                )}
              </div>
              <button onClick={() => setMarkingDoneTask(task)} className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 shrink-0">✓ Done</button>
              <div className="hidden group-hover:flex gap-1 shrink-0">
                <button onClick={() => setEditingTask(task)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                <button onClick={() => deleteTask(task.id)} className="text-xs px-1.5 py-0.5 text-red-400 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Log history section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Log history</p>
          <button onClick={() => setShowAddLog(true)} className="text-xs text-blue-500 hover:text-blue-600">+ Log</button>
        </div>
        {item.logs.length === 0 && <p className="text-sm text-gray-400">No logs yet.</p>}
        {item.logs.map(log => (
          <div key={log.id} className="flex items-center gap-2 py-1 group border-b border-gray-50 dark:border-gray-800 last:border-0">
            <span className="text-xs text-gray-400 shrink-0 w-20">{log.date}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{log.description}</span>
            {log.cost != null && <span className="text-xs text-gray-400">€{log.cost}</span>}
            <button onClick={() => deleteLog(log.id)} className="hidden group-hover:block text-xs text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400">×</button>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showAddTask && <Modal title="Add task" onClose={() => setShowAddTask(false)}><TaskForm itemId={item.id} onSave={() => { setShowAddTask(false); onMutate() }} onCancel={() => setShowAddTask(false)} /></Modal>}
      {editingTask && <Modal title="Edit task" onClose={() => setEditingTask(null)}><TaskForm itemId={item.id} initial={editingTask} onSave={() => { setEditingTask(null); onMutate() }} onCancel={() => setEditingTask(null)} /></Modal>}
      {markingDoneTask && (
        <Modal title="Mark as done" onClose={() => setMarkingDoneTask(null)}>
          <MarkDoneForm task={markingDoneTask} onSave={(date) => handleMarkDone(markingDoneTask, date)} onCancel={() => setMarkingDoneTask(null)} />
        </Modal>
      )}
      {showAddLog && <Modal title="Log maintenance" onClose={() => setShowAddLog(false)}><LogForm itemId={item.id} onSave={() => { setShowAddLog(false); onMutate() }} onCancel={() => setShowAddLog(false)} /></Modal>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const { data: items = [], mutate } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<HomeItem | null>(null)

  async function deleteItem(id: number) {
    if (!confirm('Delete this item and all its tasks and logs?')) return
    await fetch(`/api/maintenance/items/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
        <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add item</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => {
          const status = getItemStatus(item)
          const isExpanded = expandedId === item.id
          const mostUrgentTask = item.tasks
            .map(t => ({ task: t, ...getTaskStatus(t) }))
            .sort((a, b) => {
              const order: TaskStatus[] = ['overdue', 'due-soon', 'ok', 'none']
              return order.indexOf(a.status) - order.indexOf(b.status)
            })[0]
          const lastLog = item.logs[0]

          return (
            <div key={item.id} className={`bg-white dark:bg-gray-900 border-2 ${STATUS_BORDER[status]} rounded-xl overflow-hidden`}>
              <div className="px-4 py-4 cursor-pointer flex items-center gap-3" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.name}</span>
                    <span className="text-gray-400 text-sm ml-2">{isExpanded ? '▾' : '▸'}</span>
                  </div>
                  {mostUrgentTask ? (
                    <p className={`text-xs ${STATUS_LABEL[mostUrgentTask.status]}`}>
                      {mostUrgentTask.task.description}
                      {mostUrgentTask.nextDue && ` · ${mostUrgentTask.status === 'overdue' ? 'overdue' : `due ${mostUrgentTask.nextDue}`}`}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">No scheduled tasks</p>
                  )}
                  {lastLog && <p className="text-xs text-gray-400 mt-0.5">Last: {lastLog.date}</p>}
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditing(item)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => deleteItem(item.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
              </div>
              {isExpanded && <ItemDetail item={item} onMutate={mutate} />}
            </div>
          )
        })}
      </div>

      {items.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No items yet. Add one to start tracking maintenance.</p>}

      {showAdd && <Modal title="Add item" onClose={() => setShowAdd(false)}><ItemForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit item" onClose={() => setEditing(null)}><ItemForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
    </div>
  )
}
