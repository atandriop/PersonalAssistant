'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/tasks/TaskForm'

// ---- Types (exported for consumers) ----

export interface HabitRef { id: number; name: string; color: string }
export interface GoalHabitLink { id: number; habitId: number; habit: HabitRef }
export interface Milestone {
  id: number
  goalId: number
  title: string
  completedAt: string | null
  targetDate?: string | null
}
export interface Goal {
  id: number
  lifeAreaId: number
  title: string
  timePeriod: string
  notes: string | null
  milestones: Milestone[]
  habitLinks: GoalHabitLink[]
}
export interface LifeArea {
  id: number
  name: string
  color: string
  goals: Goal[]
}

// ---- Helpers (exported for consumers) ----

export function parseTimePeriod(tp: string): { start: Date; end: Date } | null {
  const y = tp.match(/^(\d{4})$/)
  if (y) return { start: new Date(`${y[1]}-01-01`), end: new Date(`${y[1]}-12-31`) }
  const q = tp.match(/^Q([1-4])\s+(\d{4})$/i)
  if (q) {
    const qn = Number(q[1]); const yr = Number(q[2])
    const sm = (qn - 1) * 3
    return { start: new Date(yr, sm, 1), end: new Date(yr, sm + 3, 0) }
  }
  const h = tp.match(/^H([12])\s+(\d{4})$/i)
  if (h) {
    const hn = Number(h[1]); const yr = Number(h[2])
    return { start: new Date(yr, hn === 1 ? 0 : 6, 1), end: new Date(yr, hn === 1 ? 5 : 11, hn === 1 ? 30 : 31) }
  }
  return null
}

export function calcProgress(goal: Goal, habitLogs: Record<number, string[]>): number {
  const total = goal.milestones.length
  const done = goal.milestones.filter(m => m.completedAt !== null).length
  const milestoneRate = total === 0 ? 0 : done / total
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const habitRates = goal.habitLinks.map(link => {
    const logs = habitLogs[link.habitId] ?? []
    return logs.filter(d => d.startsWith(monthPrefix)).length / daysInMonth
  })
  const habitRate = habitRates.length === 0 ? null : habitRates.reduce((a, b) => a + b, 0) / habitRates.length
  if (total === 0 && habitRate === null) return 0
  if (total === 0) return habitRate!
  if (habitRate === null) return milestoneRate
  return milestoneRate * 0.6 + habitRate * 0.4
}

export function calcAreaProgress(area: LifeArea, habitLogs: Record<number, string[]>): number {
  if (area.goals.length === 0) return 0
  return area.goals.reduce((acc, g) => acc + calcProgress(g, habitLogs), 0) / area.goals.length
}

export function useHabitLogs(habitIds: number[]): Record<number, string[]> {
  const [logs, setLogs] = useState<Record<number, string[]>>({})
  useEffect(() => {
    if (habitIds.length === 0) return
    Promise.allSettled(
      habitIds.map(id =>
        fetch(`/api/habits/${id}/logs`)
          .then(r => r.json())
          .then((ls: { date: string }[]) => ({ id, dates: ls.map(l => l.date) }))
      )
    ).then(results => {
      const map: Record<number, string[]> = {}
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.dates })
      setLogs(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitIds.join(',')])
  return logs
}

// ---- GoalForm ----

export function GoalForm({ initial, areaId, onSave, onCancel }: {
  initial?: Goal; areaId: number; onSave: () => void; onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [timePeriod, setTimePeriod] = useState(initial?.timePeriod ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/goals/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, timePeriod, notes: notes || null }) })
    } else {
      await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lifeAreaId: areaId, title, timePeriod, notes: notes || null }) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input required value={timePeriod} onChange={e => setTimePeriod(e.target.value)} placeholder="Time period (e.g. 2026, Q2 2026)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add goal'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ---- GoalRow ----

