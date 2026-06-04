# Collectibles Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Collectibles tab to the existing Items page so the user can track cards, Funko Pops, Lego, figures, and books with type-specific metadata fields, purchase price, and current estimated market value.

**Architecture:** A new `CollectibleItem` Prisma model stores items with a `metadata String?` field (JSON-serialized, following the same pattern as `cities` in `TravelTrip`). Two new API routes handle CRUD. Two new React components (`CollectiblesTab`, `CollectibleForm`) handle the UI. `ItemsPage` gets a tab switcher so users can toggle between "Inventory & Wishlist" and "Collectibles" without changing the existing layout.

**Tech Stack:** Next.js 14 App Router, Prisma/SQLite, React 18, TypeScript, SWR, Tailwind CSS

---

## File Map

| Action | File |
|---|---|
| Modify | `prisma/schema.prisma` — add `CollectibleItem` model |
| Create | `src/app/api/collectibles/route.ts` — GET all, POST create |
| Create | `src/app/api/collectibles/[id]/route.ts` — PUT update, DELETE |
| Create | `src/components/items/CollectibleForm.tsx` — add/edit modal form |
| Create | `src/components/items/CollectiblesTab.tsx` — tab content with collapsible sections |
| Modify | `src/components/items/ItemsPage.tsx` — add tab switcher |

---

## Task 1: Add CollectibleItem to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

At the end of the file, before the closing (or just after the last model), add:

```prisma
model CollectibleItem {
  id             Int      @id @default(autoincrement())
  name           String
  collectionType String
  quantity       Int      @default(1)
  purchasePrice  Float?
  currentValue   Float?
  condition      String?
  notes          String?
  metadata       String?
  createdAt      DateTime @default(now())
}
```

Note: `metadata` is `String?` — JSON-serialized on write, parsed on read. This matches the pattern used by `cities` in `TravelTrip`.

- [ ] **Step 2: Push schema to database**

