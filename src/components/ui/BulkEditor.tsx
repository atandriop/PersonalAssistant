'use client'

import { useState, useRef, useCallback, memo } from 'react'

export type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'select'

export interface SelectOption {
  label: string
  value: string
}

export interface ColumnDef {
  key: string
  label: string
  type: ColumnType
  options?: SelectOption[]
  required?: boolean
}

export interface BulkChanges {
  upserted: Record<string, unknown>[]
  deletedIds: number[]
}

interface BulkEditorProps {
  columns: ColumnDef[]
  rows: Record<string, unknown>[]
  csvHint?: string
  onSave: (changes: BulkChanges) => Promise<void>
  onCancel: () => void
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let val = ''
      i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { val += line[i++] }
      }
      result.push(val)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { result.push(line.slice(i)); break }
      result.push(line.slice(i, end))
      i = end + 1
    }
  }
  return result
}

function parseCSV(text: string, columns: ColumnDef[], hint: string): Record<string, unknown>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const hintKeys = hint.split(',').map(k => k.trim())
  const firstFields = parseCSVLine(lines[0])
  const isHeader =
    firstFields.length > 0 &&
    hintKeys.every(k => firstFields.some(f => f.toLowerCase() === k.toLowerCase()))
  const dataLines = isHeader ? lines.slice(1) : lines
  return dataLines.map(line => {
    const fields = parseCSVLine(line)
    const row: Record<string, unknown> = {}
    hintKeys.forEach((key, i) => {
      const col = columns.find(c => c.key === key)
      if (!col) return
      const raw = (fields[i] ?? '').trim()
      if (col.type === 'number') row[key] = raw === '' ? null : parseFloat(raw)
      else if (col.type === 'boolean') row[key] = ['true', '1', 'yes'].includes(raw.toLowerCase())
      else if (col.type === 'select') {
        const match = col.options?.find(
          o => o.label.toLowerCase() === raw.toLowerCase() || o.value.toLowerCase() === raw.toLowerCase()
        )
        row[key] = match ? match.value : (raw || null)
      } else {
        row[key] = raw || null
      }
    })
    return row
  })
}

