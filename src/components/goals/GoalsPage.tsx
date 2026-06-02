'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface Habit { id: number; name: string; color: string }
interface GoalHabitLink { id: number; habitId: number; habit: Habit }
interface Milestone { id: number; goalId: number; title: string; completedAt: string | null }
interface Goal {
  id: number
  lifeAreaId: number
  title: string
  timePeriod: string
  notes: string | null
  milestones: Milestone[]
  habitLinks: GoalHabitLink[]
}
interface LifeArea { id: number; name: string; color: string; goals: Goal[] }

function calcProgress(goal: Goal, habitLogs: Record<number, string[]>): number {
  const total = goal.milestones.length
  const done = goal.milestones.filter(m => m.completedAt !== null).length
  const milestoneRate = total === 0 ? 0 : done / total

  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const habitRates = goal.habitLinks.map(link => {
    const logs = habitLogs[link.habitId] ?? []
    const monthLogs = logs.filter(d => d.startsWith(monthPrefix))
    return monthLogs.length / daysInMonth
  })
  const habitRate = habitRates.length === 0 ? null : habitRates.reduce((a, b) => a + b, 0) / habitRates.length

  if (total === 0 && habitRate === null) return 0
  if (total === 0) return habitRate!
  if (habitRate === null) return milestoneRate
  return milestoneRate * 0.6 + habitRate * 0.4
}

function calcAreaProgress(area: LifeArea, habitLogs: Record<number, string[]>): number {
  if (area.goals.length === 0) return 0
  const sum = area.goals.reduce((acc, g) => acc + calcProgress(g, habitLogs), 0)
  return sum / area.goals.length
}

