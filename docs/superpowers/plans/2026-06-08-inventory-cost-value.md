# Inventory Cost & Current Value Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `cost` (what was paid) and computed `value` (current market worth) to every inventory item, with per-category compound depreciation formulas and a manual override per item.

**Architecture:** A shared `computeValue` utility resolves value from: explicit override → compound depreciation formula (if category configured) → cost fallback. Category gains `valueMethod` and `depreciationRate` fields. InventoryItem gains `currentValue` (nullable override). All display surfaces (cards, summary strip, PDF, weekly review) use `computeValue`.

**Tech Stack:** Next.js 14, Prisma 7 + SQLite, React 18, SWR, Tailwind CSS, TypeScript, Vitest (unit tests for utility)

**Spec:** `docs/superpowers/specs/2026-06-08-inventory-cost-value-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `valueMethod`, `depreciationRate` to Category; `currentValue` to InventoryItem |
| `src/lib/inventoryUtils.ts` | Create | `computeValue` pure utility function |
| `src/lib/inventoryUtils.test.ts` | Create | Vitest unit tests for `computeValue` |
| `vitest.config.ts` | Create | Vitest config |
| `src/app/api/categories/route.ts` | Modify | POST accepts `valueMethod`, `depreciationRate` |
| `src/app/api/categories/[id]/route.ts` | Modify | PUT accepts `valueMethod`, `depreciationRate` |
| `src/app/api/inventory/route.ts` | Modify | POST accepts `currentValue` |
| `src/app/api/inventory/[id]/route.ts` | Modify | PUT accepts `currentValue` |
| `src/components/categories/CategoryManager.tsx` | Modify | Value method + rate form fields |
| `src/components/inventory/InventoryForm.tsx` | Modify | `currentValue` override field with live estimate |
| `src/components/inventory/UpdateValuesModal.tsx` | Create | Two-tab modal: Get Prompt / Apply Values |
| `src/components/items/ItemsPage.tsx` | Modify | Types, card display, summary strip, bulk editor, Update Values button |
| `src/lib/exportPdf.ts` | Modify | Inventory table: add Value column, update totals |
| `src/components/weeklyreview/WeeklyReviewPage.tsx` | Modify | Show `currentValue ?? cost` per item |

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to schema**

Open `prisma/schema.prisma`. The `Category` model currently is:
```prisma
model Category {
  id             Int             @id @default(autoincrement())
  name           String
  color          String
  wishlistItems  WishlistItem[]
  inventoryItems InventoryItem[]
}
```

Replace it with:
```prisma
model Category {
  id              Int             @id @default(autoincrement())
  name            String
  color           String
  valueMethod     String          @default("cost")
  depreciationRate Float?
  wishlistItems   WishlistItem[]
  inventoryItems  InventoryItem[]
}
```

The `InventoryItem` model currently is:
```prisma
model InventoryItem {
  id              Int           @id @default(autoincrement())
  name            String
  cost            Float
  quantity        Int           @default(1)
  purchaseDate    DateTime?
  notes           String?
  categoryId      Int
  category        Category      @relation(fields: [categoryId], references: [id])
  upgradeTargetId Int?
  upgradeTarget   WishlistItem? @relation("UpgradeTarget", fields: [upgradeTargetId], references: [id])
  createdAt       DateTime      @default(now())
}
```

Replace it with:
```prisma
model InventoryItem {
  id              Int           @id @default(autoincrement())
  name            String
  cost            Float
  currentValue    Float?
  quantity        Int           @default(1)
  purchaseDate    DateTime?
  notes           String?
  categoryId      Int
  category        Category      @relation(fields: [categoryId], references: [id])
  upgradeTargetId Int?
  upgradeTarget   WishlistItem? @relation("UpgradeTarget", fields: [upgradeTargetId], references: [id])
  createdAt       DateTime      @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/than/PersonalAssistant
npx prisma migrate dev --name add_inventory_value
```

Expected output: `The following migration(s) have been applied: .../add_inventory_value/migration.sql`

- [ ] **Step 3: Verify migration**

```bash
npx prisma studio
```

Open browser at the URL shown. Confirm `Category` table has `valueMethod` and `depreciationRate` columns. Confirm `InventoryItem` has `currentValue`. Close Prisma Studio.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add valueMethod/depreciationRate to Category, currentValue to InventoryItem"
```

---

## Task 2: `computeValue` Utility (TDD)

**Files:**
- Create: `src/lib/inventoryUtils.ts`
- Create: `src/lib/inventoryUtils.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
cd /home/than/PersonalAssistant
npm install -D vitest
```

Expected: vitest added to devDependencies in package.json.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

Add test script to `package.json` scripts (add alongside the existing scripts):
```json
"test": "vitest run"
```

- [ ] **Step 3: Write the failing tests**

Create `src/lib/inventoryUtils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeValue } from './inventoryUtils'

describe('computeValue', () => {
  it('returns currentValue override when set', () => {
    expect(computeValue(
      { cost: 1000, currentValue: 800, purchaseDate: '2024-01-01' },
      { valueMethod: 'depreciation', depreciationRate: 0.15 }
    )).toBe(800)
  })

  it('applies compound depreciation when method is depreciation', () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)
    const value = computeValue(
      { cost: 10000, currentValue: null, purchaseDate: twoYearsAgo },
      { valueMethod: 'depreciation', depreciationRate: 0.10 }
    )
    // 10000 * (0.9)^2 = 8100, allow ±100 for date floating point
    expect(value).toBeGreaterThan(8000)
    expect(value).toBeLessThan(8200)
  })

  it('falls back to cost when method is cost', () => {
    expect(computeValue(
      { cost: 500, currentValue: null, purchaseDate: '2024-01-01' },
      { valueMethod: 'cost', depreciationRate: null }
    )).toBe(500)
  })

  it('falls back to cost when purchaseDate is null', () => {
    expect(computeValue(
      { cost: 500, currentValue: null, purchaseDate: null },
      { valueMethod: 'depreciation', depreciationRate: 0.15 }
    )).toBe(500)
  })

  it('falls back to cost when depreciationRate is null', () => {
    expect(computeValue(
      { cost: 500, currentValue: null, purchaseDate: '2024-01-01' },
      { valueMethod: 'depreciation', depreciationRate: null }
    )).toBe(500)
  })

  it('clamps value to zero minimum (fully depreciated)', () => {
    const tenYearsAgo = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)
    const value = computeValue(
      { cost: 1000, currentValue: null, purchaseDate: tenYearsAgo },
      { valueMethod: 'depreciation', depreciationRate: 0.50 }
    )
    expect(value).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 4: Run tests — confirm they fail**

```bash
npm test
```

Expected: 6 failures with "Cannot find module './inventoryUtils'"

- [ ] **Step 5: Implement `computeValue`**

Create `src/lib/inventoryUtils.ts`:
```typescript
export interface CategoryForValue {
  valueMethod: string
  depreciationRate: number | null
}

export interface ItemForValue {
  cost: number
  currentValue: number | null | undefined
  purchaseDate: string | null | undefined
}

export function computeValue(item: ItemForValue, category: CategoryForValue): number {
  if (item.currentValue !== null && item.currentValue !== undefined) {
    return item.currentValue
  }
  if (
    category.valueMethod === 'depreciation' &&
    category.depreciationRate !== null &&
    item.purchaseDate
  ) {
    const ms = Date.now() - new Date(item.purchaseDate).getTime()
    const years = ms / (365.25 * 24 * 60 * 60 * 1000)
    return Math.max(0, item.cost * Math.pow(1 - category.depreciationRate, years))
  }
  return item.cost
}
```

- [ ] **Step 6: Run tests — confirm they pass**

```bash
npm test
```

Expected: `6 passed`

- [ ] **Step 7: Commit**

```bash
git add src/lib/inventoryUtils.ts src/lib/inventoryUtils.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add computeValue utility with compound depreciation"
```

---

## Task 3: Category API — Accept New Fields

**Files:**
- Modify: `src/app/api/categories/route.ts`
- Modify: `src/app/api/categories/[id]/route.ts`

- [ ] **Step 1: Update POST handler**

Replace `src/app/api/categories/route.ts` with:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { name, color, valueMethod, depreciationRate } = await req.json()
  const category = await prisma.category.create({
    data: {
      name,
      color,
      valueMethod: valueMethod ?? 'cost',
      depreciationRate: depreciationRate !== undefined && depreciationRate !== null
        ? Number(depreciationRate)
        : null,
    },
  })
  return NextResponse.json(category, { status: 201 })
}
```

- [ ] **Step 2: Update PUT handler**

Replace `src/app/api/categories/[id]/route.ts` with:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, color, valueMethod, depreciationRate } = await req.json()
  const category = await prisma.category.update({
    where: { id: Number(params.id) },
    data: {
      name,
      color,
      valueMethod: valueMethod ?? 'cost',
      depreciationRate: depreciationRate !== undefined && depreciationRate !== null
        ? Number(depreciationRate)
        : null,
    },
  })
  return NextResponse.json(category)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.category.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verify in browser**

