# Phase 2: Matrices, Portfolio, Trends + Autostart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the three disabled sidebar pages (Matrices, Portfolio, Trends) and add Ubuntu autostart instructions to the README.

**Architecture:** Follows the exact same patterns established in Phase 1 — SWR for client data fetching, Next.js API route handlers calling Prisma, Tailwind dark-mode classes throughout. The full Prisma schema already exists and was migrated in Phase 1 — no new migrations needed. Trends uses a session-gated auto-snapshot on page visit; line charts are pure SVG (no charting library). Matrices uses an `InlineEdit` sub-component for click-to-edit cells.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Prisma v7 + better-sqlite3, SWR, TypeScript, SVG (charts)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/Sidebar.tsx` | Modify | Activate matrices/portfolio/trends links |
| `src/app/api/matrices/route.ts` | Create | GET list, POST create matrix |
| `src/app/api/matrices/[id]/route.ts` | Create | GET (with all relations), PUT, DELETE |
| `src/app/api/matrices/[id]/criteria/route.ts` | Create | GET, POST criterion |
| `src/app/api/matrices/criteria/[id]/route.ts` | Create | PUT, DELETE criterion |
| `src/app/api/matrices/[id]/options/route.ts` | Create | GET, POST option |
| `src/app/api/matrices/options/[id]/route.ts` | Create | PUT, DELETE option |
| `src/app/api/matrices/scores/route.ts` | Create | PUT upsert score |
| `src/components/matrices/MatricesPage.tsx` | Create | Full matrices page (score grid + bar chart) |
| `src/app/matrices/page.tsx` | Create | Page shell |
| `src/app/api/portfolio/route.ts` | Create | GET, POST holding |
| `src/app/api/portfolio/[id]/route.ts` | Create | PUT, DELETE holding |
| `src/components/portfolio/HoldingForm.tsx` | Create | Add/edit form (type-conditional fields) |
| `src/components/portfolio/PortfolioPage.tsx` | Create | Full portfolio page (inline price edit, P&L) |
| `src/app/portfolio/page.tsx` | Create | Page shell |
| `src/app/api/snapshots/route.ts` | Create | GET list, POST auto-snapshot |
| `src/components/trends/TrendsPage.tsx` | Create | SVG line charts + auto-snapshot on visit |
| `src/app/trends/page.tsx` | Create | Page shell |
| `README.md` | Modify | Add Ubuntu autostart section |

---

### Task 1: Activate sidebar links

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] In `src/components/Sidebar.tsx`, change the `active` field to `true` for matrices, portfolio, and trends:

```tsx
const NAV = [
  { href: '/wishlist', label: 'Wishlist', active: true },
  { href: '/inventory', label: 'Inventory', active: true },
  { href: '/matrices', label: 'Matrices', active: true },
  { href: '/portfolio', label: 'Portfolio', active: true },
  { href: '/trends', label: 'Trends', active: true },
]
```

- [ ] Commit:
```bash
git add src/components/Sidebar.tsx && git commit -m "feat: activate all sidebar links"
```

---

### Task 2: Matrices API routes

**Files:**
- Create: `src/app/api/matrices/route.ts`
- Create: `src/app/api/matrices/[id]/route.ts`
- Create: `src/app/api/matrices/[id]/criteria/route.ts`
- Create: `src/app/api/matrices/criteria/[id]/route.ts`
- Create: `src/app/api/matrices/[id]/options/route.ts`
- Create: `src/app/api/matrices/options/[id]/route.ts`
- Create: `src/app/api/matrices/scores/route.ts`

- [ ] Create `src/app/api/matrices/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const matrices = await prisma.matrix.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(matrices)
}

export async function POST(req: Request) {
  const { name, description } = await req.json()
  const matrix = await prisma.matrix.create({ data: { name, description } })
  return NextResponse.json(matrix, { status: 201 })
}
```

- [ ] Create `src/app/api/matrices/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const matrix = await prisma.matrix.findUnique({
    where: { id: Number(params.id) },
    include: { criteria: true, options: true, scores: true },
  })
  if (!matrix) return new NextResponse(null, { status: 404 })
  return NextResponse.json(matrix)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, description } = await req.json()
  const matrix = await prisma.matrix.update({
    where: { id: Number(params.id) },
    data: { name, description },
  })
  return NextResponse.json(matrix)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.matrix.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Create `src/app/api/matrices/[id]/criteria/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const criteria = await prisma.matrixCriteria.findMany({ where: { matrixId: Number(params.id) } })
  return NextResponse.json(criteria)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { name, weight } = await req.json()
  const criterion = await prisma.matrixCriteria.create({
    data: { name, weight: Number(weight), matrixId: Number(params.id) },
  })
  return NextResponse.json(criterion, { status: 201 })
}
```

