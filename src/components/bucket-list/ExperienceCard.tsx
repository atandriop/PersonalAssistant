'use client'

import type { BucketExperience } from '@/types'

export const EXPERIENCE_CATEGORY_COLOR: Record<string, string> = {
  Adventure:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Learning:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Career:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Relationships: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Health:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Creative:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Other:         'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default function ExperienceCard({ experience, onToggleDone, onClick }: {
  experience: BucketExperience
  onToggleDone: () => void
  onClick: () => void
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
        experience.done ? 'opacity-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-base font-semibold text-gray-900 dark:text-white ${experience.done ? 'line-through' : ''}`}>
          {experience.title}
        </h3>
        <button
          onClick={e => { e.stopPropagation(); onToggleDone() }}
          title={experience.done ? 'Mark not done' : 'Mark done'}
          className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
            experience.done
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          }`}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${EXPERIENCE_CATEGORY_COLOR[experience.category] ?? EXPERIENCE_CATEGORY_COLOR.Other}`}>
          {experience.category}
        </span>
        {experience.targetYear && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{experience.targetYear}</span>
        )}
      </div>
    </div>
  )
}