Start dev server (`npm run dev`). Open the app → Items → Categories. Create a new category. Open browser DevTools → Network → filter for `categories`. Confirm the POST response includes `valueMethod: "cost"` and `depreciationRate: null`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/categories/route.ts src/app/api/categories/[id]/route.ts
git commit -m "feat: category API accepts valueMethod and depreciationRate"
```

---

## Task 4: Inventory API — Accept `currentValue`

**Files:**
- Modify: `src/app/api/inventory/route.ts`
- Modify: `src/app/api/inventory/[id]/route.ts`

- [ ] **Step 1: Update POST handler**

Replace `src/app/api/inventory/route.ts` with:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.inventoryItem.findMany({
    include: { category: true, upgradeTarget: { select: { id: true, name: true, cost: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { name, cost, quantity, purchaseDate, notes, categoryId, upgradeTargetId, currentValue } = await req.json()
  const item = await prisma.inventoryItem.create({
    data: {
      name,
      cost: Number(cost),
      currentValue: currentValue !== undefined && currentValue !== null ? Number(currentValue) : null,
      quantity: Number(quantity ?? 1),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      notes: notes ?? null,
      categoryId: Number(categoryId),
      upgradeTargetId: upgradeTargetId ? Number(upgradeTargetId) : null,
    },
    include: { category: true, upgradeTarget: { select: { id: true, name: true, cost: true } } },
  })
  return NextResponse.json(item, { status: 201 })
}
```

