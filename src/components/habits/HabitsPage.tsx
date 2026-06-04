'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import PromptModal from '@/components/ui/PromptModal'
import HabitRow, { Habit } from './HabitRow'
import HabitForm from './HabitForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface HabitLog { date: string; note: string | null }

export default function HabitsPage() {
  const { data: habits = [], mutate } = useSWR<Habit[]>('/api/habits', fetcher)
  const { data: archivedHabits = [], mutate: mutateArchived } = useSWR<Habit[]>('/api/habits?archived=true', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [loadingPrompt, setLoadingPrompt] = useState(false)

  async function del(id: number) {
    if (!confirm('Delete this habit and all its history?')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    mutate()
  }

  async function archive(id: number) {
    if (!confirm('Archive this habit? You can restore it later from the Archived section.')) return
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) })
    mutate(); mutateArchived()
  }

  async function restore(id: number) {
    await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) })
    mutate(); mutateArchived()
  }

  async function openPrompt() {
    setLoadingPrompt(true)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const cutoffStr = new Date(now.getTime() - 83 * 86400000).toISOString().slice(0, 10)
    const todayStr = now.toISOString().slice(0, 10)

    const lines = await Promise.all(
      habits.map(async h => {
        const logs: HabitLog[] = await fetch(`/api/habits/${h.id}/logs`).then(r => r.json())
        const logSet = new Set(logs.map(l => l.date))
        let streak = 0
        let cursor = new Date(logSet.has(todayStr) ? now : new Date(now.getTime() - 86400000))
        while (logSet.has(cursor.toISOString().slice(0, 10))) {
          streak++
          cursor = new Date(cursor.getTime() - 86400000)
        }
        const recent = logs.filter(l => l.date >= cutoffStr)
        const pct = Math.round((recent.length / 84) * 100)
        return `- ${h.name}: ${streak} day streak · ${pct}% consistency over last 12 weeks (${recent.length}/84 days)`
      })
    )

    const prompt = `Here is my habit tracking snapshot as of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:\n\n${lines.join('\n')}\n\nPlease analyse this. For each habit: call out whether the consistency is strong, inconsistent, or struggling. Identify which habit has the best momentum and which is at most risk of being abandoned. Suggest one concrete change I could make this week to improve the weakest habit without disrupting the strongest.`

    setPromptText(prompt)
    setLoadingPrompt(false)
    setShowPrompt(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habits</h1>
        <div className="flex gap-2">
          {habits.length > 0 && (
            <button onClick={openPrompt} disabled={loadingPrompt} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {loadingPrompt ? 'Loading…' : 'Generate AI Prompt'}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add habit</button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {habits.map(h => (
          <HabitRow key={h.id} habit={h} onEdit={() => setEditing(h)} onDelete={() => del(h.id)} onArchive={() => archive(h.id)} />
        ))}
      </div>

      {habits.length === 0 && archivedHabits.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No habits yet. Add one to start tracking.</p>
      )}

      {archivedHabits.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowArchived(v => !v)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <span>{showArchived ? '▾' : '▸'}</span>
            Archived ({archivedHabits.length})
          </button>
          {showArchived && (
            <div className="flex flex-col gap-2 mt-2">
              {archivedHabits.map(h => (
                <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.color }} />
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{h.name}</span>
                  <button onClick={() => restore(h.id)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && <Modal title="Add habit" onClose={() => setShowAdd(false)}><HabitForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit habit" onClose={() => setEditing(null)}><HabitForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
      {showPrompt && <PromptModal title="Habits AI Prompt" prompt={promptText} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
