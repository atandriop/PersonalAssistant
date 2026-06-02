# Gift Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gift Planner page where people have a list of gift ideas with optional occasions, costs, and purchased toggles, tracked against an optional per-person budget.

**Architecture:** Two new Prisma models (GiftPerson, GiftIdea) with a REST API following existing patterns. The `/gifts` page fetches all people with nested ideas via a single SWR call; budget bars and purchased counts are computed client-side; person cards expand in-place to show idea rows.

**Tech Stack:** Next.js 14 App Router, Prisma + SQLite (better-sqlite3 adapter), SWR, Tailwind CSS, TypeScript

---

## File Map

| Action | Path |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `prisma/migrations/<ts>_add_gifts/migration.sql` (auto-generated) |
| Create | `src/app/api/gifts/people/route.ts` |
| Create | `src/app/api/gifts/people/[id]/route.ts` |
| Create | `src/app/api/gifts/people/[id]/ideas/route.ts` |
| Create | `src/app/api/gifts/ideas/[id]/route.ts` |
| Create | `src/app/gifts/page.tsx` |
| Create | `src/components/gifts/GiftsPage.tsx` |
| Modify | `src/components/Sidebar.tsx` |

---

## Task 1: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Append two new models at the end of `prisma/schema.prisma`**

```prisma
model GiftPerson {
  id        Int        @id @default(autoincrement())
  name      String
  budget    Float?
  notes     String?
  ideas     GiftIdea[]
  createdAt DateTime   @default(now())
}

model GiftIdea {
  id           Int        @id @default(autoincrement())
  giftPersonId Int
  giftPerson   GiftPerson @relation(fields: [giftPersonId], references: [id], onDelete: Cascade)
  title        String
  occasion     String?
  estimatedCost Float?
  purchased    Boolean    @default(false)
  notes        String?
  createdAt    DateTime   @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_gifts
```

Expected: `The following migration(s) have been applied: migrations/<timestamp>_add_gifts/migration.sql`

- [ ] **Step 3: Verify**

```bash
npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>/dev/null | grep -E "Gift"
```

Expected output includes `GiftIdea` and `GiftPerson`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add GiftPerson and GiftIdea Prisma models"
```

---

## Task 2: Gift People API

**Files:**
- Create: `src/app/api/gifts/people/route.ts`
- Create: `src/app/api/gifts/people/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/gifts/people/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const people = await prisma.giftPerson.findMany({
    orderBy: { createdAt: 'asc' },
    include: { ideas: { orderBy: { createdAt: 'asc' } } },
  })
  return NextResponse.json(people)
}