- [ ] **Step 2: Update PUT handler**

Replace `src/app/api/inventory/[id]/route.ts` with:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const item = await prisma.inventoryItem.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name,
      cost: Number(data.cost),
      currentValue: data.currentValue !== undefined && data.currentValue !== null
        ? Number(data.currentValue)
        : null,
      quantity: Number(data.quantity ?? 1),
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      notes: data.notes ?? null,
      categoryId: Number(data.categoryId),
      upgradeTargetId: data.upgradeTargetId ? Number(data.upgradeTargetId) : null,
    },
    include: { category: true, upgradeTarget: { select: { id: true, name: true, cost: true } } },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.inventoryItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verify in browser**

In DevTools Network, add an inventory item and confirm the POST response includes `"currentValue": null` and `"category"` has `valueMethod` and `depreciationRate` fields.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/inventory/route.ts src/app/api/inventory/[id]/route.ts
git commit -m "feat: inventory API accepts and returns currentValue"
```

---

## Task 5: CategoryManager UI — Value Method Fields

**Files:**
- Modify: `src/components/categories/CategoryManager.tsx`

- [ ] **Step 1: Replace CategoryManager with updated version**

Replace the entire file `src/components/categories/CategoryManager.tsx` with:
```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRESET_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

interface Category {
  id: number
  name: string
  color: string
  valueMethod: string
  depreciationRate: number | null
}

