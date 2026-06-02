'use client'

import type { Document } from '@/types'

export const CATEGORY_COLOR: Record<string, string> = {
  Identity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Health: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function expiryStatus(
  expiryDate: string | null
): { label: string; cls: string } | null {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(expiryDate + 'T00:00:00')
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { label: 'Expired', cls: 'text-red-600 dark:text-red-400' }
  if (days <= 30) return { label: `${days}d left`, cls: 'text-red-600 dark:text-red-400' }
  if (days <= 90) return { label: `${days}d left`, cls: 'text-orange-500 dark:text-orange-400' }
  return { label: expiryDate, cls: 'text-gray-400 dark:text-gray-500' }
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') return <span className="text-2xl">📄</span>
  if (mimeType.startsWith('image/')) return <span className="text-2xl">🖼</span>
  return <span className="text-2xl">📁</span>
}

interface Props {
  doc: Document
  onClick: () => void
}

export default function DocumentCard({ doc, onClick }: Props) {
  const expiry = expiryStatus(doc.expiryDate)
  const catCls = CATEGORY_COLOR[doc.category] ?? CATEGORY_COLOR.Other

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-2"
    >
      <div className="flex items-start gap-3">
        <FileIcon mimeType={doc.mimeType} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{doc.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatSize(doc.size)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${catCls}`}>
          {doc.category}
        </span>
        {expiry && (
          <span className={`text-xs font-medium ${expiry.cls}`}>{expiry.label}</span>
        )}
      </div>
    </button>
  )
}
