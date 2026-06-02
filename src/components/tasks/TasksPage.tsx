'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import TasksTab from './TasksTab'
import AppointmentsTab from './AppointmentsTab'

type TabId = 'tasks' | 'appointments'

export default function TasksPage() {
  const params = useSearchParams()
  const activeTab: TabId = (params.get('tab') as TabId) ?? 'tasks'

  function tabClass(id: TabId) {
    return `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === id
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tasks</h1>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <Link href="/tasks?tab=tasks" className={tabClass('tasks')}>Tasks</Link>
        <Link href="/tasks?tab=appointments" className={tabClass('appointments')}>Appointments</Link>
      </div>

      {activeTab === 'tasks' ? <TasksTab /> : <AppointmentsTab />}
    </div>
  )
}
