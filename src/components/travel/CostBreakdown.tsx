'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import type { Memory, TripCostLine } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Category = 'hotel' | 'airfare' | 'food' | 'entertainment'

const CATEGORY_LABELS: Record<Category, string> = {
  hotel: 'Hotel',
  airfare: 'Airfare',
  food: 'Food / Drinks',
  entertainment: 'Shopping / Entertainment',
}

const MEMORY_CATEGORIES = ['Career', 'Education', 'Travel', 'Personal', 'Other']

interface NewMemoryDraft {
  title: string
  date: string
  category: string
  location: string
}

interface LineState {
  key: string
  category: Category
  amount: string
  label: string
  memoryId: number | null
  newMemory: NewMemoryDraft | null
  showPanel: boolean
  panelTab: 'existing' | 'new'
}

export interface CostLinePayload {
  category: Category
  amount: number
  label: string | null
  memoryId: number | null
  newMemory: { title: string; date: string; category: string; location: string | null } | null
}

let keyCounter = 0
function newKey() { return String(++keyCounter) }

function blankLine(cat: Category): LineState {
  return {
    key: newKey(),
    category: cat,
    amount: '',
    label: '',
    memoryId: null,
    newMemory: null,
    showPanel: false,
    panelTab: 'existing',
  }
}

const BLANK_DRAFT: NewMemoryDraft = { title: '', date: '', category: 'Personal', location: '' }

interface Props {
  initialLines: TripCostLine[]
  onChange: (lines: CostLinePayload[]) => void
}

