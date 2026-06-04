# Bulk Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Edit All" button to five pages (Subscriptions, Wishlist, Inventory, Travel Trips, Bucket List Trips) that swaps the normal list view for an inline bulk editor — an editable table of existing rows plus a CSV import section for adding many new rows at once.

**Architecture:** A single generic `BulkEditor` component accepts column definitions + row data + a page-provided `onSave` callback. Each page defines its column schema inline, adds an "Edit All" button, and implements a save handler that calls the existing per-entity REST endpoints (PUT/POST/DELETE) in parallel. No new API endpoints are needed.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, SWR, existing Prisma API routes.

---

## File map

| Action | File |
|--------|------|
| Create | `src/components/ui/BulkEditor.tsx` |
| Modify | `src/components/subscriptions/SubscriptionsPage.tsx` |
| Modify | `src/components/items/ItemsPage.tsx` |
| Modify | `src/components/travel/TravelPage.tsx` |
| Modify | `src/components/bucket-list/BucketListPage.tsx` |

---

## Task 1: Build BulkEditor component

**Files:**
- Create: `src/components/ui/BulkEditor.tsx`

- [ ] **Step 1: Create the file with the complete implementation**

```tsx
'use client'

import { useState, useRef } from 'react'

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

export default function BulkEditor({ columns, rows, csvHint, onSave, onCancel }: BulkEditorProps) {
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>(() =>
    rows.map(r => ({ ...r }))
  )
  const [deletedIds, setDeletedIds] = useState<number[]>([])
  const [csvText, setCsvText] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const hint = csvHint ?? columns.map(c => c.key).join(',')
  const parsedCount = csvText.trim() ? parseCSV(csvText, columns, hint).length : 0

  function updateCell(rowIdx: number, key: string, value: unknown) {
    setTableRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r))
  }

  function toggleDelete(rowIdx: number) {
    const row = tableRows[rowIdx]
    if (typeof row.id === 'number') {
      const id = row.id as number
      setDeletedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      setTableRows(prev => prev.filter((_, i) => i !== rowIdx))
    }
  }

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
    const upserted = [
      ...tableRows.filter(r => typeof r.id !== 'number' || !deletedIds.includes(r.id as number)),
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
            {tableRows.map((row, i) => {
              const isMarked = typeof row.id === 'number' && deletedIds.includes(row.id as number)
              return (
                <tr key={i} className={isMarked
                  ? 'opacity-40 bg-red-50 dark:bg-red-900/10'
                  : 'bg-white dark:bg-gray-900'}>
                  <td className="px-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleDelete(i)}
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
                      <CellInput col={col} value={row[col.key]} onChange={v => updateCell(i, col.key, v)} />
                    </td>
                  ))}
                </tr>
              )
            })}
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
```

- [ ] **Step 2: Verify the build passes**

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors related to `BulkEditor.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/BulkEditor.tsx
git commit -m "feat: add generic BulkEditor component with CSV import"
```

---

## Task 2: Wire BulkEditor into SubscriptionsPage

**Files:**
- Modify: `src/components/subscriptions/SubscriptionsPage.tsx`

Context: The existing SubscriptionsPage is at `src/components/subscriptions/SubscriptionsPage.tsx`. It already imports `useSWR` and has a `mutate` from `useSWR<Subscription[]>('/api/subscriptions', fetcher)`. The subscription's `renewalDate` is stored as an ISO datetime string — slice to 10 chars for the date input.

Period field values in the existing data are `'monthly'` and `'yearly'` (matching the existing SubscriptionForm options).

- [ ] **Step 1: Add the import at the top of the file**

In `src/components/subscriptions/SubscriptionsPage.tsx`, add after the existing imports:

```tsx
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'
```

- [ ] **Step 2: Add `bulkEdit` state inside `SubscriptionsPage`**

In the `SubscriptionsPage` function body, after the existing state declarations (`const [showAdd, ...`, `const [editing, ...`, `const [showActive, ...`), add:

```tsx
const [bulkEdit, setBulkEdit] = useState(false)
```

- [ ] **Step 3: Add the column schema constant inside the component (after the state declarations)**