export default function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data: categories = [], mutate } = useSWR<Category[]>('/api/categories', fetcher)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [valueMethod, setValueMethod] = useState('cost')
  const [depreciationRate, setDepreciationRate] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  async function save() {
    if (!name.trim()) return
    const body = {
      name,
      color,
      valueMethod,
      depreciationRate: valueMethod === 'depreciation' && depreciationRate
        ? Number(depreciationRate) / 100
        : null,
    }
    if (editing) {
      await fetch(`/api/categories/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setName(''); setColor(PRESET_COLORS[0]); setValueMethod('cost'); setDepreciationRate(''); setEditing(null)
    mutate()
  }

  async function del(id: number) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    mutate()
  }

  function startEdit(cat: Category) {
    setEditing(cat)
    setName(cat.name)
    setColor(cat.color)
    setValueMethod(cat.valueMethod ?? 'cost')
    setDepreciationRate(cat.depreciationRate !== null && cat.depreciationRate !== undefined
      ? String(Math.round(cat.depreciationRate * 100))
      : '')
  }

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
            <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.name}</span>
            {cat.valueMethod === 'depreciation' && cat.depreciationRate !== null && (
              <span className="text-xs text-amber-500">↓{Math.round(cat.depreciationRate * 100)}%/yr</span>
            )}
            <button onClick={() => startEdit(cat)} className="text-blue-500 hover:underline">Edit</button>
            <button onClick={() => del(cat.id)} className="text-red-500 hover:underline">Delete</button>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col gap-3">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Category name"
          className={field}
        />
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <select value={valueMethod} onChange={e => setValueMethod(e.target.value)} className={field}>
          <option value="cost">Value = Cost (default)</option>
          <option value="depreciation">Depreciation (compound %/year)</option>
        </select>
        {valueMethod === 'depreciation' && (
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" max="99" step="1"
              value={depreciationRate} onChange={e => setDepreciationRate(e.target.value)}
              placeholder="Annual rate (e.g. 15)"
              className={field}
            />
            <span className="text-sm text-gray-500 shrink-0">% / year</span>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
            {editing ? 'Update' : 'Add Category'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setName(''); setColor(PRESET_COLORS[0]); setValueMethod('cost'); setDepreciationRate('') }}
              className="px-3 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Close</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open Items page → Categories modal. Create a new category with "Depreciation" method and rate 15. Confirm the depreciation rate input appears. Confirm the category list shows `↓15%/yr`. Edit the category and confirm the rate field pre-fills with `15`.

- [ ] **Step 3: Commit**

```bash
git add src/components/categories/CategoryManager.tsx
git commit -m "feat: category manager UI shows value method and depreciation rate"
```

---

## Task 6: InventoryForm UI — Current Value Override

**Files:**
- Modify: `src/components/inventory/InventoryForm.tsx`

- [ ] **Step 1: Replace InventoryForm with updated version**

Replace the entire file `src/components/inventory/InventoryForm.tsx` with:
```typescript
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { computeValue } from '@/lib/inventoryUtils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category {
  id: number
  name: string
  color: string
  valueMethod: string
  depreciationRate: number | null
}
interface WishlistItem { id: number; name: string; cost: number }
interface InventoryItem {
  id?: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number
  upgradeTargetId?: number; currentValue?: number | null
}

interface Props {
  initial?: InventoryItem
  onSave: () => void
  onCancel: () => void
}

export default function InventoryForm({ initial, onSave, onCancel }: Props) {
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const { data: wishlistItems = [] } = useSWR<WishlistItem[]>('/api/wishlist', fetcher)
  const [name, setName] = useState(initial?.name ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '1')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ? initial.purchaseDate.slice(0, 10) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId?.toString() ?? '')
  const [upgradeTargetId, setUpgradeTargetId] = useState(initial?.upgradeTargetId?.toString() ?? '')
  const [currentValue, setCurrentValue] = useState(
    initial?.currentValue !== null && initial?.currentValue !== undefined
      ? initial.currentValue.toString()
      : ''
  )

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(String(categories[0].id))
  }, [categories, categoryId])

  const selectedCat = categories.find(c => c.id === Number(categoryId))
  const estimate = selectedCat && cost
    ? computeValue(
        { cost: Number(cost), currentValue: null, purchaseDate: purchaseDate || null },
        { valueMethod: selectedCat.valueMethod ?? 'cost', depreciationRate: selectedCat.depreciationRate ?? null }
      )
    : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name,
      cost: Number(cost),
      currentValue: currentValue !== '' ? Number(currentValue) : null,
      quantity: Number(quantity),
      purchaseDate: purchaseDate || null,
      notes: notes || null,
      categoryId: Number(categoryId),
      upgradeTargetId: upgradeTargetId ? Number(upgradeTargetId) : null,
    }
    if (initial?.id) {
      await fetch(`/api/inventory/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Item name" className={field} />
      <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost paid (€)" className={field} />
      <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={field} />
      <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={field} />
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={field} required>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input
        type="number" min="0" step="0.01"
        value={currentValue}
        onChange={e => setCurrentValue(e.target.value)}
        placeholder={estimate !== null ? `Value override — estimated: €${estimate.toFixed(2)}` : 'Value override (optional)'}
        className={field}
      />
      <select value={upgradeTargetId} onChange={e => setUpgradeTargetId(e.target.value)} className={field}>
        <option value="">No upgrade target</option>
        {wishlistItems.map(w => <option key={w.id} value={w.id}>{w.name} (€{w.cost.toFixed(2)})</option>)}
      </select>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={field} />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add item'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open Items → + Inventory. Select a category that has depreciation configured (e.g. Vehicles at 15%/yr). Enter cost 20000 and a purchase date 1 year ago. Confirm the value override placeholder shows an estimated value ~€17,000. Leave override empty and save. Then edit the item and confirm currentValue is null (placeholder still shows estimate).

- [ ] **Step 3: Commit**

```bash
git add src/components/inventory/InventoryForm.tsx
git commit -m "feat: inventory form shows value estimate, accepts currentValue override"
```

---

## Task 7: Items Page — Types, Card Display, Summary Strip, Bulk Editor

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

- [ ] **Step 1: Update `Category` and `InventoryItem` interfaces**

In `src/components/items/ItemsPage.tsx`, find the two interface definitions near the top:
```typescript
interface Category { id: number; name: string; color: string }

// ...

interface InventoryItem {
  id: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number
  category: Category; upgradeTarget?: { id: number; name: string; cost: number }
}
```

Replace the `Category` interface with:
```typescript
interface Category {
  id: number; name: string; color: string
  valueMethod: string; depreciationRate: number | null
}
```

Replace the `InventoryItem` interface with:
```typescript
interface InventoryItem {
  id: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number
  currentValue?: number | null
  category: Category; upgradeTarget?: { id: number; name: string; cost: number }
}
```

- [ ] **Step 2: Add `computeValue` import**

At the top of the file, after `const fetcher = ...`, add:
```typescript
import { computeValue } from '@/lib/inventoryUtils'
```

Actually, imports must be at the top. Add it after the existing imports block:
```typescript
import { computeValue } from '@/lib/inventoryUtils'
```

Place it after `import BulkEditor, { type ColumnDef, type BulkChanges } from '@/components/ui/BulkEditor'`.

- [ ] **Step 3: Update summary strip totals**

Find:
```typescript
const invTotal = invItems.reduce((s, i) => s + i.cost * i.quantity, 0)
```

Replace with:
```typescript
const invCostTotal = invItems.reduce((s, i) => s + i.cost * i.quantity, 0)
const invValueTotal = invItems.reduce((s, i) => s + computeValue(i, i.category) * i.quantity, 0)
const invNetDelta = invValueTotal - invCostTotal
```

- [ ] **Step 4: Update summary strip JSX**

Find:
```typescript
<span className="text-gray-500 dark:text-gray-400">Owned value: <span className="font-semibold text-gray-800 dark:text-gray-200">€{invTotal.toFixed(2)}</span></span>
```

Replace with:
```typescript
<span className="text-gray-500 dark:text-gray-400">Cost: <span className="font-semibold text-gray-800 dark:text-gray-200">€{invCostTotal.toFixed(2)}</span></span>
<span className="text-gray-300 dark:text-gray-600">·</span>
<span className="text-gray-500 dark:text-gray-400">Value: <span className="font-semibold text-gray-800 dark:text-gray-200">€{invValueTotal.toFixed(2)}</span></span>
{Math.abs(invNetDelta) > 0.01 && (
  <span className={`font-semibold text-sm ${invNetDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
    {invNetDelta > 0 ? '+' : ''}€{invNetDelta.toFixed(2)}
  </span>
)}
```

- [ ] **Step 5: Update inventory card display**

Find the inventory card price block (inside the `catInv.map` section):
```typescript
<div className="text-right shrink-0">
  <span className="text-sm font-semibold text-gray-900 dark:text-white">€{(item.cost * item.quantity).toFixed(2)}</span>
  <div className="flex gap-1 mt-1 justify-end">
```

Replace with:
```typescript
<div className="text-right shrink-0">
  {(() => {
    const val = computeValue(item, item.category)
    const totalVal = val * item.quantity
    const totalCost = item.cost * item.quantity
    const delta = totalVal - totalCost
    const isEstimated = (item.currentValue === null || item.currentValue === undefined) && item.category.valueMethod === 'depreciation'
    return (
      <>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {isEstimated ? '~' : ''}€{totalVal.toFixed(2)}
        </span>
        {Math.abs(delta) > 0.01 && (
          <div className={`text-xs ${delta > 0 ? 'text-green-500' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}€{delta.toFixed(2)}
          </div>
        )}
        <div className="text-xs text-gray-400">cost €{totalCost.toFixed(2)}</div>
      </>
    )
  })()}
  <div className="flex gap-1 mt-1 justify-end">