export async function POST(req: Request) {
  const { name, budget, notes } = await req.json()
  const person = await prisma.giftPerson.create({
    data: { name, budget: budget != null ? Number(budget) : null, notes: notes ?? null },
  })
  return NextResponse.json(person, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/gifts/people/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, budget, notes } = await req.json()
  const person = await prisma.giftPerson.update({
    where: { id: Number(params.id) },
    data: { name, budget: budget != null ? Number(budget) : null, notes: notes ?? null },
  })
  return NextResponse.json(person)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.giftPerson.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verify via curl (dev server on port 4100)**

```bash
curl -s -X POST http://localhost:4100/api/gifts/people \
  -H 'Content-Type: application/json' \
  -d '{"name":"Mum","budget":100}' | jq .
# Expected: {"id":1,"name":"Mum","budget":100,"notes":null,"createdAt":"..."}

curl -s http://localhost:4100/api/gifts/people | jq '.[0] | {name, budget, ideas: .ideas|length}'
# Expected: {"name":"Mum","budget":100,"ideas":0}

curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:4100/api/gifts/people/1
# Expected: 204
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/gifts/
git commit -m "feat: add gift people CRUD API"
```

---

## Task 3: Gift Ideas API

**Files:**
- Create: `src/app/api/gifts/people/[id]/ideas/route.ts`
- Create: `src/app/api/gifts/ideas/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/gifts/people/[id]/ideas/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { title, occasion, estimatedCost, notes } = await req.json()
  const idea = await prisma.giftIdea.create({
    data: {
      giftPersonId: Number(params.id),
      title,
      occasion: occasion ?? null,
      estimatedCost: estimatedCost != null ? Number(estimatedCost) : null,
      notes: notes ?? null,
    },
  })
  return NextResponse.json(idea, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/gifts/ideas/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, occasion, estimatedCost, purchased, notes } = await req.json()
  const idea = await prisma.giftIdea.update({
    where: { id: Number(params.id) },
    data: {
      title,
      occasion: occasion ?? null,
      estimatedCost: estimatedCost != null ? Number(estimatedCost) : null,
      purchased: Boolean(purchased),
      notes: notes ?? null,
    },
  })
  return NextResponse.json(idea)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.giftIdea.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verify via curl**

```bash
# Recreate person
curl -s -X POST http://localhost:4100/api/gifts/people \
  -H 'Content-Type: application/json' -d '{"name":"Mum","budget":100}' | jq .id

# Add an idea
curl -s -X POST http://localhost:4100/api/gifts/people/1/ideas \
  -H 'Content-Type: application/json' \
  -d '{"title":"Cookbook","occasion":"Birthday","estimatedCost":30}' | jq .
# Expected: {"id":1,"giftPersonId":1,"title":"Cookbook","occasion":"Birthday","estimatedCost":30,"purchased":false,...}

# Toggle purchased
curl -s -X PUT http://localhost:4100/api/gifts/ideas/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":"Cookbook","occasion":"Birthday","estimatedCost":30,"purchased":true}' | jq .purchased
# Expected: true

# Verify in people list
curl -s http://localhost:4100/api/gifts/people | jq '.[0].ideas[0].purchased'
# Expected: true
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/gifts/
git commit -m "feat: add gift ideas API"
```

---

## Task 4: Gift Planner Page UI

**Files:**
- Create: `src/app/gifts/page.tsx`
- Create: `src/components/gifts/GiftsPage.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create `src/app/gifts/page.tsx`**

```typescript
import GiftsPage from '@/components/gifts/GiftsPage'

export default function Page() {
  return <GiftsPage />
}
```

- [ ] **Step 2: Add "Gifts" to sidebar in `src/components/Sidebar.tsx`**

Insert after Maintenance:

```typescript
const NAV = [
  { href: '/wishlist', label: 'Wishlist', active: true },
  { href: '/inventory', label: 'Inventory', active: true },
  { href: '/matrices', label: 'Matrices', active: true },
  { href: '/portfolio', label: 'Portfolio', active: true },
  { href: '/net-worth', label: 'Net Worth', active: true },
  { href: '/trends', label: 'Trends', active: true },
  { href: '/weekly-review', label: 'Weekly Review', active: true },
  { href: '/subscriptions', label: 'Subscriptions', active: true },
  { href: '/habits', label: 'Habits', active: true },
  { href: '/goals', label: 'Goals', active: true },
  { href: '/maintenance', label: 'Maintenance', active: true },
  { href: '/gifts', label: 'Gifts', active: true },
  { href: '/tech-radar', label: 'Tech Radar', active: true },
  { href: '/system', label: 'System', active: true },
]
```

- [ ] **Step 3: Create `src/components/gifts/GiftsPage.tsx`**

```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface GiftIdea {
  id: number
  giftPersonId: number
  title: string
  occasion: string | null
  estimatedCost: number | null
  purchased: boolean
  notes: string | null
}

interface GiftPerson {
  id: number
  name: string
  budget: number | null
  notes: string | null
  ideas: GiftIdea[]
}

function fmt(n: number) {
  return `€${n % 1 === 0 ? n : n.toFixed(2)}`
}

// ─── Person form ──────────────────────────────────────────────────────────
function PersonForm({ initial, onSave, onCancel }: { initial?: GiftPerson; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, budget: budget ? Number(budget) : null, notes: notes || null }
    if (initial?.id) {
      await fetch(`/api/gifts/people/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/gifts/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Person name" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Budget (optional, €)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add person'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ─── Idea form ────────────────────────────────────────────────────────────
function IdeaForm({ personId, initial, onSave, onCancel }: { personId: number; initial?: GiftIdea; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [occasion, setOccasion] = useState(initial?.occasion ?? '')
  const [estimatedCost, setEstimatedCost] = useState(initial?.estimatedCost?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      title,
      occasion: occasion || null,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      purchased: initial?.purchased ?? false,
      notes: notes || null,
    }
    if (initial?.id) {
      await fetch(`/api/gifts/ideas/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch(`/api/gifts/people/${personId}/ideas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Gift idea" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="Occasion (e.g. Birthday, Christmas)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="number" step="0.01" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="Estimated cost (optional, €)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">{initial?.id ? 'Save changes' : 'Add idea'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

// ─── Person detail (expanded) ─────────────────────────────────────────────
function PersonDetail({ person, onMutate }: { person: GiftPerson; onMutate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<GiftIdea | null>(null)

  async function togglePurchased(idea: GiftIdea) {
    await fetch(`/api/gifts/ideas/${idea.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: idea.title, occasion: idea.occasion, estimatedCost: idea.estimatedCost, purchased: !idea.purchased, notes: idea.notes }),
    })
    onMutate()
  }

  async function deleteIdea(id: number) {
    await fetch(`/api/gifts/ideas/${id}`, { method: 'DELETE' })
    onMutate()
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-3 pt-2">
      {person.ideas.length === 0 && <p className="text-sm text-gray-400 py-1">No ideas yet.</p>}
      {person.ideas.map(idea => (
        <div key={idea.id} className="flex items-center gap-2 py-1.5 group border-b border-gray-50 dark:border-gray-800 last:border-0">
          <button
            onClick={() => togglePurchased(idea)}
            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${idea.purchased ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}
          >
            {idea.purchased && <span className="text-white text-xs">✓</span>}
          </button>
          <span className={`text-sm flex-1 ${idea.purchased ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{idea.title}</span>
          {idea.occasion && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">{idea.occasion}</span>
          )}
          {idea.estimatedCost != null && (
            <span className="text-xs text-gray-400 shrink-0">{fmt(idea.estimatedCost)}</span>
          )}
          <div className="hidden group-hover:flex gap-1 shrink-0">
            <button onClick={() => setEditing(idea)} className="text-xs px-1.5 py-0.5 border rounded dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
            <button onClick={() => deleteIdea(idea.id)} className="text-xs px-1.5 py-0.5 text-red-400 border border-red-200 rounded hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
          </div>
        </div>
      ))}
      <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-500 hover:text-blue-600">+ Add idea</button>

      {showAdd && <Modal title="Add gift idea" onClose={() => setShowAdd(false)}><IdeaForm personId={person.id} onSave={() => { setShowAdd(false); onMutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit gift idea" onClose={() => setEditing(null)}><IdeaForm personId={person.id} initial={editing} onSave={() => { setEditing(null); onMutate() }} onCancel={() => setEditing(null)} /></Modal>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function GiftsPage() {
  const { data: people = [], mutate } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<GiftPerson | null>(null)

  async function deletePerson(id: number) {
    if (!confirm('Delete this person and all their gift ideas?')) return
    await fetch(`/api/gifts/people/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gifts</h1>
        <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add person</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {people.map(person => {
          const isExpanded = expandedId === person.id
          const purchased = person.ideas.filter(i => i.purchased)
          const committedSpend = purchased.reduce((s, i) => s + (i.estimatedCost ?? 0), 0)
          const budgetPct = person.budget ? Math.min(100, Math.round((committedSpend / person.budget) * 100)) : null

          return (
            <div key={person.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-4 cursor-pointer flex items-center gap-3" onClick={() => setExpandedId(isExpanded ? null : person.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{person.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {purchased.length}/{person.ideas.length} bought
                    </span>
                  </div>
                  {budgetPct !== null && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${budgetPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(committedSpend)} / {fmt(person.budget!)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditing(person)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => deletePerson(person.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? '▾' : '▸'}</span>
              </div>
              {isExpanded && <PersonDetail person={person} onMutate={mutate} />}
            </div>
          )
        })}
      </div>

      {people.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No people yet. Add one to start planning gifts.</p>}

      {showAdd && <Modal title="Add person" onClose={() => setShowAdd(false)}><PersonForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit person" onClose={() => setEditing(null)}><PersonForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:4100/gifts. Confirm:
- "Gifts" appears in sidebar after Maintenance
- Adding a person creates a card
- Adding a budget shows a progress bar
- Expanding a card shows gift ideas
- Toggling purchased turns the circle green and strikes through the title
- Budget bar updates when ideas are marked purchased

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/gifts
# Expected: 200
```

- [ ] **Step 5: Commit**

```bash
git add src/app/gifts/ src/components/gifts/ src/components/Sidebar.tsx
git commit -m "feat: add gift planner page with person cards, ideas, and budget tracking"
```
