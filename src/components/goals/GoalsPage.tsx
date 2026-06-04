'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import AreaDetail, { LifeArea, HabitRef, GoalForm, calcAreaProgress, useHabitLogs } from './AreaDetail'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

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
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add area'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function GoalsPage() {
  const { data: areas = [], mutate } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: allHabits = [] } = useSWR<HabitRef[]>('/api/habits', fetcher)
  const [expandedAreaId, setExpandedAreaId] = useState<number | null>(null)
  const [showAddArea, setShowAddArea] = useState(false)
  const [editingArea, setEditingArea] = useState<LifeArea | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const allLinkedHabitIds = useMemo(
    () => Array.from(new Set(areas.flatMap(a => a.goals.flatMap(g => g.habitLinks.map(l => l.habitId))))),
    [areas]
  )
  const habitLogs = useHabitLogs(allLinkedHabitIds)

  function buildGoalsPrompt(): string {
    const now = new Date()
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const areaLines = areas.map(area => {
      const goalLines = area.goals.map(goal => {
        const done = goal.milestones.filter(m => m.completedAt !== null).length
        const total = goal.milestones.length
        const milestonesStr = total > 0
          ? `Milestones: ${done}/${total} done` + '\n      ' + goal.milestones.map(m => `[${m.completedAt ? 'x' : ' '}] ${m.title}`).join('\n      ')
          : 'No milestones'
        const habitStr = goal.habitLinks.length > 0
          ? 'Habits: ' + goal.habitLinks.map(l => {
              const logs = habitLogs[l.habitId] ?? []
              const count = logs.filter(d => d.startsWith(monthPrefix)).length
              return `${l.habit.name} (${count}/${daysInMonth} days this month)`
            }).join(', ')
          : 'No linked habits'
        return `  Goal: ${goal.title} [${goal.timePeriod}]\n    ${milestonesStr}\n    ${habitStr}`
      }).join('\n')
      return `Area: ${area.name}\n${goalLines || '  No goals yet'}`
    }).join('\n\n')
    return `Here is my current goals snapshot as of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\n${areaLines}\n\nPlease analyse this snapshot. Identify which areas or goals are on track versus at risk, flag any goals with no milestones or habits backing them up, and suggest 2-3 concrete actions I should focus on this week to make the most progress.`
  }

  async function deleteArea(id: number) {
    if (!confirm('Delete this area and all its goals?')) return
    await fetch(`/api/life-areas/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
        <div className="flex gap-2">
          {areas.length > 0 && (
            <button onClick={() => setShowPrompt(true)} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Generate AI Prompt</button>
          )}
          <button onClick={() => setShowAddArea(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add area</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map(area => {
          const progress = calcAreaProgress(area, habitLogs)
          const pct = Math.round(progress * 100)
          const isExpanded = expandedAreaId === area.id
          return (
            <div key={area.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-4 cursor-pointer flex items-center gap-3" onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}>
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
              {isExpanded && <AreaDetail area={area} allHabits={allHabits} habitLogs={habitLogs} onMutate={mutate} />}
            </div>
          )
        })}
      </div>

      {areas.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No life areas yet. Add one to get started.</p>}

      {showAddArea && <Modal title="Add life area" onClose={() => setShowAddArea(false)}><AreaForm onSave={() => { setShowAddArea(false); mutate() }} onCancel={() => setShowAddArea(false)} /></Modal>}
      {editingArea && <Modal title="Edit life area" onClose={() => setEditingArea(null)}><AreaForm initial={editingArea} onSave={() => { setEditingArea(null); mutate() }} onCancel={() => setEditingArea(null)} /></Modal>}
      {showPrompt && <PromptModal title="Goals AI Prompt" prompt={buildGoalsPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
