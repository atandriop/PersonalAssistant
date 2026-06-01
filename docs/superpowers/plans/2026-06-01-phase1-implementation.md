# Personal Assistant Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a localhost Next.js personal assistant app with Wishlist, Inventory, and shared Categories pages backed by SQLite via Prisma.

**Architecture:** Next.js 14 App Router with a persistent sidebar layout. All data access goes through `/api` route handlers that call Prisma. Client pages fetch from these routes via SWR. Full Prisma schema is created on first migration; only phase 1 tables get UI.

**Tech Stack:** Next.js 14, Tailwind CSS, Prisma, SQLite, SWR, TypeScript

---

## File Map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Full data model (all 5 modules) |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/app/layout.tsx` | Root layout wrapping all pages with Sidebar |
| `src/app/page.tsx` | Redirect to /wishlist |
| `src/components/Sidebar.tsx` | Nav links (2 active, 3 disabled), dark mode toggle |
| `src/app/wishlist/page.tsx` | Wishlist page (server component shell) |
| `src/app/inventory/page.tsx` | Inventory page (server component shell) |
| `src/components/ui/Modal.tsx` | Reusable modal wrapper |
| `src/components/ui/Badge.tsx` | Coloured pill badge |
| `src/components/categories/CategoryManager.tsx` | Inline add/edit/delete categories |
| `src/components/wishlist/WishlistPage.tsx` | Full wishlist client component |
| `src/components/wishlist/WishlistItemRow.tsx` | Single wishlist item row |
| `src/components/wishlist/WishlistForm.tsx` | Add/edit item form |
| `src/components/inventory/InventoryPage.tsx` | Full inventory client component |
| `src/components/inventory/InventoryItemRow.tsx` | Single inventory item row |
| `src/components/inventory/InventoryForm.tsx` | Add/edit item form |
| `src/app/api/categories/route.ts` | GET, POST /api/categories |
| `src/app/api/categories/[id]/route.ts` | PUT, DELETE /api/categories/[id] |
| `src/app/api/wishlist/route.ts` | GET, POST /api/wishlist |
| `src/app/api/wishlist/[id]/route.ts` | PUT, DELETE /api/wishlist/[id] |
| `src/app/api/inventory/route.ts` | GET, POST /api/inventory |
| `src/app/api/inventory/[id]/route.ts` | PUT, DELETE /api/inventory/[id] |

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.js`, `.env`

- [ ] Scaffold the project:
```bash
cd /home/than/PersonalAssistant
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

- [ ] Install additional dependencies:
```bash
npm install prisma @prisma/client swr
npm install -D @types/node
```

- [ ] Update `tailwind.config.ts` to enable dark mode:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
}
export default config
```

- [ ] Create `.env`:
```
DATABASE_URL="file:./dev.db"
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: scaffold Next.js 14 project with Tailwind"
```

---

### Task 2: Prisma schema + migration

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`

- [ ] Init Prisma:
```bash
npx prisma init --datasource-provider sqlite
```

- [ ] Replace `prisma/schema.prisma` with full schema:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Category {
  id             Int             @id @default(autoincrement())
  name           String
  color          String
  wishlistItems  WishlistItem[]
  inventoryItems InventoryItem[]
}

model WishlistItem {
  id                Int             @id @default(autoincrement())
  name              String
  url               String?
  cost              Float
  priority          String          @default("Medium")
  notes             String?
  purchased         Boolean         @default(false)
  categoryId        Int
  category          Category        @relation(fields: [categoryId], references: [id])
  inventoryUpgrades InventoryItem[] @relation("UpgradeTarget")
  createdAt         DateTime        @default(now())
}

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

model Matrix {
  id          Int              @id @default(autoincrement())
  name        String
  description String?
  criteria    MatrixCriteria[]
  options     MatrixOption[]
  createdAt   DateTime         @default(now())
}

model MatrixCriteria {
  id       Int           @id @default(autoincrement())
  name     String
  weight   Float
  matrixId Int
  matrix   Matrix        @relation(fields: [matrixId], references: [id], onDelete: Cascade)
  scores   MatrixScore[]
}