export default function CostBreakdown({ initialLines, onChange }: Props) {
  const { data: memories = [] } = useSWR<Memory[]>('/api/memories', fetcher)
  const [memorySearch, setMemorySearch] = useState('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [lines, setLines] = useState<LineState[]>(() => {
    const fromDB: LineState[] = initialLines.map(l => ({
      key: newKey(),
      category: l.category,
      amount: l.amount > 0 ? String(l.amount) : '',
      label: l.label ?? '',
      memoryId: l.memoryId,
      newMemory: null,
      showPanel: false,
      panelTab: 'existing' as const,
    }))
    const hasHotel = fromDB.some(l => l.category === 'hotel')
    const hasAirfare = fromDB.some(l => l.category === 'airfare')
    return [
      ...(hasHotel ? [] : [blankLine('hotel')]),
      ...(hasAirfare ? [] : [blankLine('airfare')]),
      ...fromDB,
    ]
  })

  useEffect(() => {
    const payload: CostLinePayload[] = lines
      .filter(l => l.amount !== '' && Number(l.amount) > 0)
      .map(l => ({
        category: l.category,
        amount: Number(l.amount),
        label: l.label.trim() || null,
        memoryId: l.newMemory ? null : l.memoryId,
        newMemory: l.newMemory
          ? {
              title: l.newMemory.title,
              date: l.newMemory.date,
              category: l.newMemory.category,
              location: l.newMemory.location || null,
            }
          : null,
      }))
    onChangeRef.current(payload)
  }, [lines])

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))
  }

  function removeLine(key: string) {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  function addLine(cat: Category) {
    setLines(prev => [...prev, blankLine(cat)])
  }

  function togglePanel(key: string) {
    setMemorySearch('')
    setLines(prev => prev.map(l =>
      l.key === key
        ? { ...l, showPanel: !l.showPanel }
        : { ...l, showPanel: false }
    ))
  }

  function linkExisting(key: string, memoryId: number) {
    updateLine(key, { memoryId, newMemory: null, showPanel: false })
  }

  function unlinkMemory(key: string) {
    updateLine(key, { memoryId: null, newMemory: null })
  }

  function updateDraft(key: string, patch: Partial<NewMemoryDraft>, line: LineState) {
    updateLine(key, { newMemory: { ...(line.newMemory ?? BLANK_DRAFT), ...patch } })
  }

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0)

  const inp = 'px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
  const inpSm = 'px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  const categories: Category[] = ['hotel', 'airfare', 'food', 'entertainment']

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Costs</p>

      {categories.map(cat => {
        const catLines = lines.filter(l => l.category === cat)
        const isSimple = cat === 'hotel' || cat === 'airfare'

        return (
          <div key={cat} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {CATEGORY_LABELS[cat]}
            </p>

            {catLines.map(line => {
              const linkedMemory = line.memoryId ? memories.find(m => m.id === line.memoryId) : null
              const hasLink = !!(linkedMemory || line.newMemory)

              return (
                <div key={line.key} className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="€"
                      value={line.amount}
                      onChange={e => updateLine(line.key, { amount: e.target.value })}
                      className={`w-24 ${inp}`}
                    />
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={line.label}
                      onChange={e => updateLine(line.key, { label: e.target.value })}
                      className={`flex-1 ${inp}`}
                    />
                    {!isSimple && (
                      <button
                        type="button"
                        onClick={() => togglePanel(line.key)}
                        className={`text-xs px-2 py-1.5 rounded-lg border whitespace-nowrap ${
                          hasLink
                            ? 'border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {hasLink
                          ? (linkedMemory
                              ? linkedMemory.title.slice(0, 18)
                              : (line.newMemory?.title ? line.newMemory.title.slice(0, 18) : 'New memory'))
                          : '+ Memory'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      title="Remove row"
                      className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-500 text-xl leading-none shrink-0"
                    >
                      ×
                    </button>
                  </div>

                  {line.showPanel && (
                    <div className="ml-2 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        {(['existing', 'new'] as const).map(tab => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => updateLine(line.key, { panelTab: tab })}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                              line.panelTab === tab
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {tab === 'existing' ? 'Pick existing' : 'Create new'}
                          </button>
                        ))}
                        {hasLink && (
                          <button
                            type="button"
                            onClick={() => unlinkMemory(line.key)}
                            className="ml-auto text-xs text-red-400 hover:text-red-600"
                          >
                            Remove link
                          </button>
                        )}
                      </div>

                      {line.panelTab === 'existing' ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Search memories…"
                            value={memorySearch}
                            onChange={e => setMemorySearch(e.target.value)}
                            className={`w-full ${inpSm}`}
                          />
                          <div className="max-h-32 overflow-y-auto flex flex-col">
                            {memories
                              .filter(m => m.title.toLowerCase().includes(memorySearch.toLowerCase()))
                              .slice(0, 20)
                              .map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => linkExisting(line.key, m.id)}
                                  className={`text-left text-xs px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-700 flex justify-between gap-2 ${
                                    line.memoryId === m.id
                                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <span>{m.title}</span>
                                  <span className="text-gray-400 shrink-0">{m.date}</span>
                                </button>
                              ))}
                            {memories.length === 0 && (
                              <p className="text-xs text-gray-400 px-2 py-1">No memories yet.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Title *"
                            value={line.newMemory?.title ?? ''}
                            onChange={e => updateDraft(line.key, { title: e.target.value }, line)}
                            className={`w-full ${inpSm}`}
                          />
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={line.newMemory?.date ?? ''}
                              onChange={e => updateDraft(line.key, { date: e.target.value }, line)}
                              className={`flex-1 ${inpSm}`}
                            />
                            <select
                              value={line.newMemory?.category ?? 'Personal'}
                              onChange={e => updateDraft(line.key, { category: e.target.value }, line)}
                              className={`flex-1 ${inpSm}`}
                            >
                              {MEMORY_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder="Location (optional)"
                            value={line.newMemory?.location ?? ''}
                            onChange={e => updateDraft(line.key, { location: e.target.value }, line)}
                            className={`w-full ${inpSm}`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => addLine(cat)}
              className="text-xs text-blue-500 hover:text-blue-600 self-start"
            >
              + Add {isSimple ? 'line' : 'item'}
            </button>
          </div>
        )
      })}

      {total > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            €{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}
