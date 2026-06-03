'use client'

import { useState } from 'react'
import type { Document } from '@/types'

const CATEGORIES = ['Identity', 'Finance', 'Vehicle', 'Health', 'Insurance', 'Other']

const inputCls =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

interface Props {
  initial?: Document
  onSave: () => void
  onCancel: () => void
}

export default function DocumentForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!name) {
      setName(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (initial) {
        await fetch(`/api/documents/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            notes: notes || null,
            expiryDate: expiryDate || null,
            tags,
          }),
        })
      } else {
        if (!file) return
        const form = new FormData()
        form.append('file', file)
        form.append('name', name)
        form.append('category', category)
        if (notes) form.append('notes', notes)
        if (expiryDate) form.append('expiryDate', expiryDate)
        form.append('tags', tags.join(','))
        await fetch('/api/documents', { method: 'POST', body: form })
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Document' : 'Upload Document'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {!initial && (
            <div>
              <label className={labelCls}>File *</label>
              <input
                type="file"
                required
                onChange={handleFileChange}
                className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300"
              />
            </div>
          )}
          <div>
            <label className={labelCls}>Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={inputCls}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="opacity-70 hover:opacity-100">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add tag…"
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm"
              />
              <button type="button" onClick={addTag} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Add</button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!initial && !file)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