model MatrixOption {
  id       Int           @id @default(autoincrement())
  name     String
  matrixId Int
  matrix   Matrix        @relation(fields: [matrixId], references: [id], onDelete: Cascade)
  scores   MatrixScore[]
}

model MatrixScore {
  id         Int            @id @default(autoincrement())
  score      Float          @default(0)
  optionId   Int
  option     MatrixOption   @relation(fields: [optionId], references: [id], onDelete: Cascade)
  criteriaId Int
  criteria   MatrixCriteria @relation(fields: [criteriaId], references: [id], onDelete: Cascade)

  @@unique([optionId, criteriaId])
}

model PortfolioHolding {
  id           Int      @id @default(autoincrement())
  name         String
  type         String
  quantity     Float?
  buyPrice     Float?
  currentPrice Float?
  balance      Float?
  interestRate Float?
  notes        String?
  createdAt    DateTime @default(now())
}

model Snapshot {
  id             Int      @id @default(autoincrement())
  date           DateTime @default(now())
  wishlistTotal  Float
  portfolioTotal Float
}
```

- [ ] Run migration:
```bash
npx prisma migrate dev --name init
```
Expected: Migration created and applied, `dev.db` created.

- [ ] Create `src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add full Prisma schema and SQLite migration"
```

---

### Task 3: Root layout + Sidebar

**Files:**
- Create: `src/components/Sidebar.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] Create `src/components/Sidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/wishlist', label: 'Wishlist', active: true },
  { href: '/inventory', label: 'Inventory', active: true },
  { href: '/matrices', label: 'Matrices', active: false },
  { href: '/portfolio', label: 'Portfolio', active: false },
  { href: '/trends', label: 'Trends', active: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <span className="font-bold text-gray-900 dark:text-white text-lg">Personal</span>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {NAV.map(({ href, label, active }) =>
          active ? (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {label}
            </Link>
          ) : (
            <span
              key={href}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed flex items-center justify-between"
            >
              {label}
              <span className="text-xs text-gray-300 dark:text-gray-600">soon</span>
            </span>
          )
        )}
      </nav>
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleDark}
          className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-left"
        >
          {dark ? '☀ Light mode' : '☾ Dark mode'}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Personal Assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
```

- [ ] Replace `src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/wishlist')
}
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add sidebar and root layout"
```

---

### Task 4: Shared UI primitives

**Files:**
- Create: `src/components/ui/Modal.tsx`, `src/components/ui/Badge.tsx`

- [ ] Create `src/components/ui/Modal.tsx`:
```tsx
'use client'

import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] Create `src/components/ui/Badge.tsx`:
```tsx
interface Props {
  color: string
  children: React.ReactNode
  onClick?: () => void
}

export default function Badge({ color, children, onClick }: Props) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${onClick ? 'cursor-pointer' : ''}`}
      style={{ backgroundColor: color + '22', color }}
    >
      {children}
    </span>
  )
}
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add Modal and Badge UI primitives"
```

---

### Task 5: Categories API

**Files:**
- Create: `src/app/api/categories/route.ts`, `src/app/api/categories/[id]/route.ts`

- [ ] Create `src/app/api/categories/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { name, color } = await req.json()
  const category = await prisma.category.create({ data: { name, color } })
  return NextResponse.json(category, { status: 201 })
}
```

- [ ] Create `src/app/api/categories/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, color } = await req.json()
  const category = await prisma.category.update({
    where: { id: Number(params.id) },
    data: { name, color },
  })
  return NextResponse.json(category)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.category.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Start dev server and verify:
```bash
npm run dev &
curl http://localhost:3000/api/categories
```
Expected: `[]`

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add categories API routes"
```

---

### Task 6: Wishlist API

**Files:**
- Create: `src/app/api/wishlist/route.ts`, `src/app/api/wishlist/[id]/route.ts`

