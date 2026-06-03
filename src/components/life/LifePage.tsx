'use client'

import { useState } from 'react'
import GoalsPage from '@/components/goals/GoalsPage'
import HabitsPage from '@/components/habits/HabitsPage'

type LifeTab = 'goals' | 'habits'

const TABS: { id: LifeTab; label: string }[] = [
  { id: 'goals', label: 'Goals' },
  { id: 'habits', label: 'Habits' },
]

export default function LifePage({ defaultTab = 'goals' }: { defaultTab?: LifeTab }) {
  const [tab, setTab] = useState<LifeTab>(defaultTab)

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'goals' && <GoalsPage />}
      {tab === 'habits' && <HabitsPage />}
    </div>
  )
}