- [ ] Create `src/app/api/matrices/criteria/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, weight } = await req.json()
  const criterion = await prisma.matrixCriteria.update({
    where: { id: Number(params.id) },
    data: { name, weight: Number(weight) },
  })
  return NextResponse.json(criterion)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.matrixCriteria.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Create `src/app/api/matrices/[id]/options/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const options = await prisma.matrixOption.findMany({ where: { matrixId: Number(params.id) } })
  return NextResponse.json(options)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { name } = await req.json()
  const option = await prisma.matrixOption.create({
    data: { name, matrixId: Number(params.id) },
  })
  return NextResponse.json(option, { status: 201 })
}
```

- [ ] Create `src/app/api/matrices/options/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name } = await req.json()
  const option = await prisma.matrixOption.update({
    where: { id: Number(params.id) },
    data: { name },
  })
  return NextResponse.json(option)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.matrixOption.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Create `src/app/api/matrices/scores/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request) {
  const { criteriaId, optionId, score } = await req.json()
  const matrixScore = await prisma.matrixScore.upsert({
    where: { optionId_criteriaId: { optionId: Number(optionId), criteriaId: Number(criteriaId) } },
    create: { score: Number(score), optionId: Number(optionId), criteriaId: Number(criteriaId) },
    update: { score: Number(score) },
  })
  return NextResponse.json(matrixScore)
}
```

- [ ] Commit:
```bash
git add src/app/api/matrices && git commit -m "feat: add matrices API routes"
```

---

### Task 3: MatricesPage component

**Files:**
- Create: `src/components/matrices/MatricesPage.tsx`
- Create: `src/app/matrices/page.tsx`