- [ ] Create `src/app/api/wishlist/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.wishlistItem.findMany({
    include: { category: true, inventoryUpgrades: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { name, url, cost, priority, notes, categoryId } = await req.json()
  const item = await prisma.wishlistItem.create({
    data: { name, url, cost: Number(cost), priority, notes, categoryId: Number(categoryId) },
    include: { category: true, inventoryUpgrades: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item, { status: 201 })
}
```

- [ ] Create `src/app/api/wishlist/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const item = await prisma.wishlistItem.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name,
      url: data.url ?? null,
      cost: Number(data.cost),
      priority: data.priority,
      notes: data.notes ?? null,
      categoryId: Number(data.categoryId),
      purchased: data.purchased ?? undefined,
    },
    include: { category: true, inventoryUpgrades: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.wishlistItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add wishlist API routes"
```

---

### Task 7: Inventory API

**Files:**
- Create: `src/app/api/inventory/route.ts`, `src/app/api/inventory/[id]/route.ts`

- [ ] Create `src/app/api/inventory/route.ts`:
```ts
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
  const { name, cost, quantity, purchaseDate, notes, categoryId, upgradeTargetId } = await req.json()
  const item = await prisma.inventoryItem.create({
    data: {
      name,
      cost: Number(cost),
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

- [ ] Create `src/app/api/inventory/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const item = await prisma.inventoryItem.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name,
      cost: Number(data.cost),
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

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add inventory API routes"
```

---

### Task 8: CategoryManager component

**Files:**
- Create: `src/components/categories/CategoryManager.tsx`

- [ ] Create `src/components/categories/CategoryManager.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PRESET_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

interface Category { id: number; name: string; color: string }