function GoalRow({ goal, allHabits, habitLogs, onMutate }: {
  goal: Goal; allHabits: HabitRef[]; habitLogs: Record<number, string[]>; onMutate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [showLinkHabit, setShowLinkHabit] = useState(false)
  const [addToTask, setAddToTask] = useState<{ title: string; goalId: number } | null>(null)

  const pct = Math.round(calcProgress(goal, habitLogs) * 100)
  const now = new Date()
  const period = parseTimePeriod(goal.timePeriod)
  const timeElapsedPct = period
    ? Math.min(100, Math.max(0, Math.round(((now.getTime() - period.start.getTime()) / (period.end.getTime() - period.start.getTime())) * 100)))
    : null
  const isOverdue = period ? now > period.end : false

  async function toggleMilestone(m: Milestone) {
    await fetch(`/api/milestones/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completedAt: m.completedAt ? null : new Date().toISOString() }) })
    onMutate()
  }

  async function deleteMilestone(id: number) {
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    onMutate()
  }

  async function addMilestones(e: React.FormEvent) {
    e.preventDefault()
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    await Promise.all(lines.map(line => {
      const parts = line.split(' | ')
      const title = parts[0].trim()
      const targetDate = parts[1]?.trim() || null
      return fetch(`/api/goals/${goal.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, targetDate }),
      })
    }))
    setBulkText('')
    setAddingMilestone(false)
    onMutate()
  }

  async function linkHabit(habitId: number) {
    await fetch(`/api/goals/${goal.id}/habits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habitId }) })
    setShowLinkHabit(false); onMutate()
  }

  async function unlinkHabit(linkId: number) {
    await fetch(`/api/goal-habits/${linkId}`, { method: 'DELETE' })
    onMutate()
  }

  const linkedHabitIds = new Set(goal.habitLinks.map(l => l.habitId))
  const linkableHabits = allHabits.filter(h => !linkedHabitIds.has(h.id))

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{goal.title}</span>
          <span className="ml-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{goal.timePeriod}</span>
          {timeElapsedPct !== null && (
            <div className="mt-1.5">
              <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                <span>Time elapsed</span>
                <span className={isOverdue ? 'text-red-500' : ''}>{timeElapsedPct}%</span>
              </div>
              <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isOverdue ? 'bg-red-400' : timeElapsedPct > 75 ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-500'}`} style={{ width: `${timeElapsedPct}%` }} />
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{pct}%</span>
        <span className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-l-2 ml-4" style={{ borderColor: 'transparent' }}>
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Milestones</p>
            <div className="flex flex-col gap-1.5">
              {goal.milestones.map(m => {
                const today = new Date().toISOString().slice(0, 10)
                const overdue = !m.completedAt && m.targetDate && m.targetDate < today
                const daysLeft = m.targetDate && !m.completedAt
                  ? Math.round((new Date(m.targetDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
                  : null
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <button onClick={() => toggleMilestone(m)} className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${m.completedAt ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}>
                      {m.completedAt && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className={`text-sm flex-1 ${m.completedAt ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{m.title}</span>
                    {daysLeft !== null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${overdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {overdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'today' : `${daysLeft}d`}
                      </span>
                    )}
                    <button onClick={() => setAddToTask({ title: m.title, goalId: m.goalId })} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-2">+ Task</button>
                    <button onClick={() => deleteMilestone(m.id)} className="text-xs text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400">×</button>
                  </div>
                )
              })}
            </div>
            {addingMilestone ? (
              <form onSubmit={addMilestones} className="flex flex-col gap-1.5 mt-2">
                <textarea
                  autoFocus
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={"One milestone per line\n90kg\n85kg | 2026-09-01"}
                  rows={4}
                  className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none w-full"
                />
                <div className="flex gap-1">
                  <button type="submit" className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                  <button type="button" onClick={() => { setAddingMilestone(false); setBulkText('') }} className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setAddingMilestone(true)} className="mt-2 text-xs text-blue-500 hover:text-blue-600">+ Add milestone</button>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Linked habits</p>
            <div className="flex flex-wrap gap-2">
              {goal.habitLinks.map(link => (
                <span key={link.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white" style={{ background: link.habit.color }}>
                  {link.habit.name}
                  <button onClick={() => unlinkHabit(link.id)} className="opacity-70 hover:opacity-100 ml-0.5">×</button>
                </span>
              ))}
              {showLinkHabit ? (
                <div className="flex flex-col gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2 shadow-sm">
                  {linkableHabits.length === 0 ? (
                    <p className="text-xs text-gray-400 px-1">All habits already linked</p>
                  ) : (
                    linkableHabits.map(h => (
                      <button key={h.id} onClick={() => linkHabit(h.id)} className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: h.color }} />
                        {h.name}
                      </button>
                    ))
                  )}
                  <button onClick={() => setShowLinkHabit(false)} className="text-xs text-gray-400 mt-1 hover:text-gray-600">Close</button>
                </div>
              ) : (
                <button onClick={() => setShowLinkHabit(true)} className="text-xs text-blue-500 hover:text-blue-600">+ Link habit</button>
              )}
            </div>
          </div>
        </div>
      )}
      {addToTask && (
        <Modal title="Add to Tasks" onClose={() => setAddToTask(null)}>
          <TaskForm preTitle={addToTask.title} preSourceLink={{ sourceType: 'goal', sourceId: addToTask.goalId }} onSave={() => setAddToTask(null)} onCancel={() => setAddToTask(null)} />
        </Modal>
      )}
    </div>
  )
}

// ---- AreaDetail (default export) ----

export default function AreaDetail({ area, allHabits, habitLogs, onMutate }: {
  area: LifeArea; allHabits: HabitRef[]; habitLogs: Record<number, string[]>; onMutate: () => void
}) {
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  async function deleteGoal(id: number) {
    if (!confirm('Delete this goal and all its milestones?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    onMutate()
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700">
      {area.goals.map(goal => (
        <div key={goal.id} className="relative group">
          <GoalRow goal={goal} allHabits={allHabits} habitLogs={habitLogs} onMutate={onMutate} />
          <div className="absolute top-2.5 right-10 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditingGoal(goal)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900">Edit</button>
            <button onClick={() => deleteGoal(goal.id)} className="text-xs px-1.5 py-0.5 text-red-400 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 bg-white dark:bg-gray-900">Del</button>
          </div>
        </div>
      ))}
      {area.goals.length === 0 && <p className="text-sm text-gray-400 px-4 py-3">No goals yet.</p>}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
        <button onClick={() => setShowAddGoal(true)} className="text-sm text-blue-500 hover:text-blue-600">+ Add goal</button>
      </div>
      {showAddGoal && <Modal title="Add goal" onClose={() => setShowAddGoal(false)}><GoalForm areaId={area.id} onSave={() => { setShowAddGoal(false); onMutate() }} onCancel={() => setShowAddGoal(false)} /></Modal>}
      {editingGoal && <Modal title="Edit goal" onClose={() => setEditingGoal(null)}><GoalForm initial={editingGoal} areaId={area.id} onSave={() => { setEditingGoal(null); onMutate() }} onCancel={() => setEditingGoal(null)} /></Modal>}
    </div>
  )
}