function AreaForm({ initial, onSave, onCancel }: { initial?: LifeArea; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/life-areas/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
    } else {
      await fetch('/api/life-areas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Area name (e.g. Health, Career)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <div className="flex gap-2 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
            style={{ background: c }} />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add area'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

function GoalForm({ initial, areaId, onSave, onCancel }: { initial?: Goal; areaId: number; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [timePeriod, setTimePeriod] = useState(initial?.timePeriod ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (initial?.id) {
      await fetch(`/api/goals/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, timePeriod, notes: notes || null }),
      })
    } else {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifeAreaId: areaId, title, timePeriod, notes: notes || null }),
      })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input required value={timePeriod} onChange={e => setTimePeriod(e.target.value)} placeholder="Time period (e.g. 2026, Q2 2026)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add goal'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function GoalsPage() {
  const { data: areas = [], mutate } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: allHabits = [] } = useSWR<Habit[]>('/api/habits', fetcher)
  const [expandedAreaId, setExpandedAreaId] = useState<number | null>(null)
  const [showAddArea, setShowAddArea] = useState(false)
  const [editingArea, setEditingArea] = useState<LifeArea | null>(null)
  const [habitLogs] = useState<Record<number, string[]>>({})

  async function deleteArea(id: number) {
    if (!confirm('Delete this area and all its goals?')) return
    await fetch(`/api/life-areas/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
        <button onClick={() => setShowAddArea(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Add area
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map(area => {
          const progress = calcAreaProgress(area, habitLogs)
          const pct = Math.round(progress * 100)
          const isExpanded = expandedAreaId === area.id
          return (
            <div key={area.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div
                className="px-4 py-4 cursor-pointer flex items-center gap-3"
                onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: area.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{area.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{area.goals.length} goal{area.goals.length !== 1 ? 's' : ''} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: area.color }} />
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingArea(area)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => deleteArea(area.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? '▾' : '▸'}</span>
              </div>

              {isExpanded && (
                <AreaDetail area={area} allHabits={allHabits} onMutate={mutate} />
              )}
            </div>
          )
        })}
      </div>

      {areas.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No life areas yet. Add one to get started.</p>
      )}

      {showAddArea && <Modal title="Add life area" onClose={() => setShowAddArea(false)}><AreaForm onSave={() => { setShowAddArea(false); mutate() }} onCancel={() => setShowAddArea(false)} /></Modal>}
      {editingArea && <Modal title="Edit life area" onClose={() => setEditingArea(null)}><AreaForm initial={editingArea} onSave={() => { setEditingArea(null); mutate() }} onCancel={() => setEditingArea(null)} /></Modal>}
    </div>
  )
}

function GoalRow({ goal, allHabits, onMutate }: { goal: Goal; allHabits: Habit[]; onMutate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [showLinkHabit, setShowLinkHabit] = useState(false)

  const total = goal.milestones.length
  const done = goal.milestones.filter(m => m.completedAt !== null).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  async function toggleMilestone(m: Milestone) {
    await fetch(`/api/milestones/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedAt: m.completedAt ? null : new Date().toISOString() }),
    })
    onMutate()
  }

  async function deleteMilestone(id: number) {
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    onMutate()
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newMilestone.trim()) return
    await fetch(`/api/goals/${goal.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newMilestone.trim() }),
    })
    setNewMilestone('')
    setAddingMilestone(false)
    onMutate()
  }

  async function linkHabit(habitId: number) {
    await fetch(`/api/goals/${goal.id}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId }),
    })
    setShowLinkHabit(false)
    onMutate()
  }

  async function unlinkHabit(linkId: number) {
    await fetch(`/api/goal-habits/${linkId}`, { method: 'DELETE' })
    onMutate()
  }

  const linkedHabitIds = new Set(goal.habitLinks.map(l => l.habitId))
  const unlinkableHabits = allHabits.filter(h => !linkedHabitIds.has(h.id))

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{goal.title}</span>
          <span className="ml-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-1.5 py-0.5 rounded">{goal.timePeriod}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{pct}%</span>
        <span className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-l-2 ml-4" style={{ borderColor: 'transparent' }}>
          {/* Milestones */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Milestones</p>
            <div className="flex flex-col gap-1.5">
              {goal.milestones.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMilestone(m)}
                    className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${m.completedAt ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}
                  >
                    {m.completedAt && <span className="text-white text-xs">✓</span>}
                  </button>
                  <span className={`text-sm flex-1 ${m.completedAt ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{m.title}</span>
                  <button onClick={() => deleteMilestone(m.id)} className="text-xs text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400">×</button>
                </div>
              ))}
            </div>
            {addingMilestone ? (
              <form onSubmit={addMilestone} className="flex gap-2 mt-2">
                <input
                  autoFocus
                  value={newMilestone}
                  onChange={e => setNewMilestone(e.target.value)}
                  placeholder="Milestone title"
                  className="flex-1 text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
                <button type="submit" className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                <button type="button" onClick={() => setAddingMilestone(false)} className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
              </form>
            ) : (
              <button onClick={() => setAddingMilestone(true)} className="mt-2 text-xs text-blue-500 hover:text-blue-600">+ Add milestone</button>
            )}
          </div>

          {/* Linked habits */}
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
                  {unlinkableHabits.length === 0 ? (
                    <p className="text-xs text-gray-400 px-1">All habits already linked</p>
                  ) : (
                    unlinkableHabits.map(h => (
                      <button key={h.id} onClick={() => linkHabit(h.id)}
                        className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
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
    </div>
  )
}

function AreaDetail({ area, allHabits, onMutate }: { area: LifeArea; allHabits: Habit[]; onMutate: () => void }) {
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
          <GoalRow goal={goal} allHabits={allHabits} onMutate={onMutate} />
          <div className="absolute top-2.5 right-10 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditingGoal(goal)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900">Edit</button>
            <button onClick={() => deleteGoal(goal.id)} className="text-xs px-1.5 py-0.5 text-red-400 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 bg-white dark:bg-gray-900">Del</button>
          </div>
        </div>
      ))}
      {area.goals.length === 0 && (
        <p className="text-sm text-gray-400 px-4 py-3">No goals yet.</p>
      )}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
        <button onClick={() => setShowAddGoal(true)} className="text-sm text-blue-500 hover:text-blue-600">+ Add goal</button>
      </div>
      {showAddGoal && (
        <Modal title="Add goal" onClose={() => setShowAddGoal(false)}>
          <GoalForm areaId={area.id} onSave={() => { setShowAddGoal(false); onMutate() }} onCancel={() => setShowAddGoal(false)} />
        </Modal>
      )}
      {editingGoal && (
        <Modal title="Edit goal" onClose={() => setEditingGoal(null)}>
          <GoalForm initial={editingGoal} areaId={area.id} onSave={() => { setEditingGoal(null); onMutate() }} onCancel={() => setEditingGoal(null)} />
        </Modal>
      )}
    </div>
  )
}