export default function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data: categories = [], mutate } = useSWR<Category[]>('/api/categories', fetcher)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [editing, setEditing] = useState<Category | null>(null)

  async function save() {
    if (!name.trim()) return
    if (editing) {
      await fetch(`/api/categories/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
    } else {
      await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
    }
    setName(''); setColor(PRESET_COLORS[0]); setEditing(null)
    mutate()
  }

  async function del(id: number) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    mutate()
  }

  function startEdit(cat: Category) {
    setEditing(cat); setName(cat.name); setColor(cat.color)
  }

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
            <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.name}</span>
            <button onClick={() => startEdit(cat)} className="text-blue-500 hover:underline">Edit</button>
            <button onClick={() => del(cat.id)} className="text-red-500 hover:underline">Delete</button>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col gap-3">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Category name"
          className="border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
            {editing ? 'Update' : 'Add Category'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setName(''); setColor(PRESET_COLORS[0]) }}
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

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add CategoryManager component"
```

---

### Task 9: WishlistForm component

**Files:**
- Create: `src/components/wishlist/WishlistForm.tsx`

- [ ] Create `src/components/wishlist/WishlistForm.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }

interface WishlistItem {
  id?: number; name: string; url?: string; cost: number;
  priority: string; notes?: string; categoryId: number
}

interface Props {
  initial?: WishlistItem
  onSave: () => void
  onCancel: () => void
}

export default function WishlistForm({ initial, onSave, onCancel }: Props) {
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 'Medium')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId?.toString() ?? '')

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(String(categories[0].id))
  }, [categories, categoryId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, url: url || null, cost: Number(cost), priority, notes: notes || null, categoryId: Number(categoryId) }
    if (initial?.id) {
      await fetch(`/api/wishlist/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Item name" className={field} />
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" className={field} />
      <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className={field} />
      <select value={priority} onChange={e => setPriority(e.target.value)} className={field}>
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={field} required>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add WishlistForm component"
```

---

### Task 10: WishlistPage component

**Files:**
- Create: `src/components/wishlist/WishlistPage.tsx`, `src/app/wishlist/page.tsx`

- [ ] Create `src/components/wishlist/WishlistPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import WishlistForm from './WishlistForm'
import CategoryManager from '@/components/categories/CategoryManager'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }
interface UpgradeRef { id: number; name: string }
interface WishlistItem {
  id: number; name: string; url?: string; cost: number; priority: string
  notes?: string; purchased: boolean; categoryId: number
  category: Category; inventoryUpgrades: UpgradeRef[]
}

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }

export default function WishlistPage() {
  const { data: items = [], mutate } = useSWR<WishlistItem[]>('/api/wishlist', fetcher)
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<WishlistItem | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  const active = items.filter(i => !i.purchased)
  const filtered = active
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterCat || String(i.categoryId) === filterCat)

  const total = active.reduce((s, i) => s + i.cost, 0)
  const byCategory = categories.map(c => ({ ...c, subtotal: active.filter(i => i.categoryId === c.id).reduce((s, i) => s + i.cost, 0) })).filter(c => c.subtotal > 0)

  const grouped = categories
    .map(c => ({ cat: c, items: filtered.filter(i => i.categoryId === c.id).sort((a, b) => PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] - PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER]) }))
    .filter(g => g.items.length > 0)

  async function markGotIt(item: WishlistItem) {
    if (!confirm(`Move "${item.name}" to inventory?`)) return
    await fetch(`/api/wishlist/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, purchased: true, categoryId: item.categoryId }),
    })
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, cost: item.cost, quantity: 1, purchaseDate: new Date().toISOString(), notes: item.notes, categoryId: item.categoryId }),
    })
    mutate()
  }

  async function del(id: number) {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/wishlist/${id}`, { method: 'DELETE' })
    mutate()
  }

  const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wishlist</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCats(true)} className="text-sm px-3 py-1.5 border rounded-lg dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            Categories
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add item
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: €{total.toFixed(2)}</span>
        {byCategory.map(c => (
          <Badge key={c.id} color={c.color}>
            {c.name} €{c.subtotal.toFixed(2)}
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Grouped items */}
      {grouped.map(({ cat, items }) => (
        <div key={cat.id} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{cat.name}</span>
            <span className="text-xs text-gray-400">{items.length} items · €{items.reduce((s, i) => s + i.cost, 0).toFixed(2)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                    <Badge color={PRIORITY_COLOR[item.priority]}>{item.priority}</Badge>
                    {item.inventoryUpgrades.map(u => (
                      <Badge key={u.id} color="#8b5cf6">Upgrade for: {u.name}</Badge>
                    ))}
                  </div>
                  {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{item.url}</a>}
                  {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white shrink-0">€{item.cost.toFixed(2)}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => markGotIt(item)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Got it</button>
                  <button onClick={() => setEditing(item)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => del(item.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No wishlist items yet. Add one to get started.</p>
      )}

      {showAdd && (
        <Modal title="Add wishlist item" onClose={() => setShowAdd(false)}>
          <WishlistForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit wishlist item" onClose={() => setEditing(null)}>
          <WishlistForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {showCats && (
        <Modal title="Manage categories" onClose={() => setShowCats(false)}>
          <CategoryManager onClose={() => setShowCats(false)} />
        </Modal>
      )}
    </div>
  )
}
```

- [ ] Create `src/app/wishlist/page.tsx`:
```tsx
import WishlistPage from '@/components/wishlist/WishlistPage'

export default function Page() {
  return <WishlistPage />
}
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add Wishlist page"
```

---

### Task 11: InventoryForm component

**Files:**
- Create: `src/components/inventory/InventoryForm.tsx`

- [ ] Create `src/components/inventory/InventoryForm.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }
interface WishlistItem { id: number; name: string; cost: number }
interface InventoryItem {
  id?: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number; upgradeTargetId?: number
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

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(String(categories[0].id))
  }, [categories, categoryId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name, cost: Number(cost), quantity: Number(quantity),
      purchaseDate: purchaseDate || null, notes: notes || null,
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
      <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className={field} />
      <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={field} />
      <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={field} />
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={field} required>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
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

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add InventoryForm component"
```

---

### Task 12: InventoryPage component

**Files:**
- Create: `src/components/inventory/InventoryPage.tsx`, `src/app/inventory/page.tsx`

- [ ] Create `src/components/inventory/InventoryPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import InventoryForm from './InventoryForm'
import CategoryManager from '@/components/categories/CategoryManager'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Category { id: number; name: string; color: string }
interface UpgradeTarget { id: number; name: string; cost: number }
interface InventoryItem {
  id: number; name: string; cost: number; quantity: number
  purchaseDate?: string; notes?: string; categoryId: number
  category: Category; upgradeTarget?: UpgradeTarget
}

export default function InventoryPage() {
  const { data: items = [], mutate } = useSWR<InventoryItem[]>('/api/inventory', fetcher)
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const router = useRouter()

  const filtered = items
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterCat || String(i.categoryId) === filterCat)

  const total = items.reduce((s, i) => s + i.cost * i.quantity, 0)
  const withUpgrades = items.filter(i => i.upgradeTarget).length
  const byCategory = categories
    .map(c => ({ ...c, subtotal: items.filter(i => i.categoryId === c.id).reduce((s, i) => s + i.cost * i.quantity, 0) }))
    .filter(c => c.subtotal > 0)

  const grouped = categories
    .map(c => ({ cat: c, items: filtered.filter(i => i.categoryId === c.id) }))
    .filter(g => g.items.length > 0)

  async function del(id: number) {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCats(true)} className="text-sm px-3 py-1.5 border rounded-lg dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            Categories
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add item
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: €{total.toFixed(2)}</span>
        {withUpgrades > 0 && <Badge color="#f59e0b">{withUpgrades} with upgrade available</Badge>}
        {byCategory.map(c => (
          <Badge key={c.id} color={c.color}>{c.name} €{c.subtotal.toFixed(2)}</Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Grouped items */}
      {grouped.map(({ cat, items }) => (
        <div key={cat.id} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{cat.name}</span>
            <span className="text-xs text-gray-400">
              {items.length} items · €{items.reduce((s, i) => s + i.cost * i.quantity, 0).toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                    {item.quantity > 1 && <Badge color="#6b7280">×{item.quantity}</Badge>}
                    {item.upgradeTarget && (
                      <Badge color="#f97316" onClick={() => router.push('/wishlist')}>
                        Upgrade: {item.upgradeTarget.name} €{item.upgradeTarget.cost.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {item.purchaseDate && <p className="text-xs text-gray-400 mt-0.5">Bought {new Date(item.purchaseDate).toLocaleDateString()}</p>}
                  {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white shrink-0">€{(item.cost * item.quantity).toFixed(2)}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(item)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                  <button onClick={() => del(item.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No inventory items yet. Add one to get started.</p>
      )}

      {showAdd && (
        <Modal title="Add inventory item" onClose={() => setShowAdd(false)}>
          <InventoryForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit inventory item" onClose={() => setEditing(null)}>
          <InventoryForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {showCats && (
        <Modal title="Manage categories" onClose={() => setShowCats(false)}>
          <CategoryManager onClose={() => setShowCats(false)} />
        </Modal>
      )}
    </div>
  )
}
```

- [ ] Create `src/app/inventory/page.tsx`:
```tsx
import InventoryPage from '@/components/inventory/InventoryPage'

export default function Page() {
  return <InventoryPage />
}
```

- [ ] Commit:
```bash
git add -A && git commit -m "feat: add Inventory page"
```

---

### Task 13: Smoke test + cleanup

- [ ] Start dev server and verify app loads:
```bash
npm run dev
```
Open `http://localhost:3000` — should redirect to `/wishlist`.

- [ ] Verify dark mode toggle persists across page refresh.
- [ ] Add a category, add a wishlist item, mark it "Got it", confirm it appears in Inventory.
- [ ] Add an inventory item with an upgrade target, verify orange badge appears and links to wishlist.
- [ ] Run type check:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] Final commit:
```bash
git add -A && git commit -m "feat: complete Phase 1 — Wishlist, Inventory, Categories"
```