function CellInput({ col, value, onChange }: {
  col: ColumnDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const base = 'w-full min-w-[5rem] text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 dark:text-white'
  if (col.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={e => onChange(e.target.checked)}
        className="mx-auto block w-4 h-4"
      />
    )
  }
  if (col.type === 'select') {
    return (
      <select
        value={String(value ?? '')}
        onChange={e => onChange(e.target.value)}
        className={`${base} border border-gray-200 dark:border-gray-600 rounded`}
      >
        <option value="">—</option>
        {col.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }
  return (
    <input
      type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
      value={String(value ?? '')}
      onChange={e => {
        if (col.type === 'number') onChange(e.target.value === '' ? null : Number(e.target.value))
        else onChange(e.target.value)
      }}
      className={`${base} border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-400`}
    />
  )
}

/**
 * One table row, memoized. Without this, a keystroke in any cell re-rendered
 * every row: the inventory editor has 7 columns x 334 rows, so ~5300 controlled
 * inputs were reconciled per keypress.
 */
const EditorRow = memo(function EditorRow({ row, rowIndex, columns, isMarked, onCellChange, onToggleDelete }: {
  row: Record<string, unknown>
  rowIndex: number
  columns: ColumnDef[]
  isMarked: boolean
  onCellChange: (rowIdx: number, key: string, value: unknown) => void
  onToggleDelete: (rowIdx: number) => void
}) {
  return (
    <tr className={isMarked ? 'opacity-40 bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'}>
      <td className="px-2 text-center">
        <button
          type="button"
          onClick={() => onToggleDelete(rowIndex)}
          title={isMarked ? 'Undo delete' : 'Delete row'}
          className={`text-xs leading-none ${isMarked
            ? 'text-blue-400 hover:text-blue-600'
            : 'text-gray-300 hover:text-red-500'}`}
        >
          {isMarked ? '↩' : '×'}
        </button>
      </td>
      {columns.map(col => (
        <td key={col.key} className={`px-2 py-1 ${isMarked ? 'line-through' : ''}`}>
          <CellInput col={col} value={row[col.key]} onChange={v => onCellChange(rowIndex, col.key, v)} />
        </td>
      ))}
    </tr>
  )
})

/** Stable comparison key for a row, over the editable columns only. */
function rowSignature(row: Record<string, unknown>, columns: ColumnDef[]): string {
  return JSON.stringify(columns.map(c => row[c.key] ?? null))
}

export default function BulkEditor({ columns, rows, csvHint, onSave, onCancel }: BulkEditorProps) {
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>(() =>
    rows.map(r => ({ ...r }))
  )
  const [deletedIds, setDeletedIds] = useState<number[]>([])
  const [csvText, setCsvText] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Signatures as the editor was opened, so Save can submit only what changed.
  const originalRef = useRef<Map<number, string>>(
    new Map(
      rows
        .filter(r => typeof r.id === 'number')
        .map(r => [r.id as number, rowSignature(r, columns)])
    )
  )

  const hint = csvHint ?? columns.map(c => c.key).join(',')
  const parsedCount = csvText.trim() ? parseCSV(csvText, columns, hint).length : 0

  const updateCell = useCallback((rowIdx: number, key: string, value: unknown) => {
    setTableRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r))
  }, [])

  // Read the current rows through a ref so the callback identity stays stable
  // (EditorRow is memoized) without putting a side effect in a state updater.
  const rowsRef = useRef(tableRows)
  rowsRef.current = tableRows

  const toggleDelete = useCallback((rowIdx: number) => {
    const row = rowsRef.current[rowIdx]
    if (typeof row?.id === 'number') {
      const id = row.id as number
      setDeletedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      setTableRows(prev => prev.filter((_, i) => i !== rowIdx))
    }
  }, [])

  function addRow() {
    const blank: Record<string, unknown> = {}
    columns.forEach(c => {
      blank[c.key] = c.type === 'boolean' ? false : c.type === 'number' ? null : ''
    })
    setTableRows(prev => [...prev, blank])
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCsvText(ev.target?.result as string ?? '')
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleSave() {
    const importedRows = csvText.trim() ? parseCSV(csvText, columns, hint) : []
    // Submit only rows that actually changed, plus new and imported ones. Every
    // row used to be submitted unconditionally, so saving the inventory editor
    // issued 334 PUTs (~1000 SQL statements) even with nothing edited.
    const upserted = [
      ...tableRows.filter(r => {
        if (typeof r.id !== 'number') return true
        if (deletedIds.includes(r.id as number)) return false
        const before = originalRef.current.get(r.id as number)
        return before === undefined || before !== rowSignature(r, columns)
      }),
      ...importedRows,
    ]
    setSaving(true)
    try {
      await onSave({ upserted, deletedIds })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Editable table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="w-8 px-2" />
              {columns.map(c => (
                <th key={c.key} className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {tableRows.map((row, i) => (
              <EditorRow
                key={typeof row.id === 'number' ? `id-${row.id}` : `new-${i}`}
                row={row}
                rowIndex={i}
                columns={columns}
                isMarked={typeof row.id === 'number' && deletedIds.includes(row.id as number)}
                onCellChange={updateCell}
                onToggleDelete={toggleDelete}
              />
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
          <button type="button" onClick={addRow} className="text-xs text-blue-500 hover:text-blue-600">
            + Add row
          </button>
        </div>
      </div>

      {/* Import section */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Import new rows
        </p>
        <p className="text-xs text-gray-400 font-mono mb-2 select-all">{hint}</p>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          rows={4}
          placeholder="Paste CSV or TSV rows here…"
          className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-white resize-y font-mono"
        />
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            Upload .csv
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          {parsedCount > 0 && (
            <span className="text-xs text-gray-400">
              {parsedCount} row{parsedCount !== 1 ? 's' : ''} detected
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