```tsx
const SUBSCRIPTION_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'cost', label: 'Cost (€)', type: 'number', required: true },
  { key: 'period', label: 'Period', type: 'select', options: [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ]},
  { key: 'category', label: 'Category', type: 'select', options: SUBSCRIPTION_CATEGORIES.map(c => ({ label: c, value: c })) },
  { key: 'renewalDate', label: 'Renewal Date', type: 'date' },
  { key: 'url', label: 'URL', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'active', label: 'Active', type: 'boolean' },
]
```

- [ ] **Step 4: Add the bulk save handler inside the component (after the column schema)**

```tsx
async function handleBulkSave({ upserted, deletedIds }: BulkChanges) {
  await Promise.all([
    ...upserted.map(row =>
      typeof row.id === 'number'
        ? fetch(`/api/subscriptions/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
        : fetch('/api/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
    ),
    ...deletedIds.map(id => fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })),
  ])
  mutate()
  setBulkEdit(false)
}
```

- [ ] **Step 5: Add "Edit All" button in the header**

Find the existing header buttons block:

```tsx
<button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  + Add
</button>
```

Add the "Edit All" button before it:

```tsx
<button onClick={() => setBulkEdit(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
  Edit All
</button>
<button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  + Add
</button>
```

- [ ] **Step 6: Wrap the normal list in a conditional and render BulkEditor**

Find the existing subscription list and empty-state paragraph. These are the two elements below the filter buttons:

```tsx
<div className="flex flex-col gap-4">
  {grouped.map(...)}
</div>

{items.length === 0 && (
  <p className="text-sm text-gray-400 text-center py-12">No subscriptions yet. Add one to get started.</p>
)}
```

Replace them with:

```tsx
<div className={bulkEdit ? 'hidden' : ''}>
  <div className="flex flex-col gap-4">
    {grouped.map(({ category, items: groupItems }) => (
      <div key={category}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{category}</h3>
        <div className="flex flex-col gap-2">
          {groupItems.map(s => {
            const days = daysUntil(s.renewalDate)
            const soon = days !== null && days >= 0 && days <= 14
            const mo = monthlyEquiv(s.cost, s.period)
            return (
              <div key={s.id} className={`bg-white dark:bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${soon ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'} ${!s.active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                    {soon && days !== null && <Badge color="#f59e0b">Renewing in {days}d</Badge>}
                    {!s.active && <Badge color="#6b7280">Inactive</Badge>}
                  </div>
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{s.url}</a>}
                  {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                  {s.renewalDate && <p className="text-xs text-gray-400">Renews {new Date(s.renewalDate).toLocaleDateString()}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">€{s.cost.toFixed(2)}/{s.period === 'monthly' ? 'mo' : 'yr'}</p>
                  {s.period === 'yearly' && <p className="text-xs text-gray-400">€{mo.toFixed(2)}/mo</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(s)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => del(s.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    ))}
  </div>

  {items.length === 0 && (
    <p className="text-sm text-gray-400 text-center py-12">No subscriptions yet. Add one to get started.</p>
  )}
</div>

{bulkEdit && (
  <BulkEditor
    columns={SUBSCRIPTION_COLUMNS}
    rows={all.map(s => ({
      ...s,
      renewalDate: s.renewalDate ? s.renewalDate.slice(0, 10) : '',
    }))}
    csvHint="name,cost,period,category,renewalDate,url,notes,active"
    onSave={handleBulkSave}
    onCancel={() => setBulkEdit(false)}
  />
)}
```

- [ ] **Step 7: Verify the build**

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/subscriptions/SubscriptionsPage.tsx
git commit -m "feat: add bulk editor to SubscriptionsPage"
```

---

## Task 3: Wire BulkEditor into ItemsPage (Wishlist + Inventory)

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

Context: ItemsPage renders both wishlist and inventory in a two-column side-by-side layout. It has `mutateWish` and `mutateInv` from SWR. It also fetches `categories` from `/api/categories` — these become the select options for the categoryId column. Wishlist items have `categoryId: number`; convert to string for the select value. Inventory items have `purchaseDate` as ISO datetime string or null; slice to 10 chars for the date input.

- [ ] **Step 1: Add the import**

In `src/components/items/ItemsPage.tsx`, add after the existing imports:

```tsx
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'
```

- [ ] **Step 2: Add state for both bulk editors inside `ItemsPage`**

After the existing state declarations (after `const [toInventory, ...]`), add:

```tsx
const [bulkWish, setBulkWish] = useState(false)
const [bulkInv, setBulkInv] = useState(false)
```

- [ ] **Step 3: Add the column schemas and save handlers**

After the `delInv` function, add:

```tsx
const WISHLIST_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'cost', label: 'Cost (€)', type: 'number', required: true },
  { key: 'priority', label: 'Priority', type: 'select', options: [
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ]},
  { key: 'categoryId', label: 'Category', type: 'select', options: categories.map(c => ({ label: c.name, value: String(c.id) })) },
  { key: 'url', label: 'URL', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
]

const INVENTORY_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'cost', label: 'Cost (€)', type: 'number', required: true },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
  { key: 'categoryId', label: 'Category', type: 'select', options: categories.map(c => ({ label: c.name, value: String(c.id) })) },
  { key: 'notes', label: 'Notes', type: 'text' },
]

async function handleWishlistBulkSave({ upserted, deletedIds }: BulkChanges) {
  await Promise.all([
    ...upserted.map(row =>
      typeof row.id === 'number'
        ? fetch(`/api/wishlist/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
        : fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
    ),
    ...deletedIds.map(id => fetch(`/api/wishlist/${id}`, { method: 'DELETE' })),
  ])
  mutateWish()
  setBulkWish(false)
}

async function handleInventoryBulkSave({ upserted, deletedIds }: BulkChanges) {
  await Promise.all([
    ...upserted.map(row =>
      typeof row.id === 'number'
        ? fetch(`/api/inventory/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
        : fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
    ),
    ...deletedIds.map(id => fetch(`/api/inventory/${id}`, { method: 'DELETE' })),
  ])
  mutateInv()
  setBulkInv(false)
}
```

- [ ] **Step 4: Add "Bulk Wishlist" and "Bulk Inventory" buttons in the header**

Find the existing header buttons block ending with `+ Wishlist`:

```tsx
<button onClick={() => setShowAddInv(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
  + Inventory
</button>
<button onClick={() => setShowAddWish(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  + Wishlist
</button>
```

Replace with:

```tsx
<button onClick={() => setBulkInv(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
  Edit Inventory
</button>
<button onClick={() => setBulkWish(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
  Edit Wishlist
</button>
<button onClick={() => setShowAddInv(true)} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
  + Inventory
</button>
<button onClick={() => setShowAddWish(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  + Wishlist
</button>
```

- [ ] **Step 5: Wrap the normal layout and add the two BulkEditors**

The existing JSX return has this structure (between `{/* Shared filters */}` and `{/* Modals */}`):

```
{/* Shared filters */}         ← div.flex.gap-2.mb-6
{/* Column headers */}        ← div.grid.grid-cols-2...mb-2
{/* Per-category rows */}     ← the visibleCategories.map(...) block
{/* Purchased — not yet in inventory */}  ← the conditional mt-8 block
```

Wrap all four of those blocks inside one new `<div>`:

```tsx
<div className={bulkWish || bulkInv ? 'hidden' : ''}>
  {/* existing Shared filters div — unchanged */}
  {/* existing Column headers div — unchanged */}
  {/* existing Per-category rows block — unchanged */}
  {/* existing Purchased section — unchanged */}
</div>
```

Then, directly after the closing `</div>` of that wrapper, add:

```tsx
{bulkWish && (
  <BulkEditor
    columns={WISHLIST_COLUMNS}
    rows={wishItems.filter(i => !i.purchased).map(w => ({
      id: w.id,
      name: w.name,
      cost: w.cost,
      priority: w.priority,
      categoryId: String(w.categoryId),
      url: w.url ?? '',
      notes: w.notes ?? '',
    }))}
    csvHint="name,cost,priority,categoryId,url,notes"
    onSave={handleWishlistBulkSave}
    onCancel={() => setBulkWish(false)}
  />
)}

{bulkInv && (
  <BulkEditor
    columns={INVENTORY_COLUMNS}
    rows={invItems.map(i => ({
      id: i.id,
      name: i.name,
      cost: i.cost,
      quantity: i.quantity,
      purchaseDate: i.purchaseDate ? i.purchaseDate.slice(0, 10) : '',
      categoryId: String(i.categoryId),
      notes: i.notes ?? '',
    }))}
    csvHint="name,cost,quantity,purchaseDate,categoryId,notes"
    onSave={handleInventoryBulkSave}
    onCancel={() => setBulkInv(false)}
  />
)}
```

Do not change any JSX inside the wrapper div — only the outer wrapper and the two BulkEditor additions are new.

- [ ] **Step 6: Verify the build**

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: add bulk editor for wishlist and inventory in ItemsPage"
```

---

## Task 4: Wire BulkEditor into TravelPage (trips tab)

**Files:**
- Modify: `src/components/travel/TravelPage.tsx`

Context: TravelPage has two SWR hooks: `mutateCountries` and `mutateTrips`. The `trips` array contains `TravelTrip` objects where `cities` is `string[]` (array). When passing to BulkEditor, convert cities to a comma-joined string. In the save handler, split cities back. The existing API routes accept `countryName` (string) and auto-upsert the country. After bulk save, call both `mutateTrips()` and `mutateCountries()` since new country rows may be created.

- [ ] **Step 1: Add the import**

In `src/components/travel/TravelPage.tsx`, add after the existing imports:

```tsx
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'
```

- [ ] **Step 2: Add `bulkTrips` state inside `TravelPage`**

After `const [editTrip, setEditTrip] = useState<TravelTrip | null>(null)`, add:

```tsx
const [bulkTrips, setBulkTrips] = useState(false)
```

- [ ] **Step 3: Add the column schema and save handler**

After the `goToTripsFiltered` function, add:

```tsx
const TRIP_COLUMNS: ColumnDef[] = [
  { key: 'countryName', label: 'Country', type: 'text', required: true },
  { key: 'cities', label: 'Cities (comma-separated)', type: 'text' },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
  { key: 'actualCost', label: 'Cost (€)', type: 'number' },
  { key: 'rating', label: 'Rating (1–5)', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'text' },
]

async function handleTripsBulkSave({ upserted, deletedIds }: BulkChanges) {
  await Promise.all([
    ...upserted.map(row => {
      const cities = typeof row.cities === 'string'
        ? row.cities.split(',').map((c: string) => c.trim()).filter(Boolean)
        : []
      const body = { ...row, cities }
      return typeof row.id === 'number'
        ? fetch(`/api/travel/trips/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : fetch('/api/travel/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
    }),
    ...deletedIds.map(id => fetch(`/api/travel/trips/${id}`, { method: 'DELETE' })),
  ])
  mutateTrips()
  mutateCountries()
  setBulkTrips(false)
}
```

- [ ] **Step 4: Add "Edit All" button in the trips tab header and wire BulkEditor**

Find the existing add button in the page header:

```tsx
<button
  onClick={() => tab === 'countries' ? setAddingCountry(true) : setAddingTrip(true)}
  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
>
  {tab === 'countries' ? '+ Add Country' : '+ Add Trip'}
</button>
```

Replace it with:

```tsx
<div className="flex gap-2">
  {tab === 'trips' && (
    <button
      onClick={() => setBulkTrips(true)}
      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      Edit All
    </button>
  )}
  <button
    onClick={() => tab === 'countries' ? setAddingCountry(true) : setAddingTrip(true)}
    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
  >
    {tab === 'countries' ? '+ Add Country' : '+ Add Trip'}
  </button>
</div>
```

- [ ] **Step 5: Replace the trips grid with a conditional BulkEditor**

Find the trips tab section:

```tsx
      {/* Trips tab */}
      {tab === 'trips' && (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {['All', ...countries.map(c => c.name)].map(f => (
              ...
            ))}
          </div>
          {filteredTrips.length === 0 ? (
            <div className="text-center py-16 ...">
              ...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(t => (
                <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />
              ))}
            </div>
          )}
        </>
      )}
```

Replace with:

```tsx
      {/* Trips tab */}
      {tab === 'trips' && (
        <>
          {!bulkTrips && (
            <div className="flex gap-2 flex-wrap mb-6">
              {['All', ...countries.map(c => c.name)].map(f => (
                <button
                  key={f}
                  onClick={() => setCountryFilter(f)}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                    countryFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {bulkTrips ? (
            <BulkEditor
              columns={TRIP_COLUMNS}
              rows={trips.map(t => ({
                id: t.id,
                countryName: t.countryName,
                cities: t.cities.join(', '),
                startDate: t.startDate ?? '',
                endDate: t.endDate ?? '',
                actualCost: t.actualCost,
                rating: t.rating,
                notes: t.notes ?? '',
              }))}
              csvHint="countryName,cities,startDate,endDate,actualCost,rating,notes"
              onSave={handleTripsBulkSave}
              onCancel={() => setBulkTrips(false)}
            />
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {countryFilter === 'All'
                ? "No trips yet. Click '+ Add Trip' to log your first."
                : `No trips to ${countryFilter}.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(t => (
                <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />
              ))}
            </div>
          )}
        </>
      )}
```

- [ ] **Step 6: Verify the build**

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/travel/TravelPage.tsx
git commit -m "feat: add bulk editor for trips in TravelPage"
```

---

## Task 5: Wire BulkEditor into BucketListPage (trips tab)

**Files:**
- Modify: `src/components/bucket-list/BucketListPage.tsx`

Context: BucketListPage has `mutateTrips`. The `trips` array contains `BucketTrip` objects where `cities` is `string[]`. The `done` field is boolean. The existing API PUT route at `/api/bucket-list/trips/{id}` auto-imports a trip to Travel when `done` flips to `true` — this behavior still applies when bulk-saving, so marking a trip `done: true` via bulk edit will trigger the auto-import.

- [ ] **Step 1: Add the import**

In `src/components/bucket-list/BucketListPage.tsx`, add after the existing imports:

```tsx
import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'
```

- [ ] **Step 2: Add `bulkTrips` state inside `BucketListPage`**

After `const [showPrompt, setShowPrompt] = useState(false)`, add:

```tsx
const [bulkTrips, setBulkTrips] = useState(false)
```

- [ ] **Step 3: Add the column schema and save handler**

After the `buildBucketListPrompt` function, add:

```tsx
const BUCKET_TRIP_COLUMNS: ColumnDef[] = [
  { key: 'destination', label: 'Destination', type: 'text', required: true },
  { key: 'budget', label: 'Budget (€)', type: 'number' },
  { key: 'targetYear', label: 'Target Year', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'done', label: 'Done', type: 'boolean' },
]

async function handleBucketTripsBulkSave({ upserted, deletedIds }: BulkChanges) {
  await Promise.all([
    ...upserted.map(row =>
      typeof row.id === 'number'
        ? fetch(`/api/bucket-list/trips/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
        : fetch('/api/bucket-list/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          })
    ),
    ...deletedIds.map(id => fetch(`/api/bucket-list/trips/${id}`, { method: 'DELETE' })),
  ])
  mutateTrips()
  setBulkTrips(false)
}
```

- [ ] **Step 4: Replace the trips tab section with a BulkEditor-aware version**

Find the existing trips tab block:

```tsx
      {/* Trips tab */}
      {tab === 'trips' && (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {TRIP_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTripFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  tripFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filteredTrips.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {tripFilter === 'All'
                ? 'No trips yet. Click "+ Add Trip" to add your first.'
                : `No ${tripFilter.toLowerCase()} trips.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(t => (
                <TripCard
                  key={t.id}
                  trip={t}
                  onToggleDone={() => toggleTripDone(t)}
                  onClick={() => setEditTrip(t)}
                />
              ))}
            </div>
          )}
        </>
      )}
```

Replace it with:

```tsx
      {/* Trips tab */}
      {tab === 'trips' && (
        <>
          {!bulkTrips && (
            <div className="flex gap-2 flex-wrap mb-6">
              {TRIP_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setTripFilter(f)}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                    tripFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {bulkTrips ? (
            <BulkEditor
              columns={BUCKET_TRIP_COLUMNS}
              rows={trips.map(t => ({
                id: t.id,
                destination: t.destination,
                budget: t.budget,
                targetYear: t.targetYear,
                notes: t.notes ?? '',
                done: t.done,
              }))}
              csvHint="destination,budget,targetYear,notes,done"
              onSave={handleBucketTripsBulkSave}
              onCancel={() => setBulkTrips(false)}
            />
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              {tripFilter === 'All'
                ? 'No trips yet. Click "+ Add Trip" to add your first.'
                : `No ${tripFilter.toLowerCase()} trips.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(t => (
                <TripCard
                  key={t.id}
                  trip={t}
                  onToggleDone={() => toggleTripDone(t)}
                  onClick={() => setEditTrip(t)}
                />
              ))}
            </div>
          )}
        </>
      )}
```

- [ ] **Step 5: Add "Edit All" button to the page header**

Find the existing header buttons block:

```tsx
        <div className="flex gap-2">
          {(trips.length > 0 || experiences.length > 0) && (
            <button onClick={() => setShowPrompt(true)} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
              Generate AI Prompt
            </button>
          )}
          <button
            onClick={() => tab === 'trips' ? setAddingTrip(true) : setAddingExperience(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {tab === 'trips' ? '+ Add Trip' : '+ Add Experience'}
          </button>
        </div>
```

Replace it with:

```tsx
        <div className="flex gap-2">
          {(trips.length > 0 || experiences.length > 0) && (
            <button onClick={() => setShowPrompt(true)} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
              Generate AI Prompt
            </button>
          )}
          {tab === 'trips' && (
            <button
              onClick={() => setBulkTrips(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Edit All
            </button>
          )}
          <button
            onClick={() => tab === 'trips' ? setAddingTrip(true) : setAddingExperience(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            {tab === 'trips' ? '+ Add Trip' : '+ Add Experience'}
          </button>
        </div>
```

- [ ] **Step 6: Verify the build**

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/bucket-list/BucketListPage.tsx
git commit -m "feat: add bulk editor for trips in BucketListPage"
```

---

## Final verification

- [ ] **Manual smoke test — Subscriptions**

1. Start the dev server: `npm run dev`
2. Navigate to `/subscriptions`
3. Click "Edit All" — verify the subscription list is hidden and the editable table appears with all subscriptions
4. Edit a name cell — verify the input is editable
5. Mark a row for deletion (×) — verify it grays out; click ↩ to restore
6. Click "+ Add row" — verify a blank row appears
7. Click Cancel — verify the list reappears unchanged
8. Make a real edit, click Save — verify the page reloads with the change reflected
9. Paste a CSV row in the import textarea (e.g. `Claude,20,monthly,Software & Services,,,,true`) — verify "1 row detected" appears
10. Click Save — verify the new subscription appears in the list

- [ ] **Manual smoke test — Wishlist**

1. Navigate to `/wishlist`
2. Click "Edit Wishlist" — verify the editable table appears with unpurchased wishlist items
3. Category column shows a dropdown with your categories
4. Edit a cost, click Save — verify the change is reflected
5. Click Cancel — list reappears unchanged

- [ ] **Manual smoke test — Inventory**

1. On `/wishlist` (or `/inventory`), click "Edit Inventory"
2. Verify the table shows inventory items with quantity and purchase date columns
3. Edit quantity, Save — verify reflected in list

- [ ] **Manual smoke test — Travel Trips**

1. Navigate to `/travel`, click "Trips" tab
2. "Edit All" button appears — click it
3. Table shows all trips; cities shown as comma-separated string
4. Edit a row, Save — verify updated in list; `mutateCountries` runs so country tab stays accurate
5. Add a new trip via table (no id row) — verify it's created

- [ ] **Manual smoke test — Bucket List**

1. Navigate to `/bucket-list`, "Trips" tab
2. Click "Edit All" — table appears
3. Edit a trip, Save — verify reflected

- [ ] **Final commit if any fixes were needed during smoke test**

```bash
git add -A
git commit -m "fix: bulk editor smoke test corrections"
```
