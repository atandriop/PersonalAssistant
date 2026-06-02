'use client'

import { useState } from 'react'
import { mutate } from 'swr'
import type { Document } from '@/types'
import DocumentForm from './DocumentForm'
import { CATEGORY_COLOR, formatSize } from './DocumentCard'

interface Props {
  doc: Document
  onClose: () => void
}

export default function DocumentDetailModal({ doc, onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const catCls = CATEGORY_COLOR[doc.category] ?? CATEGORY_COLOR.Other
  const fileUrl = `/api/documents/${doc.id}/file`
  const isPdf = doc.mimeType === 'application/pdf'
  const isImage = doc.mimeType.startsWith('image/')

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    mutate('/api/documents')
    onClose()
  }

  if (editing) {
    return (
      <DocumentForm
        initial={doc}
        onSave={() => { mutate('/api/documents'); onClose() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{doc.name}</h2>
            <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${catCls}`}>
              {doc.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none ml-4"
          >
            &times;
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4">
          {isPdf && (
            <iframe
              src={fileUrl}
              className="w-full h-96 rounded border border-gray-200 dark:border-gray-700"
              title={doc.name}
            />
          )}
          {isImage && (
            <img
              src={fileUrl}
              alt={doc.name}
              className="max-w-full max-h-96 mx-auto rounded border border-gray-200 dark:border-gray-700 object-contain"
            />
          )}
          {!isPdf && !isImage && (
            <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400">No preview available</p>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex gap-2">
              <span className="font-medium text-gray-900 dark:text-white w-24 shrink-0">File:</span>
              {doc.originalName} ({formatSize(doc.size)})
            </div>
            {doc.expiryDate && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-900 dark:text-white w-24 shrink-0">Expires:</span>
                {doc.expiryDate}
              </div>
            )}
            {doc.notes && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-900 dark:text-white w-24 shrink-0">Notes:</span>
                {doc.notes}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Edit
            </button>
            <a
              href={`${fileUrl}?download=true`}
              download
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