- [ ] Create `src/components/matrices/MatricesPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface MatrixSummary { id: number; name: string; description?: string }
interface Criterion { id: number; name: string; weight: number }
interface Option { id: number; name: string }
interface Score { id: number; score: number; optionId: number; criteriaId: number }
interface Matrix extends MatrixSummary {
  criteria: Criterion[]
  options: Option[]
  scores: Score[]
}

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  if (editing) {
    return (
      <input
        autoFocus value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { onSave(v); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(v); setEditing(false) } }}
        className="border rounded px-1 py-0.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white w-full min-w-0"
      />
    )
  }
  return (
    <button onClick={() => { setV(value); setEditing(true) }} className="text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300 truncate">
      {value}
    </button>
  )
}

export default function MatricesPage() {
  const { data: matrices = [], mutate: mutateList } = useSWR<MatrixSummary[]>('/api/matrices', fetcher)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const { data: matrix, mutate: mutateMatrix } = useSWR<Matrix>(
    selectedId ? `/api/matrices/${selectedId}` : null,
    fetcher
  )

  async function createMatrix() {
    if (!newName.trim()) return
    const res = await fetch('/api/matrices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc || null }),
    })
    const m = await res.json()
    setSelectedId(m.id)
    setNewName(''); setNewDesc(''); setShowCreate(false)
    mutateList()
  }

  async function deleteMatrix() {
    if (!selectedId || !confirm('Delete this matrix and all its data?')) return
    await fetch(`/api/matrices/${selectedId}`, { method: 'DELETE' })
    setSelectedId(null)
    mutateList()
  }

  async function addCriterion() {
    if (!selectedId) return
    await fetch(`/api/matrices/${selectedId}/criteria`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New criterion', weight: 0 }),
    })
    mutateMatrix()
  }

  async function updateCriterion(id: number, name: string, weight: number) {
    await fetch(`/api/matrices/criteria/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, weight }),
    })
    mutateMatrix()
  }

  async function deleteCriterion(id: number) {
    await fetch(`/api/matrices/criteria/${id}`, { method: 'DELETE' })
    mutateMatrix()
  }

  async function addOption() {
    if (!selectedId) return
    await fetch(`/api/matrices/${selectedId}/options`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New option' }),
    })
    mutateMatrix()
  }

  async function updateOption(id: number, name: string) {
    await fetch(`/api/matrices/options/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    mutateMatrix()
  }

  async function deleteOption(id: number) {
    await fetch(`/api/matrices/options/${id}`, { method: 'DELETE' })
    mutateMatrix()
  }

  async function updateScore(criteriaId: number, optionId: number, score: number) {
    await fetch('/api/matrices/scores', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteriaId, optionId, score }),
    })
    mutateMatrix()
  }

  const criteria = matrix?.criteria ?? []
  const options = matrix?.options ?? []
  const scores = matrix?.scores ?? []
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightWarning = criteria.length > 0 && Math.abs(totalWeight - 100) > 0.01

  function getScore(criteriaId: number, optionId: number) {
    return scores.find(s => s.criteriaId === criteriaId && s.optionId === optionId)?.score ?? 0
  }

  function getWeightedScore(optionId: number) {
    return criteria.reduce((total, c) => total + getScore(c.id, optionId) * c.weight / 100, 0)
  }

  const maxWS = Math.max(...options.map(o => getWeightedScore(o.id)), 0.001)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Matrices</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New matrix
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Matrix name" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          <div className="flex gap-2">
            <button onClick={createMatrix} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {matrices.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <select
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select a matrix…</option>
            {matrices.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {selectedId && (
            <button onClick={deleteMatrix} className="text-sm text-red-500 hover:underline">Delete</button>
          )}
        </div>
      )}

      {matrices.length === 0 && !showCreate && (
        <p className="text-sm text-gray-400 text-center py-12">No matrices yet. Create one to get started.</p>
      )}

      {matrix && (
        <div>
          {weightWarning && (
            <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-300">
              Weights sum to {totalWeight.toFixed(1)}% — they should sum to 100%.
            </div>
          )}

          <div className="overflow-x-auto mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wide">
                    Criterion
                  </th>
                  {options.map(opt => (
                    <th key={opt.id} className="px-4 py-3 text-center min-w-[120px]">
                      <InlineEdit value={opt.name} onSave={v => updateOption(opt.id, v)} />
                      <button onClick={() => deleteOption(opt.id)} className="block mx-auto mt-0.5 text-xs text-red-400 hover:text-red-600">✕</button>
                    </th>
                  ))}
                  <th className="px-4 py-3">
                    <button onClick={addOption} className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap">+ Option</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {criteria.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <InlineEdit value={c.name} onSave={v => updateCriterion(c.id, v, c.weight)} />
                        <input
                          type="number" min="0" max="100" step="1"
                          defaultValue={c.weight}
                          onBlur={e => updateCriterion(c.id, c.name, Number(e.target.value))}
                          className="w-14 border rounded px-1 py-0.5 text-xs text-center dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        />
                        <span className="text-xs text-gray-400">%</span>
                        <button onClick={() => deleteCriterion(c.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                      </div>
                    </td>
                    {options.map(opt => (
                      <td key={opt.id} className="px-4 py-3 text-center">
                        <input
                          type="number" min="0" max="10" step="1"
                          defaultValue={getScore(c.id, opt.id)}
                          onBlur={e => updateScore(c.id, opt.id, Math.max(0, Math.min(10, Number(e.target.value))))}
                          className="w-14 border rounded px-2 py-1 text-center text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
                {options.length > 0 && criteria.length > 0 && (
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Weighted Score
                    </td>
                    {options.map(opt => {
                      const ws = getWeightedScore(opt.id)
                      return (
                        <td key={opt.id} className="px-4 py-3 text-center">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">{ws.toFixed(2)}</div>
                          <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(ws / 10) * 100}%` }} />
                          </div>
                        </td>
                      )
                    })}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
              <button onClick={addCriterion} className="text-xs text-blue-500 hover:text-blue-700">+ Add criterion</button>
            </div>
          </div>

          {options.length > 0 && criteria.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Results (sorted by score)</h3>
              <div className="flex flex-col gap-2">
                {[...options]
                  .sort((a, b) => getWeightedScore(b.id) - getWeightedScore(a.id))
                  .map(opt => {
                    const ws = getWeightedScore(opt.id)
                    return (
                      <div key={opt.id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate shrink-0">{opt.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${(ws / maxWS) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right shrink-0">{ws.toFixed(2)}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] Create `src/app/matrices/page.tsx`:
```tsx
import MatricesPage from '@/components/matrices/MatricesPage'

export default function Page() {
  return <MatricesPage />
}
```

- [ ] Commit:
```bash
git add src/components/matrices src/app/matrices && git commit -m "feat: add Matrices page"
```

---

### Task 4: Portfolio API routes

**Files:**
- Create: `src/app/api/portfolio/route.ts`
- Create: `src/app/api/portfolio/[id]/route.ts`

- [ ] Create `src/app/api/portfolio/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const holdings = await prisma.portfolioHolding.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(holdings)
}

export async function POST(req: Request) {
  const { name, type, quantity, buyPrice, currentPrice, balance, interestRate, notes } = await req.json()
  const holding = await prisma.portfolioHolding.create({
    data: {
      name, type,
      quantity: quantity != null ? Number(quantity) : null,
      buyPrice: buyPrice != null ? Number(buyPrice) : null,
      currentPrice: currentPrice != null ? Number(currentPrice) : null,
      balance: balance != null ? Number(balance) : null,
      interestRate: interestRate != null ? Number(interestRate) : null,
      notes: notes ?? null,
    },
  })
  return NextResponse.json(holding, { status: 201 })
}
```

- [ ] Create `src/app/api/portfolio/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const holding = await prisma.portfolioHolding.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name, type: data.type,
      quantity: data.quantity != null ? Number(data.quantity) : null,
      buyPrice: data.buyPrice != null ? Number(data.buyPrice) : null,
      currentPrice: data.currentPrice != null ? Number(data.currentPrice) : null,
      balance: data.balance != null ? Number(data.balance) : null,
      interestRate: data.interestRate != null ? Number(data.interestRate) : null,
      notes: data.notes ?? null,
    },
  })
  return NextResponse.json(holding)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.portfolioHolding.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Commit:
```bash
git add src/app/api/portfolio && git commit -m "feat: add portfolio API routes"
```

---

### Task 5: Portfolio components

**Files:**
- Create: `src/components/portfolio/HoldingForm.tsx`
- Create: `src/components/portfolio/PortfolioPage.tsx`
- Create: `src/app/portfolio/page.tsx`

- [ ] Create `src/components/portfolio/HoldingForm.tsx`:
```tsx
'use client'

import { useState } from 'react'

interface Holding {
  id?: number; name: string; type: string
  quantity?: number | null; buyPrice?: number | null; currentPrice?: number | null
  balance?: number | null; interestRate?: number | null; notes?: string | null
}

interface Props {
  initial?: Holding
  onSave: () => void
  onCancel: () => void
}

export default function HoldingForm({ initial, onSave, onCancel }: Props) {
  const [type, setType] = useState(initial?.type ?? 'stock')
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '')
  const [buyPrice, setBuyPrice] = useState(initial?.buyPrice?.toString() ?? '')
  const [currentPrice, setCurrentPrice] = useState(initial?.currentPrice?.toString() ?? '')
  const [balance, setBalance] = useState(initial?.balance?.toString() ?? '')
  const [interestRate, setInterestRate] = useState(initial?.interestRate?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const isSavings = type === 'savings'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name, type,
      quantity: isSavings ? null : Number(quantity),
      buyPrice: isSavings ? null : Number(buyPrice),
      currentPrice: isSavings ? null : Number(currentPrice),
      balance: isSavings ? Number(balance) : null,
      interestRate: isSavings ? (interestRate ? Number(interestRate) : null) : null,
      notes: notes || null,
    }
    if (initial?.id) {
      await fetch(`/api/portfolio/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={field} />
      <select value={type} onChange={e => setType(e.target.value)} className={field}>
        <option value="stock">Stock</option>
        <option value="crypto">Crypto</option>
        <option value="savings">Savings</option>
        <option value="other">Other</option>
      </select>
      {isSavings ? (
        <>
          <input required type="number" min="0" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="Current balance" className={field} />
          <input type="number" min="0" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="Annual interest rate % (optional)" className={field} />
        </>
      ) : (
        <>
          <input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={field} />
          <input required type="number" min="0" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="Buy price per unit" className={field} />
          <input required type="number" min="0" step="0.01" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="Current price per unit" className={field} />
        </>
      )}
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={field} />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add holding'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}
```

- [ ] Create `src/components/portfolio/PortfolioPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import HoldingForm from './HoldingForm'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Holding {
  id: number; name: string; type: string
  quantity?: number | null; buyPrice?: number | null; currentPrice?: number | null
  balance?: number | null; interestRate?: number | null; notes?: string | null
}

const TYPE_COLOR: Record<string, string> = {
  stock: '#3b82f6', crypto: '#f59e0b', savings: '#10b981', other: '#8b5cf6',
}

function holdingValue(h: Holding): number {
  return h.type === 'savings' ? (h.balance ?? 0) : (h.currentPrice ?? 0) * (h.quantity ?? 0)
}

function holdingPnl(h: Holding): number {
  if (h.type === 'savings') return 0
  return ((h.currentPrice ?? 0) - (h.buyPrice ?? 0)) * (h.quantity ?? 0)
}

function projected(h: Holding): number {
  return (h.balance ?? 0) * (1 + (h.interestRate ?? 0) / 100)
}

export default function PortfolioPage() {
  const { data: holdings = [], mutate } = useSWR<Holding[]>('/api/portfolio', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [filterType, setFilterType] = useState('')

  const filtered = holdings.filter(h => !filterType || h.type === filterType)
  const totalValue = holdings.reduce((s, h) => s + holdingValue(h), 0)
  const nonSavings = holdings.filter(h => h.type !== 'savings')
  const totalPnl = nonSavings.reduce((s, h) => s + holdingPnl(h), 0)
  const totalCost = nonSavings.reduce((s, h) => s + (h.buyPrice ?? 0) * (h.quantity ?? 0), 0)

  const byType = ['stock', 'crypto', 'savings', 'other']
    .map(t => ({ type: t, total: holdings.filter(h => h.type === t).reduce((s, h) => s + holdingValue(h), 0) }))
    .filter(x => x.total > 0)

  async function savePriceInline(h: Holding) {
    const val = Number(priceInput)
    await fetch(`/api/portfolio/${h.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...h,
        currentPrice: h.type === 'savings' ? h.currentPrice : val,
        balance: h.type === 'savings' ? val : h.balance,
      }),
    })
    setEditingPriceId(null)
    mutate()
  }

  async function del(id: number) {
    if (!confirm('Delete this holding?')) return
    await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
        <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Add holding
        </button>
      </div>

      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: €{totalValue.toFixed(2)}</span>
        {nonSavings.length > 0 && (
          <span className={`text-sm font-semibold ${totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            P&amp;L: {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
            {totalCost > 0 && <span className="text-xs ml-1 opacity-70">({((totalPnl / totalCost) * 100).toFixed(1)}%)</span>}
          </span>
        )}
        {byType.map(x => <Badge key={x.type} color={TYPE_COLOR[x.type]}>{x.type} €{x.total.toFixed(2)}</Badge>)}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All types</option>
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
          <option value="savings">Savings</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Holdings list */}
      <div className="flex flex-col gap-2">
        {filtered.map(h => {
          const v = holdingValue(h)
          const p = holdingPnl(h)
          const isSavings = h.type === 'savings'
          const displayVal = isSavings ? (h.balance ?? 0) : (h.currentPrice ?? 0)

          return (
            <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{h.name}</span>
                  <Badge color={TYPE_COLOR[h.type]}>{h.type}</Badge>
                </div>
                {!isSavings && h.quantity != null && (
                  <p className="text-xs text-gray-400 mt-0.5">qty: {h.quantity} · buy: €{h.buyPrice?.toFixed(2)}</p>
                )}
                {isSavings && h.interestRate != null && h.interestRate > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">1yr projection: €{projected(h).toFixed(2)}</p>
                )}
                {h.notes && <p className="text-xs text-gray-400">{h.notes}</p>}
              </div>

              <div className="text-right shrink-0">
                {editingPriceId === h.id ? (
                  <input
                    autoFocus type="number" step="0.01" value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    onBlur={() => savePriceInline(h)}
                    onKeyDown={e => e.key === 'Enter' && savePriceInline(h)}
                    className="w-24 border rounded px-2 py-1 text-sm text-right dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingPriceId(h.id); setPriceInput(String(displayVal)) }}
                    className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    title={isSavings ? 'Click to update balance' : 'Click to update price'}
                  >
                    €{v.toFixed(2)}
                  </button>
                )}
                {!isSavings && (
                  <div className={`text-xs font-medium ${p >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {p >= 0 ? '+' : ''}€{p.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(h)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                <button onClick={() => del(h.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No holdings yet. Add one to get started.</p>
      )}

      {showAdd && (
        <Modal title="Add holding" onClose={() => setShowAdd(false)}>
          <HoldingForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit holding" onClose={() => setEditing(null)}>
          <HoldingForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
```

- [ ] Create `src/app/portfolio/page.tsx`:
```tsx
import PortfolioPage from '@/components/portfolio/PortfolioPage'

export default function Page() {
  return <PortfolioPage />
}
```

- [ ] Commit:
```bash
git add src/components/portfolio src/app/portfolio && git commit -m "feat: add Portfolio page"
```

---

### Task 6: Snapshots API

**Files:**
- Create: `src/app/api/snapshots/route.ts`

- [ ] Create `src/app/api/snapshots/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const snapshots = await prisma.snapshot.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(snapshots)
}

export async function POST() {
  const [wishlistItems, holdings] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { purchased: false } }),
    prisma.portfolioHolding.findMany(),
  ])

  const wishlistTotal = wishlistItems.reduce((s, i) => s + i.cost, 0)
  const portfolioTotal = holdings.reduce((s, h) => {
    if (h.type === 'savings') return s + (h.balance ?? 0)
    return s + (h.currentPrice ?? 0) * (h.quantity ?? 0)
  }, 0)

  const snapshot = await prisma.snapshot.create({
    data: { wishlistTotal, portfolioTotal },
  })
  return NextResponse.json(snapshot, { status: 201 })
}
```

- [ ] Commit:
```bash
git add src/app/api/snapshots && git commit -m "feat: add snapshots API route"
```

---

### Task 7: TrendsPage component

**Files:**
- Create: `src/components/trends/TrendsPage.tsx`
- Create: `src/app/trends/page.tsx`

- [ ] Create `src/components/trends/TrendsPage.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Snapshot {
  id: number; date: string; wishlistTotal: number; portfolioTotal: number
}

const SVG_W = 600
const SVG_H = 180
const PAD_L = 50
const PAD_R = 16
const PAD_T = 16
const PAD_B = 24

function LineChart({ data, color }: { data: { x: number; y: number }[]; color: string }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Not enough data yet — visit again to build up history.
      </p>
    )
  }

  const minX = Math.min(...data.map(d => d.x))
  const maxX = Math.max(...data.map(d => d.x))
  const minY = Math.min(...data.map(d => d.y))
  const maxY = Math.max(...data.map(d => d.y))
  const rangeX = maxX - minX || 1
  const rangeY = (maxY - minY) * 1.1 || 1
  const adjustedMinY = minY - (maxY - minY) * 0.05

  const cW = SVG_W - PAD_L - PAD_R
  const cH = SVG_H - PAD_T - PAD_B

  const toSx = (x: number) => PAD_L + ((x - minX) / rangeX) * cW
  const toSy = (y: number) => PAD_T + cH - ((y - adjustedMinY) / rangeY) * cH

  const pts = data.map(d => ({ sx: toSx(d.x), sy: toSy(d.y), y: d.y, x: d.x }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(' ')

  // Area fill path
  const areaD = `${pathD} L ${pts[pts.length - 1].sx.toFixed(1)} ${(PAD_T + cH).toFixed(1)} L ${pts[0].sx.toFixed(1)} ${(PAD_T + cH).toFixed(1)} Z`

  // Y-axis labels (3 ticks)
  const yTicks = [minY, (minY + maxY) / 2, maxY]

  // X-axis labels (first and last)
  const xLabels = [
    { sx: toSx(minX), label: new Date(minX).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) },
    { sx: toSx(maxX), label: new Date(maxX).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) },
  ]

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: SVG_H }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PAD_L} y1={toSy(tick).toFixed(1)}
            x2={SVG_W - PAD_R} y2={toSy(tick).toFixed(1)}
            stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4"
          />
          <text
            x={PAD_L - 4} y={toSy(tick) + 4}
            textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5"
          >
            €{tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick.toFixed(0)}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xLabels.map((l, i) => (
        <text
          key={i} x={l.sx} y={SVG_H - 4}
          textAnchor={i === 0 ? 'start' : 'end'}
          fontSize="9" fill="currentColor" opacity="0.5"
        >
          {l.label}
        </text>
      ))}

      {/* Area */}
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.sx.toFixed(1)} cy={p.sy.toFixed(1)} r="3" fill={color}>
          <title>€{p.y.toFixed(2)} · {new Date(p.x).toLocaleDateString()}</title>
        </circle>
      ))}
    </svg>
  )
}

