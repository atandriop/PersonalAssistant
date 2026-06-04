'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import AreaDetail, { LifeArea, HabitRef, calcAreaProgress, useHabitLogs } from '@/components/goals/AreaDetail'
import HabitRow, { Habit } from '@/components/habits/HabitRow'
import HabitForm, { PRESET_COLORS } from '@/components/habits/HabitForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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

export default function LifePage() {
  const { data: areas = [], mutate: mutateAreas } = useSWR<LifeArea[]>('/api/life-areas', fetcher)
  const { data: allHabits = [], mutate: mutateHabits } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: archivedHabits = [], mutate: mutateArchived } = useSWR<Habit[]>('/api/habits?archived=true', fetcher)

  const [collapsedAreaIds, setCollapsedAreaIds] = useState<Set<number>>(new Set())
  const [showAddArea, setShowAddArea] = useState(false)
  const [editingArea, setEditingArea] = useState<LifeArea | null>(null)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [addingHabitToArea, setAddingHabitToArea] = useState<number | null>(null)
  const [showUnassigned, setShowUnassigned] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  const habitsByArea = useMemo(() => {
    const map = new Map<number, Habit[]>()
    for (const h of allHabits) {
      if (h.lifeAreaId != null) {
        if (!map.has(h.lifeAreaId)) map.set(h.lifeAreaId, [])
        map.get(h.lifeAreaId)!.push(h)
      }
    }
    return map
  }, [allHabits])

  const unassignedHabits = useMemo(() => allHabits.filter(h => h.lifeAreaId == null), [allHabits])

  const allLinkedHabitIds = useMemo(
    () => Array.from(new Set(areas.flatMap(a => a.goals.flatMap(g => g.habitLinks.map(l => l.habitId))))),
    [areas]
  )
  const habitLogs = useHabitLogs(allLinkedHabitIds)

  const allHabitsAsRef: HabitRef[] = useMemo(
    () => allHabits.map(h => ({ id: h.id, name: h.name, color: h.color })),
    [allHabits]
  )

  function mutateAll() { mutateAreas(); mutateHabits(); mutateArchived() }

  async function deleteArea(id: number) {
    if (!confirm('Delete this area and all its goals?')) return
    await fetch(`/api/life-areas/${id}`, { method: 'DELETE' })
    mutateAreas()
  }

  async function deleteHabit(id: number) {
    if (!confirm('Delete this habit and all its history?')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    mutateHabits(); mutateArchived()
  }

  async function archiveHabit(id: number) {
    if (!confirm('Archive this habit? You can restore it later from the Archived section.')) return
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) })
    mutateHabits(); mutateArchived()
  }

  async function restoreHabit(id: number) {
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) })
    mutateHabits(); mutateArchived()
  }

  function buildPrompt(): string {
    const now = new Date()
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const areaLines = areas.map(area => {
      const goalLines = area.goals.map(goal => {
        const done = goal.milestones.filter(m => m.completedAt !== null).length
        const total = goal.milestones.length
        const milestonesStr = total > 0
          ? `Milestones: ${done}/${total} done\n      ` + goal.milestones.map(m => `[${m.completedAt ? 'x' : ' '}] ${m.title}`).join('\n      ')
          : 'No milestones'
        const habitStr = goal.habitLinks.length > 0
          ? 'Habits: ' + goal.habitLinks.map(l => {
              const logs = habitLogs[l.habitId] ?? []
              return `${l.habit.name} (${logs.filter(d => d.startsWith(monthPrefix)).length}/${daysInMonth} days this month)`
            }).join(', ')
          : 'No linked habits'
        return `  Goal: ${goal.title} [${goal.timePeriod}]\n    ${milestonesStr}\n    ${habitStr}`
      }).join('\n')
      const areaHabits = (habitsByArea.get(area.id) ?? []).map(h => `  - Habit: ${h.name}`).join('\n')
      return `Area: ${area.name}\n${goalLines || '  No goals yet'}${areaHabits ? '\n' + areaHabits : ''}`
    }).join('\n\n')
    return `Here is my current life snapshot as of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\n${areaLines}\n\nPlease analyse this snapshot. Identify which areas or goals are on track versus at risk, flag goals with no milestones or habits backing them up, and suggest 2-3 concrete actions to focus on this week.`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Life</h1>
        <div className="flex gap-2">
          {(areas.length > 0 || allHabits.length > 0) && (
            <button onClick={() => setShowPrompt(true)} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Generate AI Prompt</button>
          )}
          <button onClick={() => setShowAddArea(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add area</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map(area => {
          const progress = calcAreaProgress(area, habitLogs)
          const pct = Math.round(progress * 100)
          const isExpanded = !collapsedAreaIds.has(area.id)
          const areaHabits = habitsByArea.get(area.id) ?? []

          return (
            <div key={area.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-4 cursor-pointer flex items-center gap-3" onClick={() => setCollapsedAreaIds(prev => { const next = new Set(prev); next.has(area.id) ? next.delete(area.id) : next.add(area.id); return next })}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: area.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{area.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {area.goals.length} goal{area.goals.length !== 1 ? 's' : ''} · {areaHabits.length} habit{areaHabits.length !== 1 ? 's' : ''} · {pct}%
                    </span>
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
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <p className="px-4 pt-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Goals</p>
                  <AreaDetail area={area} allHabits={allHabitsAsRef} habitLogs={habitLogs} onMutate={mutateAreas} />

                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Habits</p>
                    <div className="px-3 pb-2 flex flex-col gap-2">
                      {areaHabits.map(h => (
                        <HabitRow key={h.id} habit={h} onEdit={() => setEditingHabit(h)} onDelete={() => deleteHabit(h.id)} onArchive={() => archiveHabit(h.id)} />
                      ))}
                      {areaHabits.length === 0 && <p className="text-sm text-gray-400 py-1 px-1">No habits in this area yet.</p>}
                    </div>
                    <div className="px-4 pb-3">
                      <button onClick={() => setAddingHabitToArea(area.id)} className="text-sm text-blue-500 hover:text-blue-600">+ Add habit</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {areas.length === 0 && unassignedHabits.length === 0 && archivedHabits.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No life areas yet. Add one to get started.</p>
      )}

      {unassignedHabits.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowUnassigned(v => !v)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <span>{showUnassigned ? '▾' : '▸'}</span>
            Unassigned habits ({unassignedHabits.length})
          </button>
          {showUnassigned && (
            <div className="flex flex-col gap-2 mt-2">
              {unassignedHabits.map(h => (
                <HabitRow key={h.id} habit={h} onEdit={() => setEditingHabit(h)} onDelete={() => deleteHabit(h.id)} onArchive={() => archiveHabit(h.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {archivedHabits.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowArchived(v => !v)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <span>{showArchived ? '▾' : '▸'}</span>
            Archived habits ({archivedHabits.length})
          </button>
          {showArchived && (
            <div className="flex flex-col gap-2 mt-2">
              {archivedHabits.map(h => (
                <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.color }} />
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{h.name}</span>
                  <button onClick={() => restoreHabit(h.id)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddArea && <Modal title="Add life area" onClose={() => setShowAddArea(false)}><AreaForm onSave={() => { setShowAddArea(false); mutateAreas() }} onCancel={() => setShowAddArea(false)} /></Modal>}
      {editingArea && <Modal title="Edit life area" onClose={() => setEditingArea(null)}><AreaForm initial={editingArea} onSave={() => { setEditingArea(null); mutateAreas() }} onCancel={() => setEditingArea(null)} /></Modal>}
      {editingHabit && <Modal title="Edit habit" onClose={() => setEditingHabit(null)}><HabitForm initial={editingHabit} onSave={() => { setEditingHabit(null); mutateAll() }} onCancel={() => setEditingHabit(null)} /></Modal>}
      {addingHabitToArea != null && <Modal title="Add habit" onClose={() => setAddingHabitToArea(null)}><HabitForm defaultLifeAreaId={addingHabitToArea} onSave={() => { setAddingHabitToArea(null); mutateAll() }} onCancel={() => setAddingHabitToArea(null)} /></Modal>}
      {showPrompt && <PromptModal title="Life AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
