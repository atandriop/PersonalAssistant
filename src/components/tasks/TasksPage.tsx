'use client'

import { useState } from 'react'
import useSWR from 'swr'
import TasksTab from './TasksTab'
import AppointmentsTab from './AppointmentsTab'
import GiftsPage from '@/components/gifts/GiftsPage'
import PromptModal from '@/components/ui/PromptModal'
import type { Task, Appointment } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type TabId = 'tasks' | 'gifts'

export default function TasksPage() {
  const [tab, setTab] = useState<TabId>('tasks')

  // SWR deduplicates — same keys used inside TasksTab / AppointmentsTab
  const { data: tasks = [] } = useSWR<Task[]>('/api/tasks', fetcher)
  const { data: appointments = [] } = useSWR<Appointment[]>('/api/appointments', fetcher)
  const [showPrompt, setShowPrompt] = useState(false)

  function tabCls(active: boolean) {
    return `px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
      active
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`
  }

  function buildTasksPrompt(): string {
    const today = new Date().toISOString().slice(0, 10)
    const open = tasks.filter(t => !t.done)
    const byPriority: Record<string, Task[]> = { High: [], Medium: [], Low: [] }
    open.forEach(t => { (byPriority[t.priority] ?? byPriority.Medium).push(t) })

    const taskLines = (['High', 'Medium', 'Low'] as const).flatMap(p =>
      byPriority[p].map(t => {
        const due = t.dueDate ? ` (due ${t.dueDate.slice(0, 10)})` : ''
        const overdue = t.dueDate && t.dueDate.slice(0, 10) < today ? ' ⚠️ overdue' : ''
        const subtaskStr = t.subtasks.length > 0
          ? ` [${t.subtasks.filter(s => s.done).length}/${t.subtasks.length} subtasks]`
          : ''
        const cat = t.category ? ` [${t.category}]` : ''
        return `  [${p}]${cat} ${t.title}${due}${overdue}${subtaskStr}`
      })
    ).join('\n')

    const upcoming = appointments
      .filter(a => !a.done && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10)

    const apptLines = upcoming.map(a => {
      const time = a.time ? ` at ${a.time}` : ''
      const loc = a.location ? ` @ ${a.location}` : ''
      return `  ${a.date}${time}${loc} — ${a.title} [${a.category}]`
    }).join('\n')

    return `Here is my current task and appointment snapshot as of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:

Open Tasks (${open.length} total):
${taskLines || '  None'}

Upcoming Appointments:
${apptLines || '  None'}

Please analyse this. Identify any overdue or high-priority tasks I should tackle first. Flag if the workload looks overwhelming for the near term. Suggest a concrete focus order for the next 2–3 days, and flag anything that looks like it might be blocking other tasks.`
  }

  const hasData = tasks.some(t => !t.done) || appointments.some(a => !a.done)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
        {tab === 'tasks' && hasData && (
          <button onClick={() => setShowPrompt(true)} className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Generate AI Prompt
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button onClick={() => setTab('tasks')} className={tabCls(tab === 'tasks')}>Tasks</button>
        <button onClick={() => setTab('gifts')} className={tabCls(tab === 'gifts')}>Gifts</button>
      </div>

      {tab === 'tasks' && (
        <>
          <TasksTab />
          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Appointments
            </h2>
            <AppointmentsTab />
          </div>
        </>
      )}

      {tab === 'gifts' && <GiftsPage />}

      {showPrompt && (
        <PromptModal title="Tasks AI Prompt" prompt={buildTasksPrompt()} onClose={() => setShowPrompt(false)} />
      )}
    </div>
  )
}