```

- [ ] **Step 6: Add `currentValue` column to bulk editor**

Find `INVENTORY_COLUMNS`:
```typescript
const INVENTORY_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'cost', label: 'Cost (€)', type: 'number', required: true },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
  { key: 'categoryId', label: 'Category', type: 'select', options: categories.map(c => ({ label: c.name, value: String(c.id) })) },
  { key: 'notes', label: 'Notes', type: 'text' },
]
```

Replace with:
```typescript
const INVENTORY_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'cost', label: 'Cost (€)', type: 'number', required: true },
  { key: 'currentValue', label: 'Value Override (€)', type: 'number' },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
  { key: 'categoryId', label: 'Category', type: 'select', options: categories.map(c => ({ label: c.name, value: String(c.id) })) },
  { key: 'notes', label: 'Notes', type: 'text' },
]
```

Find the bulk editor rows builder:
```typescript
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
```

Replace with:
```typescript
rows={invItems.map(i => ({
  id: i.id,
  name: i.name,
  cost: i.cost,
  currentValue: i.currentValue ?? '',
  quantity: i.quantity,
  purchaseDate: i.purchaseDate ? i.purchaseDate.slice(0, 10) : '',
  categoryId: String(i.categoryId),
  notes: i.notes ?? '',
}))}
csvHint="name,cost,currentValue,quantity,purchaseDate,categoryId,notes"
```

- [ ] **Step 7: Verify in browser**

- Open Items page. Inventory cards should now show value with `~` prefix for formula-estimated items, cost (muted), and delta (green/red).
- Summary strip should show Cost, Value, and net delta.
- Click "Edit Inventory" (bulk editor) — confirm "Value Override (€)" column appears.

- [ ] **Step 8: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: items page shows cost, value, and delta for inventory; updates summary strip"
```