Run: `npx prisma db push`
Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add CollectibleItem schema"
```

---

## Task 2: Create collectibles API routes

**Files:**
- Create: `src/app/api/collectibles/route.ts`
- Create: `src/app/api/collectibles/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/collectibles/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.collectibleItem.findMany({
    orderBy: [{ collectionType: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(
    items.map(item => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }))
  )
}

export async function POST(req: Request) {
  const { name, collectionType, quantity, purchasePrice, currentValue, condition, notes, metadata } = await req.json()
  const item = await prisma.collectibleItem.create({
    data: {
      name,
      collectionType,
      quantity: Number(quantity ?? 1),
      purchasePrice: purchasePrice != null ? Number(purchasePrice) : null,
      currentValue: currentValue != null ? Number(currentValue) : null,
      condition: condition ?? null,
      notes: notes ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
  return NextResponse.json({ ...item, metadata: item.metadata ? JSON.parse(item.metadata) : null }, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/collectibles/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, collectionType, quantity, purchasePrice, currentValue, condition, notes, metadata } = await req.json()
  const item = await prisma.collectibleItem.update({
    where: { id: Number(params.id) },
    data: {
      name,
      collectionType,
      quantity: Number(quantity ?? 1),
      purchasePrice: purchasePrice != null ? Number(purchasePrice) : null,
      currentValue: currentValue != null ? Number(currentValue) : null,
      condition: condition ?? null,
      notes: notes ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
  return NextResponse.json({ ...item, metadata: item.metadata ? JSON.parse(item.metadata) : null })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.collectibleItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/collectibles/route.ts src/app/api/collectibles/[id]/route.ts
git commit -m "feat: collectibles API routes (GET, POST, PUT, DELETE)"
```

---

## Task 3: Create CollectibleForm component

**Files:**
- Create: `src/components/items/CollectibleForm.tsx`

- [ ] **Step 1: Create `src/components/items/CollectibleForm.tsx`**

```tsx
'use client'

import { useState } from 'react'

const COLLECTION_TYPES = ['Cards', 'Funko Pop', 'Lego', 'Figures', 'Books'] as const

interface CollectibleItem {
  id: number
  name: string
  collectionType: string
  quantity: number
  purchasePrice: number | null
  currentValue: number | null
  condition: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
}

export default function CollectibleForm({ initial, defaultType, onSave, onCancel }: {
  initial?: CollectibleItem
  defaultType?: string
  onSave: () => void
  onCancel: () => void
}) {
  const [collectionType, setCollectionType] = useState(initial?.collectionType ?? defaultType ?? 'Cards')
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '1')
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice?.toString() ?? '')
  const [currentValue, setCurrentValue] = useState(initial?.currentValue?.toString() ?? '')
  const [condition, setCondition] = useState(initial?.condition ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const m = (initial?.metadata ?? {}) as Record<string, unknown>

  // Cards
  const [cardSet, setCardSet] = useState((m.set as string) ?? '')
  const [cardRarity, setCardRarity] = useState((m.rarity as string) ?? '')
  const [cardGrade, setCardGrade] = useState((m.grade as string) ?? '')
  const [cardGradingCompany, setCardGradingCompany] = useState((m.gradingCompany as string) ?? 'None')
  const [cardLanguage, setCardLanguage] = useState((m.language as string) ?? '')

  // Funko Pop
  const [funkoNumber, setFunkoNumber] = useState((m.number as string) ?? '')
  const [funkoSeries, setFunkoSeries] = useState((m.series as string) ?? '')
  const [funkoExclusive, setFunkoExclusive] = useState((m.exclusive as string) ?? 'None')
  const [funkoVaulted, setFunkoVaulted] = useState((m.vaulted as boolean) ?? false)
  const [funkoBoxCondition, setFunkoBoxCondition] = useState((m.boxCondition as string) ?? '')

  // Lego
  const [legoSetNumber, setLegoSetNumber] = useState((m.setNumber as string) ?? '')
  const [legoTheme, setLegoTheme] = useState((m.theme as string) ?? '')
  const [legoYear, setLegoYear] = useState(m.year != null ? String(m.year) : '')
  const [legoSealed, setLegoSealed] = useState((m.sealed as boolean) ?? false)
  const [legoPieceCount, setLegoPieceCount] = useState(m.pieceCount != null ? String(m.pieceCount) : '')
  const [legoMinifigCount, setLegoMinifigCount] = useState(m.minifigureCount != null ? String(m.minifigureCount) : '')

  // Figures
  const [figFranchise, setFigFranchise] = useState((m.franchise as string) ?? '')
  const [figBrand, setFigBrand] = useState((m.brand as string) ?? '')
  const [figScale, setFigScale] = useState((m.scale as string) ?? '')
  const [figSealed, setFigSealed] = useState((m.sealed as boolean) ?? false)

  // Books
  const [bookSeries, setBookSeries] = useState((m.series as string) ?? '')
  const [bookVolume, setBookVolume] = useState((m.volumeNumber as string) ?? '')
  const [bookAuthor, setBookAuthor] = useState((m.author as string) ?? '')
  const [bookPublisher, setBookPublisher] = useState((m.publisher as string) ?? '')
  const [bookLanguage, setBookLanguage] = useState((m.language as string) ?? '')

  function buildMetadata(): Record<string, unknown> {
    switch (collectionType) {
      case 'Cards':
        return {
          set: cardSet || null,
          rarity: cardRarity || null,
          grade: cardGrade || null,
          gradingCompany: cardGradingCompany !== 'None' ? cardGradingCompany : null,
          language: cardLanguage || null,
        }
      case 'Funko Pop':
        return {
          number: funkoNumber || null,
          series: funkoSeries || null,
          exclusive: funkoExclusive !== 'None' ? funkoExclusive : null,
          vaulted: funkoVaulted,
          boxCondition: funkoBoxCondition || null,
        }
      case 'Lego':
        return {
          setNumber: legoSetNumber || null,
          theme: legoTheme || null,
          year: legoYear ? Number(legoYear) : null,
          sealed: legoSealed,
          pieceCount: legoPieceCount ? Number(legoPieceCount) : null,
          minifigureCount: legoMinifigCount ? Number(legoMinifigCount) : null,
        }
      case 'Figures':
        return {
          franchise: figFranchise || null,
          brand: figBrand || null,
          scale: figScale || null,
          sealed: figSealed,
        }
      case 'Books':
        return {
          series: bookSeries || null,
          volumeNumber: bookVolume || null,
          author: bookAuthor || null,
          publisher: bookPublisher || null,
          language: bookLanguage || null,
        }
      default:
        return {}
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name,
      collectionType,
      quantity: Number(quantity) || 1,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      currentValue: currentValue ? Number(currentValue) : null,
      condition: condition || null,
      notes: notes || null,
      metadata: buildMetadata(),
    }
    if (initial?.id) {
      await fetch(`/api/collectibles/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/collectibles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white'
  const chk = 'flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
      {/* Type */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Collection type</label>
        <select disabled={!!initial?.id} value={collectionType} onChange={e => setCollectionType(e.target.value)} className={inp}>
          {COLLECTION_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Common fields */}
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={inp} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={inp} />
        <select value={condition} onChange={e => setCondition(e.target.value)} className={inp}>
          <option value="">Condition…</option>
          {['Mint', 'Near Mint', 'Good', 'Fair', 'Poor'].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="Purchase price (€)" className={inp} />
        <input type="number" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="Current value (€)" className={inp} />
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={`${inp} resize-none`} />

      {/* Type-specific fields */}
      {collectionType === 'Cards' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Card details</p>
          <input value={cardSet} onChange={e => setCardSet(e.target.value)} placeholder="Set name (e.g. Base Set)" className={inp} />
          <select value={cardRarity} onChange={e => setCardRarity(e.target.value)} className={inp}>
            <option value="">Rarity…</option>
            {['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare', 'Secret Rare', 'Promo'].map(r => <option key={r}>{r}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={cardGrade} onChange={e => setCardGrade(e.target.value)} placeholder="Grade (e.g. PSA 9)" className={inp} />
            <select value={cardGradingCompany} onChange={e => setCardGradingCompany(e.target.value)} className={inp}>
              {['None', 'PSA', 'BGS', 'CGC'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <input value={cardLanguage} onChange={e => setCardLanguage(e.target.value)} placeholder="Language (e.g. EN, JP)" className={inp} />
        </div>
      )}

      {collectionType === 'Funko Pop' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Funko Pop details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={funkoNumber} onChange={e => setFunkoNumber(e.target.value)} placeholder="#Number" className={inp} />
            <input value={funkoSeries} onChange={e => setFunkoSeries(e.target.value)} placeholder="Series / Franchise" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={funkoExclusive} onChange={e => setFunkoExclusive(e.target.value)} className={inp}>
              {['None', 'Amazon', 'GameStop', 'Target', 'Hot Topic', 'BoxLunch', 'SDCC', 'Other'].map(x => <option key={x}>{x}</option>)}
            </select>
            <select value={funkoBoxCondition} onChange={e => setFunkoBoxCondition(e.target.value)} className={inp}>
              <option value="">Box condition…</option>
              {['Mint', 'Good', 'Damaged'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <label className={chk}>
            <input type="checkbox" checked={funkoVaulted} onChange={e => setFunkoVaulted(e.target.checked)} className="accent-blue-500" />
            Vaulted
          </label>
        </div>
      )}

      {collectionType === 'Lego' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lego details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={legoSetNumber} onChange={e => setLegoSetNumber(e.target.value)} placeholder="Set number (e.g. 75192)" className={inp} />
            <input value={legoTheme} onChange={e => setLegoTheme(e.target.value)} placeholder="Theme (e.g. Star Wars)" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={legoYear} onChange={e => setLegoYear(e.target.value)} placeholder="Year" className={inp} />
            <input type="number" value={legoPieceCount} onChange={e => setLegoPieceCount(e.target.value)} placeholder="Pieces" className={inp} />
            <input type="number" value={legoMinifigCount} onChange={e => setLegoMinifigCount(e.target.value)} placeholder="Minifigs" className={inp} />
          </div>
          <label className={chk}>
            <input type="checkbox" checked={legoSealed} onChange={e => setLegoSealed(e.target.checked)} className="accent-blue-500" />
            Sealed / Unopened
          </label>
        </div>
      )}

      {collectionType === 'Figures' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Figure details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={figFranchise} onChange={e => setFigFranchise(e.target.value)} placeholder="Franchise (e.g. Dragon Ball Z)" className={inp} />
            <input value={figBrand} onChange={e => setFigBrand(e.target.value)} placeholder="Brand (e.g. Bandai)" className={inp} />
          </div>
          <input value={figScale} onChange={e => setFigScale(e.target.value)} placeholder="Scale (e.g. 1:12)" className={inp} />
          <label className={chk}>
            <input type="checkbox" checked={figSealed} onChange={e => setFigSealed(e.target.checked)} className="accent-blue-500" />
            Sealed / In box
          </label>
        </div>
      )}

      {collectionType === 'Books' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Book / Manga / Comic details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={bookSeries} onChange={e => setBookSeries(e.target.value)} placeholder="Series (e.g. One Piece)" className={inp} />
            <input value={bookVolume} onChange={e => setBookVolume(e.target.value)} placeholder="Vol. / Issue #" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} placeholder="Author / Artist" className={inp} />
            <input value={bookPublisher} onChange={e => setBookPublisher(e.target.value)} placeholder="Publisher" className={inp} />
          </div>
          <input value={bookLanguage} onChange={e => setBookLanguage(e.target.value)} placeholder="Language (e.g. EN, JP)" className={inp} />
        </div>
      )}

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

- [ ] **Step 2: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/items/CollectibleForm.tsx
git commit -m "feat: CollectibleForm component with type-specific fields"
```

---

## Task 4: Create CollectiblesTab component

**Files:**
- Create: `src/components/items/CollectiblesTab.tsx`

- [ ] **Step 1: Create `src/components/items/CollectiblesTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import CollectibleForm from './CollectibleForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CollectibleItem {
  id: number
  name: string
  collectionType: string
  quantity: number
  purchasePrice: number | null
  currentValue: number | null
  condition: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const COLLECTION_TYPES = [
  { key: 'Cards', emoji: '🃏' },
  { key: 'Funko Pop', emoji: '👾' },
  { key: 'Lego', emoji: '🧱' },
  { key: 'Figures', emoji: '🎭' },
  { key: 'Books', emoji: '📚' },
]

function metaSummary(item: CollectibleItem): string {
  const m = item.metadata ?? {}
  switch (item.collectionType) {
    case 'Cards': {
      const parts = [m.set, m.grade].filter(Boolean)
      return (parts as string[]).join(' · ')
    }
    case 'Funko Pop': {
      const parts = [
        m.number ? `#${m.number}` : null,
        m.exclusive && m.exclusive !== 'None' ? `${m.exclusive} exclusive` : null,
      ].filter(Boolean)
      return (parts as string[]).join(' · ')
    }
    case 'Lego': {
      const sealed = m.sealed ? 'Sealed' : m.sealed === false ? 'Opened' : null
      return ([m.setNumber, sealed].filter(Boolean) as string[]).join(' · ')
    }
    case 'Figures': {
      return ([m.franchise, m.brand].filter(Boolean) as string[]).join(' · ')
    }
    case 'Books': {
      const vol = m.volumeNumber ? `Vol. ${m.volumeNumber}` : null
      return ([m.series, vol].filter(Boolean) as string[]).join(' · ')
    }
    default:
      return ''
  }
}

export default function CollectiblesTab() {
  const { data: items = [], mutate } = useSWR<CollectibleItem[]>('/api/collectibles', fetcher)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(COLLECTION_TYPES.map(t => t.key))
  )
  const [editItem, setEditItem] = useState<CollectibleItem | null>(null)
  const [addingType, setAddingType] = useState<string | null>(null)

  function toggleExpanded(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function deleteItem(id: number) {
    if (!confirm('Delete this collectible?')) return
    await fetch(`/api/collectibles/${id}`, { method: 'DELETE' })
    mutate()
  }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalPaid = items.reduce((s, i) => s + (i.purchasePrice ?? 0) * i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + ((i.currentValue ?? i.purchasePrice ?? 0)) * i.quantity, 0)

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm mb-4 text-gray-500 dark:text-gray-400">
          <span><span className="font-semibold text-gray-800 dark:text-gray-200">{totalItems}</span> items</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Paid <span className="font-semibold text-gray-800 dark:text-gray-200">€{totalPaid.toFixed(2)}</span></span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Value <span className="font-semibold text-green-600 dark:text-green-400">€{totalValue.toFixed(2)}</span></span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {COLLECTION_TYPES.map(({ key, emoji }) => {
          const typeItems = items.filter(i => i.collectionType === key)
          const isExpanded = expanded.has(key)

          return (
            <div key={key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => toggleExpanded(key)}
              >
                <div className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{key}</span>
                  <span className="text-xs text-gray-400">({typeItems.length})</span>
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setAddingType(key)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    + Add
                  </button>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▾' : '▸'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {typeItems.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 italic">No {key.toLowerCase()} added yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {typeItems.map(item => {
                        const summary = metaSummary(item)
                        const displayValue = item.currentValue ?? item.purchasePrice
                        return (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">{item.name}</span>
                              {summary && (
                                <span className="text-xs text-gray-400 truncate block">{summary}</span>
                              )}
                            </div>
                            {item.quantity > 1 && (
                              <span className="text-xs text-gray-400 shrink-0">×{item.quantity}</span>
                            )}
                            {displayValue != null && (
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">
                                €{(displayValue * item.quantity).toFixed(2)}
                              </span>
                            )}
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => setEditItem(item)}
                                className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-xs px-1.5 py-0.5 text-red-500 border border-red-200 rounded hover:bg-red-50 dark:border-red-900/30"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {addingType && (
        <Modal title={`Add ${addingType}`} onClose={() => setAddingType(null)}>
          <CollectibleForm
            defaultType={addingType}
            onSave={() => { setAddingType(null); mutate() }}
            onCancel={() => setAddingType(null)}
          />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit collectible" onClose={() => setEditItem(null)}>
          <CollectibleForm
            initial={editItem}
            onSave={() => { setEditItem(null); mutate() }}
            onCancel={() => setEditItem(null)}
          />
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/items/CollectiblesTab.tsx
git commit -m "feat: CollectiblesTab with collapsible sections and stats bar"
```

---

## Task 5: Add Collectibles tab to ItemsPage

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

- [ ] **Step 1: Add import for CollectiblesTab**

At the top of `src/components/items/ItemsPage.tsx`, after the existing imports, add:

```tsx
import CollectiblesTab from './CollectiblesTab'
```

- [ ] **Step 2: Add `activeView` state**

After `const [bulkInv, setBulkInv] = useState(false)` (around line 49), add:

```tsx
const [activeView, setActiveView] = useState<'items' | 'collectibles'>('items')
```

- [ ] **Step 3: Add the tab bar after the header `<div>` block**

Find the comment `{/* Summary strip */}` (around line 199). Insert the following BEFORE it:

```tsx
      {/* View tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setActiveView('items')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeView === 'items'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Inventory &amp; Wishlist
        </button>
        <button
          onClick={() => setActiveView('collectibles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeView === 'collectibles'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Collectibles
        </button>
      </div>
```

- [ ] **Step 4: Wrap existing content in an `activeView === 'items'` guard**

Find the comment `{/* Summary strip */}` (around line 199) and the very end of the component just before the Modals section (the `</div>{/* end hidden wrapper */}` line around line 354).

Wrap that entire block — from `{/* Summary strip */}` through to just before the modals — in:

```tsx
{activeView === 'items' && (
  <>
    {/* Summary strip */}
    ... (existing summary strip, filters, category grid, purchased section, bulk editors)
  </>
)}
```

Then, after the closing `</>` of that block and before the first modal (`{showAddWish && ...}`), add:

```tsx
{activeView === 'collectibles' && <CollectiblesTab />}
```

- [ ] **Step 5: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: add Collectibles tab to ItemsPage"
```