export default function TrendsPage() {
  const { data: snapshots = [], mutate } = useSWR<Snapshot[]>('/api/snapshots', fetcher)

  useEffect(() => {
    const today = new Date().toDateString()
    if (sessionStorage.getItem('lastSnapshot') === today) return
    fetch('/api/snapshots', { method: 'POST' }).then(() => {
      sessionStorage.setItem('lastSnapshot', today)
      mutate()
    })
  }, [mutate])

  const sorted = [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const wishlistData = sorted.map(s => ({ x: new Date(s.date).getTime(), y: s.wishlistTotal }))
  const portfolioData = sorted.map(s => ({ x: new Date(s.date).getTime(), y: s.portfolioTotal }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Trends</h1>

      <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Wishlist Total Over Time</h2>
          <LineChart data={wishlistData} color="#3b82f6" />
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Portfolio Value Over Time</h2>
          <LineChart data={portfolioData} color="#10b981" />
        </div>

        <p className="text-xs text-gray-400 text-center">
          {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} recorded.
          A new snapshot is taken once per session on this page.
        </p>
      </div>
    </div>
  )
}
```

- [ ] Create `src/app/trends/page.tsx`:
```tsx
import TrendsPage from '@/components/trends/TrendsPage'

export default function Page() {
  return <TrendsPage />
}
```

- [ ] Commit:
```bash
git add src/components/trends src/app/trends && git commit -m "feat: add Trends page with SVG line charts"
```

---

### Task 8: README autostart section

**Files:**
- Modify: `README.md`

- [ ] Read the existing `README.md` to check current content, then append (or create if missing) an **Autostart on Ubuntu** section. The full README content should be:

```markdown
# Personal Assistant

A personal-use local web app for tracking wishlists, inventory, decision matrices, and a financial portfolio.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Autostart on Ubuntu

To have the app start automatically when you log in, create a **systemd user service**.

### Option A — systemd user service (recommended)

1. Create the service file:

```bash
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/personal-assistant.service << 'EOF'
[Unit]
Description=Personal Assistant web app
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/than/PersonalAssistant
ExecStart=/usr/bin/npm run dev
Restart=on-failure
Environment=NODE_ENV=development
Environment=PORT=3000

[Install]
WantedBy=default.target
EOF
```

2. Enable and start it:

```bash
systemctl --user daemon-reload
systemctl --user enable personal-assistant
systemctl --user start personal-assistant
```

3. Verify it's running:

```bash
systemctl --user status personal-assistant
```

4. To view logs:

```bash
journalctl --user -u personal-assistant -f
```

> **Note:** For `systemctl --user` services to persist after logout, run once:
> `sudo loginctl enable-linger $USER`

### Option B — GNOME autostart (desktop entry)

If you use GNOME and prefer a lighter approach, create an autostart `.desktop` file:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/personal-assistant.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Personal Assistant
Exec=bash -c 'cd /home/than/PersonalAssistant && npm run dev'
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

This runs on login and is stopped when you log out. No persistence between sessions.

### Stopping the service (Option A)

```bash
systemctl --user stop personal-assistant
systemctl --user disable personal-assistant  # remove from autostart
```
```

- [ ] Commit:
```bash
git add README.md && git commit -m "docs: add Ubuntu autostart instructions"
```

---

### Task 9: Build verification

- [ ] Run type check:
```bash
npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] Run Next.js build:
```bash
npx next build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully` with all pages listed including `/matrices`, `/portfolio`, `/trends`.

- [ ] If build passes, commit any fixes made:
```bash
git add -A && git commit -m "fix: resolve build errors for phase 2 pages"
```
(Skip this commit if no fixes were needed.)