---

## Task 8: UpdateValuesModal Component

**Files:**
- Create: `src/components/inventory/UpdateValuesModal.tsx`

- [ ] **Step 1: Create UpdateValuesModal**

Create `src/components/inventory/UpdateValuesModal.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { computeValue } from '@/lib/inventoryUtils'

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
    const val = computeValue(i, i.category)
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/UpdateValuesModal.tsx
git commit -m "feat: UpdateValuesModal with Get Prompt and Apply Values tabs"
```

---

## Task 9: Items Page — Wire "Update Values" Button

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

- [ ] **Step 1: Import UpdateValuesModal**

Add to the import block at the top of `src/components/items/ItemsPage.tsx`:
```typescript
import UpdateValuesModal from '@/components/inventory/UpdateValuesModal'
import Modal from '@/components/ui/Modal'
```

`Modal` is already imported — skip that line if it is. Only add `UpdateValuesModal`.

- [ ] **Step 2: Add state for the modal**

In the state declarations block (after the other `useState` calls), add:
```typescript
const [showUpdateValues, setShowUpdateValues] = useState(false)
```

- [ ] **Step 3: Add the apply handler**

After the `handleInventoryBulkSave` function, add:
```typescript
async function handleApplyValues(updates: { id: number; currentValue: number }[]) {
  await Promise.all(
    updates.map(u =>
      fetch(`/api/inventory/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: u.currentValue }),
      })
    )
  )
  mutateInv()
}
```

Wait — this PUT will send only `currentValue`, but the route handler expects all fields. The PUT handler uses `data.name`, `data.cost`, etc. Sending a partial update will set those to `undefined`. 

Fix: the `handleApplyValues` must fetch the current item and merge. Instead, change the PUT to handle partial updates, OR merge in the handler.

Use this approach in `handleApplyValues` — fetch current item data and merge:
```typescript
async function handleApplyValues(updates: { id: number; currentValue: number }[]) {
  await Promise.all(
    updates.map(u => {
      const item = invItems.find(i => i.id === u.id)
      if (!item) return Promise.resolve()
      return fetch(`/api/inventory/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          cost: item.cost,
          currentValue: u.currentValue,
          quantity: item.quantity,
          purchaseDate: item.purchaseDate ?? null,
          notes: item.notes ?? null,
          categoryId: item.categoryId,
          upgradeTargetId: item.upgradeTarget?.id ?? null,
        }),
      })
    })
  )
  mutateInv()
}
```

- [ ] **Step 4: Add the "Update Values" button in the header**

Find the header button row that contains `+ Inventory` and `+ Wishlist`. Add a new button before `+ Inventory`:
```typescript
<button onClick={() => setShowUpdateValues(true)} disabled={invItems.length === 0}
  className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
  Update Values
</button>
```

- [ ] **Step 5: Add the modal JSX**

In the modals section at the bottom (before the closing `</div>`), add:
```typescript
{showUpdateValues && (
  <Modal title="Update Inventory Values" onClose={() => setShowUpdateValues(false)}>
    <UpdateValuesModal
      items={invItems}
      onApply={handleApplyValues}
      onClose={() => setShowUpdateValues(false)}
    />
  </Modal>
)}
```

- [ ] **Step 6: Verify in browser**

- Click "Update Values" button. Confirm modal opens with "Get Prompt" tab showing a list of items.
- Click "Copy to Clipboard". Paste into a text editor to confirm format.
- Switch to "Apply Values" tab. Paste a test response like `Item Name | €500` (use an actual item name). Click "Preview". Confirm the update appears. Click "Apply". Confirm the card updates to show the new value.

- [ ] **Step 7: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: wire Update Values button and modal in Items page"
```

---

## Task 10: PDF Export — Inventory Value Column

**Files:**
- Modify: `src/lib/exportPdf.ts`

- [ ] **Step 1: Add computeValue import**

Open `src/lib/exportPdf.ts`. Add at the top (after existing imports):
```typescript
import { computeValue } from '@/lib/inventoryUtils'
```

- [ ] **Step 2: Update inventory section**

Find:
```typescript
// Inventory
const invTotal = inventory.reduce((s: number, i: { cost: number; quantity: number }) => s + i.cost * i.quantity, 0)
const invRows = inventory.map((i: { name: string; category: { name: string } | null; quantity: number; cost: number }) =>
  `<tr><td>${esc(i.name)}</td><td>${esc(i.category?.name)}</td><td>${i.quantity}</td><td>${fmt(i.cost * i.quantity)}</td></tr>`
).join('')
```

Replace with:
```typescript
// Inventory
type InvItem = { name: string; category: { name: string; valueMethod: string; depreciationRate: number | null } | null; quantity: number; cost: number; currentValue: number | null; purchaseDate: string | null }
const invCostTotal = inventory.reduce((s: number, i: InvItem) => s + i.cost * i.quantity, 0)
const invValueTotal = inventory.reduce((s: number, i: InvItem) => {
  const cat = i.category ?? { valueMethod: 'cost', depreciationRate: null }
  return s + computeValue({ cost: i.cost, currentValue: i.currentValue, purchaseDate: i.purchaseDate }, cat) * i.quantity
}, 0)
const invRows = inventory.map((i: InvItem) => {
  const cat = i.category ?? { valueMethod: 'cost', depreciationRate: null }
  const val = computeValue({ cost: i.cost, currentValue: i.currentValue, purchaseDate: i.purchaseDate }, cat)
  return `<tr><td>${esc(i.name)}</td><td>${esc(i.category?.name)}</td><td>${i.quantity}</td><td>${fmt(i.cost * i.quantity)}</td><td>${fmt(val * i.quantity)}</td></tr>`
}).join('')
```

- [ ] **Step 3: Update inventory table HTML**

Find:
```typescript
<h2>Inventory (${inventory.length} items · ${fmt(invTotal)} total)</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Quantity</th><th>Total Cost</th></tr></thead>
  <tbody>${invRows}</tbody>
</table>
```

Replace with:
```typescript
<h2>Inventory (${inventory.length} items · cost ${fmt(invCostTotal)} · value ${fmt(invValueTotal)})</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Quantity</th><th>Cost</th><th>Value</th></tr></thead>
  <tbody>${invRows}</tbody>
</table>
```

- [ ] **Step 4: Verify**

Trigger a PDF export in the browser. Confirm the inventory table shows both Cost and Value columns. Confirm the section heading shows both cost and value totals.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportPdf.ts
git commit -m "feat: PDF export inventory shows cost and value columns"
```

---

## Task 11: Weekly Review — Show Current Value

**Files:**
- Modify: `src/components/weeklyreview/WeeklyReviewPage.tsx`

- [ ] **Step 1: Update InventoryItemRow type**

Open `src/components/weeklyreview/WeeklyReviewPage.tsx`. Find the `InventoryItemRow` type (around line 24). It will look something like:
```typescript
inventoryItems: InventoryItemRow[]
```

Find the actual interface/type definition for `InventoryItemRow`. Add `currentValue?: number | null` to it.

For example, if it is:
```typescript
interface InventoryItemRow { id: number; name: string; cost: number }
```

Replace with:
```typescript
interface InventoryItemRow { id: number; name: string; cost: number; currentValue?: number | null }
```

- [ ] **Step 2: Update display to prefer currentValue**

Find the line that formats each inventory item in the AI prompt text (around line 147):
```typescript
inventoryItems.map(i => `- ${i.name} — €${i.cost.toFixed(2)}`)
```

Replace with:
```typescript
inventoryItems.map(i => {
  const displayVal = (i.currentValue !== null && i.currentValue !== undefined) ? i.currentValue : i.cost
  return `- ${i.name} — €${displayVal.toFixed(2)}`
})
```

Find the JSX rendering of inventory items (around line 309):
```typescript
{data.inventoryItems.map(i => (
```

Look for where `i.cost` is displayed in the card JSX and update it to show `currentValue ?? cost`:
```typescript
const displayVal = (i.currentValue !== null && i.currentValue !== undefined) ? i.currentValue : i.cost
```

Then use `displayVal` in the price display.

- [ ] **Step 3: Verify**

Navigate to the Weekly Review page. Confirm inventory items display the override value if set.

- [ ] **Step 4: Commit**

```bash
git add src/components/weeklyreview/WeeklyReviewPage.tsx
git commit -m "feat: weekly review shows currentValue for inventory items"
```

---

## Self-Review Checklist

- [x] Schema: `valueMethod`, `depreciationRate` on Category; `currentValue` on InventoryItem
- [x] `computeValue`: handles override → depreciation formula → cost fallback; clamps to 0
- [x] Category API: GET returns new fields; POST/PUT accept and persist them
- [x] Inventory API: GET returns `currentValue` (via Prisma include); POST/PUT accept it
- [x] CategoryManager: shows depreciation rate badge in list; form shows/hides rate input
- [x] InventoryForm: placeholder shows live estimate; saves `currentValue` as null when empty
- [x] Items page cards: show value (with `~` if estimated), cost (muted), delta (green/red)
- [x] Summary strip: Cost · Value · net delta
- [x] Bulk editor: `currentValue` column added
- [x] UpdateValuesModal: Get Prompt tab generates prompt; Apply Values tab parses + previews + applies
- [x] `handleApplyValues`: merges current item data before PUT (avoids partial update issue)
- [x] PDF: Cost and Value columns; section header shows both totals
- [x] Weekly review: shows `currentValue ?? cost`
- [x] `computeValue` type interfaces (`CategoryForValue`, `ItemForValue`) exported — usable across all surfaces
