'use client'

import { useState } from 'react'
import TravelPage from '@/components/travel/TravelPage'
import BucketListPage from '@/components/bucket-list/BucketListPage'
import MemoriesPage from '@/components/memories/MemoriesPage'
import TimelinePage from '@/components/timeline/TimelinePage'

type ExperiencesTab = 'travel' | 'bucket-list' | 'memories' | 'timeline'

const TABS: { id: ExperiencesTab; label: string }[] = [
  { id: 'travel', label: 'Travel' },
  { id: 'bucket-list', label: 'Bucket List' },
  { id: 'memories', label: 'Memories' },
  { id: 'timeline', label: 'Timeline' },
]

export default function ExperiencesPage({ defaultTab = 'travel' }: { defaultTab?: ExperiencesTab }) {
  const [tab, setTab] = useState<ExperiencesTab>(defaultTab)

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'travel' && <TravelPage />}
      {tab === 'bucket-list' && <BucketListPage />}
      {tab === 'memories' && <MemoriesPage />}
      {tab === 'timeline' && <TimelinePage />}
    </div>
  )
}
