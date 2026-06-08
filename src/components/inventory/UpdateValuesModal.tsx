'use client'

import { useState } from 'react'
import { computeValue, type ItemForValue } from '@/lib/inventoryUtils'

interface Category { valueMethod: string; depreciationRate: number | null }
interface InventoryItem {
  id: number; name: string; cost: number
  currentValue?: number | null; purchaseDate?: string | null
  category: Category
}
interface Update { id: number; currentValue: number }

interface Props {
  items: InventoryItem[]
  onApply: (updates: Update[]) => Promise<void>
  onClose: () => void
}

function buildPrompt(items: InventoryItem[]): string {
  const lines = items.map(i => {
    const val = computeValue(i as ItemForValue, i.category)
    const isEstimated = (i.currentValue === null || i.currentValue === undefined)
    const label = isEstimated ? '(estimated)' : '(manual)'
    return `${i.name} | €${val.toFixed(2)} ${label}`
  })
  return [
    'Here are my inventory items with their current estimated values.',
    'Please research and return updated current market values for each item.',
    'Reply ONLY with lines in the format: Item Name | Value',
    '',
    ...lines,
  ].join('\n')
}

function parseResponse(
  text: string,
  items: InventoryItem[]
): { updates: Update[]; unmatched: string[] } {
  const updates: Update[] = []
  const unmatched: string[] = []

  text.split('\n').forEach(line => {
    const parts = line.split('|')
    if (parts.length < 2) return
    const name = parts[0].trim()
    const valueStr = parts[1].trim().replace(/[€$,]/g, '')
    const value = parseFloat(valueStr)
    if (!name || isNaN(value)) return
    const item = items.find(i => i.name.toLowerCase() === name.toLowerCase())
    if (item) {
      updates.push({ id: item.id, currentValue: value })
    } else {
      unmatched.push(name)
    }
  })

  return { updates, unmatched }
}

export default function UpdateValuesModal({ items, onApply, onClose }: Props) {
  const [tab, setTab] = useState<'prompt' | 'apply'>('prompt')
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState<{ updates: Update[]; unmatched: string[] } | null>(null)
  const [applying, setApplying] = useState(false)

  const prompt = buildPrompt(items)

  function handleParse() {
    setParsed(parseResponse(pasteText, items))
  }

  async function handleApply() {
    if (!parsed) return
    setApplying(true)
    await onApply(parsed.updates)
    setApplying(false)
    onClose()
  }

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button className={tabClass(tab === 'prompt')} onClick={() => setTab('prompt')}>Get Prompt</button>
        <button className={tabClass(tab === 'apply')} onClick={() => setTab('apply')}>Apply Values</button>
      </div>

      {tab === 'prompt' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Copy this prompt and paste it into an AI assistant. Then switch to the Apply Values tab to paste the response back.
          </p>
          <textarea
            readOnly
            value={prompt}
            rows={12}
            className="text-xs font-mono border rounded-lg px-3 py-2 w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 resize-none"
          />
          <button
            onClick={() => navigator.clipboard.writeText(prompt)}
            className="self-start text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      {tab === 'apply' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Paste the AI response below. Each line should be <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">Item Name | Value</code>.
          </p>
          <textarea
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setParsed(null) }}
            placeholder={"MacBook Pro 14\" | €950\nBMW 3 Series | €16000"}
            rows={8}
            className="text-sm font-mono border rounded-lg px-3 py-2 w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
          />
          <button
            onClick={handleParse}
            disabled={!pasteText.trim()}
            className="self-start text-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Preview
          </button>
          {parsed && (
            <div className="flex flex-col gap-2">
              {parsed.updates.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Will update {parsed.updates.length} item{parsed.updates.length !== 1 ? 's' : ''}:
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                    {parsed.updates.map(u => {
                      const item = items.find(i => i.id === u.id)
                      return (
                        <li key={u.id}>
                          {item?.name} → €{u.currentValue.toFixed(2)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {parsed.unmatched.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                    Unmatched lines (will be skipped):
                  </p>
                  <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                    {parsed.unmatched.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
              {parsed.updates.length > 0 && (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="self-start text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {applying ? 'Applying…' : `Apply ${parsed.updates.length} Update${parsed.updates.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Close</button>
      </div>
    </div>
  )
}
