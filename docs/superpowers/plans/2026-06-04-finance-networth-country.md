# Finance Costs Tab, Net Worth Fixes & Country Autocomplete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a YTD/projected costs tab to Finance, fix net worth double-counting assets, add a credit_card liability category, make subscription totals more legible, and replace country/city text inputs with an autocomplete combobox backed by static JSON data.

**Architecture:** Three independent feature areas that can be executed in any order. Finance costs pulls from existing API endpoints client-side with no new routes needed (except the subscription category field). Country autocomplete uses a static JSON file committed to the repo, with a reusable Combobox component shared across three forms.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Prisma + SQLite, SWR

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `category` to Subscription |
| `src/app/api/subscriptions/route.ts` | Modify | Accept/return `category` |
| `src/app/api/subscriptions/[id]/route.ts` | Modify | Accept/return `category` |
| `src/components/subscriptions/SubscriptionsPage.tsx` | Modify | Category grouping, larger font totals |
| `src/components/networth/NetWorthPage.tsx` | Modify | Remove asset panel, add credit_card category |
| `src/components/finance/FinancePage.tsx` | Modify | Add Costs tab, fix assetTotal, bump sub card font |
| `src/components/finance/CostsTab.tsx` | Create | YTD + projected costs breakdown |
| `src/components/ui/Combobox.tsx` | Create | Reusable autocomplete combobox |
| `src/components/travel/TripForm.tsx` | Modify | Use Combobox for country + city suggestions |
| `src/components/bucket-list/TripForm.tsx` | Modify | Use Combobox for destination + city suggestions |
| `src/components/travel/CountryForm.tsx` | Modify | Use Combobox for country name |
| `public/data/countries.json` | Create | Static list of ~250 country names |
| `public/data/cities.json` | Create | Major cities keyed by country name |
| `scripts/generate-geo-data.mjs` | Create | Script to regenerate JSON from world-cities |

---

## Task 1: Add `category` to Subscription schema + migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] Open `prisma/schema.prisma`. In the `Subscription` model, add the `category` field after `active`:

```prisma
model Subscription {
  id          Int       @id @default(autoincrement())
  name        String
  cost        Float
  period      String
  renewalDate DateTime?
  url         String?
  notes       String?
  active      Boolean   @default(true)
  category    String    @default("Other")
  createdAt   DateTime  @default(now())
}
```

- [ ] Run the migration:

```bash
cd /home/than/PersonalAssistant
npx prisma migrate dev --name add_subscription_category
```

Expected output: `The following migration(s) have been applied: .../add_subscription_category`

- [ ] Commit:

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add category field to Subscription model"
```

---

## Task 2: Update subscription API routes to pass `category`

**Files:**
- Modify: `src/app/api/subscriptions/route.ts`
- Modify: `src/app/api/subscriptions/[id]/route.ts`

- [ ] Update `src/app/api/subscriptions/route.ts` — add `category` to POST:

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ renewalDate: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(subscriptions)
}

export async function POST(req: Request) {
  const { name, cost, period, renewalDate, url, notes, active, category } = await req.json()
  const subscription = await prisma.subscription.create({
    data: {
      name, cost: Number(cost), period,
      renewalDate: renewalDate ? new Date(renewalDate) : null,
      url: url ?? null, notes: notes ?? null,
      active: active ?? true,
      category: category ?? 'Other',
    },
  })
  return NextResponse.json(subscription, { status: 201 })
}
```

- [ ] Update `src/app/api/subscriptions/[id]/route.ts` — add `category` to PUT:

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const subscription = await prisma.subscription.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name, cost: Number(data.cost), period: data.period,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      url: data.url ?? null, notes: data.notes ?? null, active: data.active,
      category: data.category ?? 'Other',
    },
  })
  return NextResponse.json(subscription)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.subscription.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Commit:

```bash
git add src/app/api/subscriptions/
git commit -m "feat: subscription API accepts and returns category field"
```

---

## Task 3: Update SubscriptionsPage — category grouping + form field + larger totals

**Files:**
- Modify: `src/components/subscriptions/SubscriptionsPage.tsx`

- [ ] Replace the full contents of `src/components/subscriptions/SubscriptionsPage.tsx`:

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export const SUBSCRIPTION_CATEGORIES = [
  'Software & Services',
  'Utilities',
  'Groceries & Food',
  'Insurance',
  'Other',
] as const

interface Subscription {
  id: number; name: string; cost: number; period: string; category: string
  renewalDate?: string | null; url?: string | null; notes?: string | null; active: boolean
}

const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

function monthlyEquiv(cost: number, period: string): number {
  return period === 'yearly' ? cost / 12 : cost
}

function daysUntil(renewalDate: string | null | undefined): number | null {
  if (!renewalDate) return null
  return Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000)
}

interface FormProps { initial?: Subscription; onSave: () => void; onCancel: () => void }

function SubscriptionForm({ initial, onSave, onCancel }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [period, setPeriod] = useState(initial?.period ?? 'monthly')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [renewalDate, setRenewalDate] = useState(initial?.renewalDate ? initial.renewalDate.slice(0, 10) : '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [active, setActive] = useState(initial?.active ?? true)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, cost: Number(cost), period, category, renewalDate: renewalDate || null, url: url || null, notes: notes || null, active }
    if (initial?.id) {
      await fetch(`/api/subscriptions/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Netflix)" className={field} />
      <div className="flex gap-2">
        <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className={field} />
        <select value={period} onChange={e => setPeriod(e.target.value)} className={field}>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <select value={category} onChange={e => setCategory(e.target.value)} className={field}>
        {SUBSCRIPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className={field} />
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" className={field} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={field} />
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add subscription'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function SubscriptionsPage() {
  const { data: all = [], mutate } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [showActive, setShowActive] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)

  const active = all.filter(s => s.active)
  const items = showActive ? active : all
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyEquiv(s.cost, s.period), 0)
  const annualTotal = active.reduce((sum, s) => sum + (s.period === 'yearly' ? s.cost : s.cost * 12), 0)
  const soonCount = active.filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d >= 0 && d <= 14 }).length

  function buildPrompt(): string {
    const lines = active.map(s => {
      const mo = monthlyEquiv(s.cost, s.period)
      const suffix = s.period === 'yearly' ? ` — €${mo.toFixed(2)}/mo equivalent` : ''
      return `- ${s.name} [${s.category}]: €${s.cost.toFixed(2)}/${s.period}${suffix}`
    }).join('\n')
    return `Here are my active subscriptions:\n${lines}\n\nTotal monthly spend: €${monthlyTotal.toFixed(2)}\nTotal annual spend: €${annualTotal.toFixed(2)}\n\nIdentify any likely redundancies, suggest cuts, and flag anything that seems overpriced for what it provides.`
  }

  async function del(id: number) {
    if (!confirm('Delete this subscription?')) return
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
    mutate()
  }

  // Group items by category, preserving SUBSCRIPTION_CATEGORIES order
  const grouped = SUBSCRIPTION_CATEGORIES.map(cat => ({
    category: cat,
    items: items.filter(s => (s.category ?? 'Other') === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPrompt(true)} disabled={active.length === 0}
            className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            AI Prompt
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <span className="text-base font-semibold text-gray-700 dark:text-gray-300">Monthly: €{monthlyTotal.toFixed(2)}</span>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Annual: €{annualTotal.toFixed(2)}</span>
        <Badge color="#6b7280">{active.length} active</Badge>
        {soonCount > 0 && <Badge color="#f59e0b">{soonCount} renewing soon</Badge>}
      </div>

      <div className="flex gap-2 mb-4">
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => setShowActive(v)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${showActive === v ? 'bg-blue-600 text-white border-blue-600' : 'dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {v ? 'Active' : 'All'}
          </button>
        ))}
      </div>

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

      {showAdd && <Modal title="Add subscription" onClose={() => setShowAdd(false)}><SubscriptionForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit subscription" onClose={() => setEditing(null)}><SubscriptionForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
      {showPrompt && <PromptModal title="Subscriptions AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
```

- [ ] Verify the app builds:

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] Commit:

```bash
git add src/components/subscriptions/SubscriptionsPage.tsx
git commit -m "feat: subscription categories — grouping, form field, larger totals"
```

---

## Task 4: Net worth fixes — remove asset panel, add credit_card category

**Files:**
- Modify: `src/components/networth/NetWorthPage.tsx`
- Modify: `src/components/finance/FinancePage.tsx`

- [ ] In `NetWorthPage.tsx`, find and update the CATEGORIES constant and totalAssets calculation:

Replace:
```ts
const CATEGORIES = ['property', 'vehicle', 'cash', 'loan', 'mortgage', 'other'] as const
```
With:
```ts
const CATEGORIES = ['property', 'vehicle', 'cash', 'credit_card', 'loan', 'mortgage', 'other'] as const
```

- [ ] In `NetWorthPage.tsx`, replace the `totalAssets` calculation (around line 198):

Replace:
```ts
const totalAssets = portfolioTotal + assetEntries.reduce((s, e) => s + e.value, 0)
```
With:
```ts
const totalAssets = portfolioTotal
```

- [ ] In `NetWorthPage.tsx`, remove the left-column asset panel entirely. Find the Assets column (the `<div>` starting at the grid with "Assets" heading), and replace the entire left column card with a portfolio-only display:

```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assets <span className="text-green-600 dark:text-green-400 font-bold ml-1">{fmt(totalAssets)}</span></h2>
    <button
      onClick={() => setShowPortfolio(true)}
      className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
    >
      Manage portfolio →
    </button>
  </div>

  {holdings.length === 0 ? (
    <p className="text-sm text-gray-400">No portfolio holdings yet.</p>
  ) : (
    <div>
      {holdings.map(h => (
        <div key={h.id} className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
          <span className="text-sm text-gray-700 dark:text-gray-300">{h.name}</span>
          <span className="text-sm text-gray-900 dark:text-white">{fmt(holdingValue(h))}</span>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-400">Portfolio total</span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{fmt(portfolioTotal)}</span>
      </div>
    </div>
  )}
</div>
```

- [ ] Also update the `groupByCategory` display label helper to handle `credit_card`:

Find the place where category labels are displayed (e.g. `cat.charAt(0).toUpperCase() + cat.slice(1)`) and replace it with a helper:

```ts
function formatCategory(cat: string): string {
  if (cat === 'credit_card') return 'Credit Card'
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}
```

Then replace all occurrences of `cat.charAt(0).toUpperCase() + cat.slice(1)` in `NetWorthPage.tsx` with `formatCategory(cat)`.

- [ ] In `FinancePage.tsx` (Overview), find and fix the asset total calculation:

Replace:
```ts
const assetTotal = portfolioTotal + entries.filter(e => e.type === 'asset').reduce((s, e) => s + e.value, 0)
```
With:
```ts
const assetTotal = portfolioTotal
```

- [ ] Verify build:

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

- [ ] Commit:

```bash
git add src/components/networth/NetWorthPage.tsx src/components/finance/FinancePage.tsx
git commit -m "fix: net worth assets = portfolio only; add credit_card liability category"
```

---

## Task 5: Generate geo data JSON files

**Files:**
- Create: `scripts/generate-geo-data.mjs`
- Create: `public/data/countries.json`
- Create: `public/data/cities.json`

- [ ] Install `world-cities` as a dev dependency:

```bash
cd /home/than/PersonalAssistant && npm install --save-dev world-cities
```

- [ ] Create `scripts/generate-geo-data.mjs`:

```js
import { createRequire } from 'module'
import { writeFileSync, mkdirSync } from 'fs'

const require = createRequire(import.meta.url)
const cities = require('world-cities/cities.json')

// Build countries list
const countrySet = new Set()
const citiesByCountry = {}

for (const city of cities) {
  const country = city.country
  if (!country) continue
  countrySet.add(country)
  if (!citiesByCountry[country]) citiesByCountry[country] = []
  citiesByCountry[country].push({ name: city.name, pop: city.population ?? 0 })
}

const countries = [...countrySet].sort()

// Keep top 15 cities per country by population
const citiesOut = {}
for (const country of countries) {
  citiesOut[country] = (citiesByCountry[country] ?? [])
    .sort((a, b) => b.pop - a.pop)
    .slice(0, 15)
    .map(c => c.name)
    .sort()
}

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/countries.json', JSON.stringify(countries, null, 2))
writeFileSync('public/data/cities.json', JSON.stringify(citiesOut, null, 2))

console.log(`Done: ${countries.length} countries, ${Object.values(citiesOut).flat().length} cities`)
```

- [ ] Run the script:

```bash
cd /home/than/PersonalAssistant && node scripts/generate-geo-data.mjs
```

Expected output: `Done: ~250 countries, ~3000+ cities`

- [ ] Verify the files look correct:

```bash
head -20 /home/than/PersonalAssistant/public/data/countries.json
node -e "const c=require('./public/data/cities.json'); console.log(c['Greece'], c['France'])"
```

- [ ] Commit:

```bash
git add scripts/generate-geo-data.mjs public/data/
git commit -m "feat: add static geo data — countries and major cities JSON"
```

---

## Task 6: Build the Combobox component

**Files:**
- Create: `src/components/ui/Combobox.tsx`

- [ ] Create `src/components/ui/Combobox.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  required?: boolean
}

export default function Combobox({ value, onChange, options, placeholder, className = '', required }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = value.length > 0
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options

  const showAddOption = value.trim().length > 0 && !options.some(o => o.toLowerCase() === value.toLowerCase())
  const displayItems: string[] = showAddOption ? [...filtered, `__add__:${value.trim()}`] : filtered
  const visibleItems = displayItems.slice(0, 50)

  useEffect(() => {
    setHighlighted(0)
  }, [value])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function select(item: string) {
    const val = item.startsWith('__add__:') ? item.slice(8) : item
    onChange(val)
    setOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) { if (e.key === 'ArrowDown') { setOpen(true); return } }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, visibleItems.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (visibleItems[highlighted]) select(visibleItems[highlighted]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        required={required}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm ${className}`}
        autoComplete="off"
      />
      {open && visibleItems.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          {visibleItems.map((item, i) => {
            const isAdd = item.startsWith('__add__:')
            const label = isAdd ? `Add "${item.slice(8)}"` : item
            return (
              <li
                key={item}
                onMouseDown={() => select(item)}
                onMouseEnter={() => setHighlighted(i)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === highlighted
                    ? 'bg-blue-600 text-white'
                    : isAdd
                    ? 'text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] Verify build:

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -10
```

- [ ] Commit:

```bash
git add src/components/ui/Combobox.tsx
git commit -m "feat: add reusable Combobox autocomplete component"
```

---

## Task 7: Apply Combobox to travel/TripForm and CountryForm

**Files:**
- Modify: `src/components/travel/TripForm.tsx`
- Modify: `src/components/travel/CountryForm.tsx`

- [ ] Create a shared hook `src/lib/useGeoData.ts` for loading the JSON files:

```ts
import { useState, useEffect } from 'react'

let countriesCache: string[] | null = null
let citiesCache: Record<string, string[]> | null = null

export function useCountries(): string[] {
  const [countries, setCountries] = useState<string[]>(countriesCache ?? [])
  useEffect(() => {
    if (countriesCache) { setCountries(countriesCache); return }
    fetch('/data/countries.json').then(r => r.json()).then((data: string[]) => {
      countriesCache = data
      setCountries(data)
    })
  }, [])
  return countries
}

export function useCities(country: string): string[] {
  const [cities, setCities] = useState<string[]>([])
  useEffect(() => {
    if (!country) { setCities([]); return }
    function load(data: Record<string, string[]>) { setCities(data[country] ?? []) }
    if (citiesCache) { load(citiesCache); return }
    fetch('/data/cities.json').then(r => r.json()).then((data: Record<string, string[]>) => {
      citiesCache = data
      load(data)
    })
  }, [country])
  return cities
}
```

- [ ] Replace `src/components/travel/CountryForm.tsx` — add Combobox for country name:

```tsx
'use client'

import { useState } from 'react'
import type { TravelCountry } from '@/types'
import Combobox from '@/components/ui/Combobox'
import { useCountries } from '@/lib/useGeoData'

export default function CountryForm({ initial, onSave, onCancel }: {
  initial?: TravelCountry
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const countries = useCountries()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const body = { name: name.trim(), notes: notes.trim() || null }
    if (initial) {
      await fetch(`/api/travel/countries/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/travel/countries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    const msg = initial.tripCount > 0 ? `Delete "${initial.name}" and its ${initial.tripCount} trip(s)?` : `Delete "${initial.name}"?`
    if (!confirm(msg)) return
    await fetch(`/api/travel/countries/${initial.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Country' : 'Add Country'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country name *</label>
            <Combobox value={name} onChange={setName} options={countries} placeholder="e.g. Japan" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none" />
          </div>
          <div className="flex justify-between pt-2">
            {initial ? (
              <button type="button" onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] Replace `src/components/travel/TripForm.tsx` — replace country select + add city suggestions:

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { TravelTrip, TravelCountry } from '@/types'
import Combobox from '@/components/ui/Combobox'
import { useCountries, useCities } from '@/lib/useGeoData'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TripForm({ initial, onSave, onCancel }: {
  initial?: TravelTrip
  onSave: () => void
  onCancel: () => void
}) {
  const { data: dbCountries = [] } = useSWR<TravelCountry[]>('/api/travel/countries', fetcher)
  const allCountries = useCountries()

  const [countryName, setCountryName] = useState<string>(initial?.countryName ?? '')
  const [cities, setCities] = useState<string[]>(initial?.cities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [actualCost, setActualCost] = useState(initial?.actualCost != null ? String(initial.actualCost) : '')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const citySuggestions = useCities(countryName)

  function addCity(value: string) {
    const trimmed = value.trim().replace(/,+$/, '')
    if (trimmed && !cities.includes(trimmed)) setCities(prev => [...prev, trimmed])
    setCityInput('')
  }

  function handleCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCity(cityInput) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pendingCity = cityInput.trim().replace(/,+$/, '')
    const finalCities = pendingCity && !cities.includes(pendingCity) ? [...cities, pendingCity] : cities

    if (!countryName.trim()) return
    setSaving(true)

    // Resolve country: use existing DB entry by name if found, else create via countryName
    const existing = dbCountries.find(c => c.name.toLowerCase() === countryName.trim().toLowerCase())
    const body = {
      ...(existing ? { countryId: existing.id } : { countryName: countryName.trim() }),
      cities: finalCities,
      startDate: startDate || null,
      endDate: endDate || null,
      actualCost: actualCost !== '' ? Number(actualCost) : null,
      rating,
      notes: notes.trim() || null,
    }

    if (initial) {
      await fetch(`/api/travel/trips/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/travel/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm(`Delete this trip to ${initial.countryName}?`)) return
    await fetch(`/api/travel/trips/${initial.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Trip' : 'Add Trip'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
            <Combobox value={countryName} onChange={setCountryName} options={allCountries} placeholder="e.g. Greece" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cities / Stops</label>
            <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[2.5rem]">
              {cities.map(city => (
                <span key={city} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  {city}
                  <button type="button" onClick={() => setCities(prev => prev.filter(c => c !== city))} className="hover:text-blue-900 dark:hover:text-blue-200 leading-none">&times;</button>
                </span>
              ))}
              <Combobox
                value={cityInput}
                onChange={v => { setCityInput(v) }}
                options={citySuggestions.filter(c => !cities.includes(c))}
                placeholder={cities.length === 0 ? 'Type a city, press Enter' : ''}
                className="flex-1 min-w-[8rem] !border-0 !rounded-none !px-0 !py-0 !bg-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a city</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Cost (€)</label>
            <input type="number" min="0" value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(rating === n ? null : n)}
                  className={`text-2xl transition-colors ${n <= (rating ?? 0) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600 hover:text-amber-300'}`}>★</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none" />
          </div>

          <div className="flex justify-between pt-2">
            {initial ? (
              <button type="button" onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] Verify build:

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -10
```

- [ ] Commit:

```bash
git add src/lib/useGeoData.ts src/components/travel/TripForm.tsx src/components/travel/CountryForm.tsx
git commit -m "feat: country/city combobox in travel TripForm and CountryForm"
```

---

## Task 8: Apply Combobox to bucket-list/TripForm

**Files:**
- Modify: `src/components/bucket-list/TripForm.tsx`

- [ ] Replace `src/components/bucket-list/TripForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { BucketTrip } from '@/types'
import Combobox from '@/components/ui/Combobox'
import { useCountries, useCities } from '@/lib/useGeoData'

export default function TripForm({ initial, onSave, onCancel }: {
  initial?: BucketTrip
  onSave: () => void
  onCancel: () => void
}) {
  const allCountries = useCountries()
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [cities, setCities] = useState<string[]>(initial?.cities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [budget, setBudget] = useState(initial?.budget != null ? String(initial.budget) : '')
  const [targetYear, setTargetYear] = useState(initial?.targetYear != null ? String(initial.targetYear) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const citySuggestions = useCities(destination)

  function addCity(value: string) {
    const trimmed = value.trim().replace(/,+$/, '')
    if (trimmed && !cities.includes(trimmed)) setCities(prev => [...prev, trimmed])
    setCityInput('')
  }

  function handleCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCity(cityInput) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!destination.trim()) return
    const pendingCity = cityInput.trim().replace(/,+$/, '')
    const finalCities = pendingCity && !cities.includes(pendingCity) ? [...cities, pendingCity] : cities
    setSaving(true)
    const body = {
      destination: destination.trim(),
      cities: finalCities,
      budget: budget !== '' ? Number(budget) : null,
      targetYear: targetYear !== '' ? Number(targetYear) : null,
      notes: notes.trim() || null,
    }
    if (initial) {
      await fetch(`/api/bucket-list/trips/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, done: initial.done }) })
    } else {
      await fetch('/api/bucket-list/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm(`Delete "${initial.destination}"?`)) return
    await fetch(`/api/bucket-list/trips/${initial.id}`, { method: 'DELETE' })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{initial ? 'Edit Trip' : 'Add Trip'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination *</label>
            <Combobox value={destination} onChange={setDestination} options={allCountries} placeholder="e.g. Japan" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cities / Stops</label>
            <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[2.5rem]">
              {cities.map(city => (
                <span key={city} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  {city}
                  <button type="button" onClick={() => setCities(prev => prev.filter(c => c !== city))} className="hover:text-blue-900 dark:hover:text-blue-200 leading-none">&times;</button>
                </span>
              ))}
              <Combobox
                value={cityInput}
                onChange={v => { setCityInput(v) }}
                options={citySuggestions.filter(c => !cities.includes(c))}
                placeholder={cities.length === 0 ? 'Type a city, press Enter' : ''}
                className="flex-1 min-w-[8rem] !border-0 !rounded-none !px-0 !py-0 !bg-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a city</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget (€)</label>
              <input type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Year</label>
              <input type="number" min="2024" max="2100" value={targetYear} onChange={e => setTargetYear(e.target.value)} placeholder="e.g. 2027"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none" />
          </div>

          <div className="flex justify-between pt-2">
            {initial ? (
              <button type="button" onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] Verify build:

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -10
```

- [ ] Commit:

```bash
git add src/components/bucket-list/TripForm.tsx
git commit -m "feat: country/city combobox in bucket-list TripForm"
```

---

## Task 9: Build CostsTab component

**Files:**
- Create: `src/components/finance/CostsTab.tsx`

- [ ] Create `src/components/finance/CostsTab.tsx`:

```tsx
'use client'

import useSWR from 'swr'
import { SUBSCRIPTION_CATEGORIES } from '@/components/subscriptions/SubscriptionsPage'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Subscription { id: number; cost: number; period: string; active: boolean; category: string }
interface Trip { id: number; startDate: string | null; endDate: string | null; actualCost: number | null }
interface Appointment { id: number; date: string; cost: number | null }
interface InventoryItem { id: number; cost: number; quantity: number; createdAt: string }
interface HomeItem { logs: MaintenanceLog[] }
interface MaintenanceLog { id: number; date: string; cost: number | null }
interface GiftPerson { ideas: GiftIdea[] }
interface GiftIdea { id: number; estimatedCost: number | null; purchased: boolean; createdAt: string }

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function yearOf(dateStr: string): number {
  return new Date(dateStr).getFullYear()
}

function isThisYear(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return yearOf(dateStr) === new Date().getFullYear()
}

export default function CostsTab() {
  const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const { data: trips = [] } = useSWR<Trip[]>('/api/travel/trips', fetcher)
  const { data: appointments = [] } = useSWR<Appointment[]>('/api/appointments', fetcher)
  const { data: inventory = [] } = useSWR<InventoryItem[]>('/api/inventory', fetcher)
  const { data: maintenanceItems = [] } = useSWR<HomeItem[]>('/api/maintenance/items', fetcher)
  const { data: giftPeople = [] } = useSWR<GiftPerson[]>('/api/gifts/people', fetcher)

  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31, 23, 59, 59)
  const daysElapsed = Math.ceil((now.getTime() - startOfYear.getTime()) / 86400000)
  const daysInYear = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / 86400000)
  const daysRemaining = daysInYear - daysElapsed

  const today = now.toISOString().slice(0, 10)

  // Trips
  const pastTrips = trips.filter(t => {
    const anchor = t.endDate ?? t.startDate
    return anchor && isThisYear(anchor) && anchor <= today
  })
  const futureTrips = trips.filter(t => t.startDate && isThisYear(t.startDate) && t.startDate > today)
  const tripsYtd = pastTrips.reduce((s, t) => s + (t.actualCost ?? 0), 0)
  const tripsRemaining = futureTrips.reduce((s, t) => s + (t.actualCost ?? 0), 0)

  // Appointments
  const pastAppts = appointments.filter(a => isThisYear(a.date) && a.date <= today)
  const futureAppts = appointments.filter(a => isThisYear(a.date) && a.date > today)
  const apptsYtd = pastAppts.reduce((s, a) => s + (a.cost ?? 0), 0)
  const apptsRemaining = futureAppts.reduce((s, a) => s + (a.cost ?? 0), 0)

  // Subscriptions by category
  const activeSubs = subscriptions.filter(s => s.active)
  const subsByCategory = SUBSCRIPTION_CATEGORIES.map(cat => {
    const catSubs = activeSubs.filter(s => (s.category ?? 'Other') === cat)
    const annualTotal = catSubs.reduce((s, sub) => s + (sub.period === 'yearly' ? sub.cost : sub.cost * 12), 0)
    return {
      category: cat,
      ytd: annualTotal * (daysElapsed / daysInYear),
      remaining: annualTotal * (daysRemaining / daysInYear),
    }
  }).filter(g => g.ytd > 0 || g.remaining > 0)

  const subsYtd = subsByCategory.reduce((s, g) => s + g.ytd, 0)
  const subsRemaining = subsByCategory.reduce((s, g) => s + g.remaining, 0)

  // Purchases (inventory)
  const purchasesYtd = inventory
    .filter(i => isThisYear(i.createdAt))
    .reduce((s, i) => s + i.cost * i.quantity, 0)

  // Maintenance
  const allLogs: MaintenanceLog[] = maintenanceItems.flatMap(item => item.logs)
  const maintenanceYtd = allLogs
    .filter(l => isThisYear(l.date) && l.date <= today)
    .reduce((s, l) => s + (l.cost ?? 0), 0)

  // Gifts
  const allIdeas: GiftIdea[] = giftPeople.flatMap(p => p.ideas)
  const giftsYtd = allIdeas
    .filter(i => i.purchased && isThisYear(i.createdAt))
    .reduce((s, i) => s + (i.estimatedCost ?? 0), 0)

  const totalYtd = tripsYtd + apptsYtd + subsYtd + purchasesYtd + maintenanceYtd + giftsYtd
  const totalRemaining = tripsRemaining + apptsRemaining + subsRemaining
  const totalYear = totalYtd + totalRemaining

  type Row = { label: string; ytd: number; remaining: number; isSubCategory?: boolean }

  const rows: Row[] = [
    { label: 'Trips', ytd: tripsYtd, remaining: tripsRemaining },
    { label: 'Appointments', ytd: apptsYtd, remaining: apptsRemaining },
    ...subsByCategory.map(g => ({ label: g.category, ytd: g.ytd, remaining: g.remaining, isSubCategory: true })),
    { label: 'Purchases', ytd: purchasesYtd, remaining: 0 },
    { label: 'Maintenance', ytd: maintenanceYtd, remaining: 0 },
    { label: 'Gifts', ytd: giftsYtd, remaining: 0 },
  ].filter(r => r.ytd > 0 || r.remaining > 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{year} Costs</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Spent so far</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(totalYtd)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Projected remaining</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(totalRemaining)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 mb-4">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <span className="font-medium uppercase tracking-wide">Year estimate: {fmt(totalYear)}</span>
          <div className="flex gap-8">
            <span>Spent YTD</span>
            <span>Remaining</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                <td className={`py-2.5 ${row.isSubCategory ? 'pl-8 text-gray-500 dark:text-gray-400' : 'pl-4 font-medium text-gray-700 dark:text-gray-300'}`}>
                  {row.isSubCategory ? `↳ ${row.label}` : row.label}
                </td>
                <td className="py-2.5 pr-4 text-right text-gray-900 dark:text-white w-32">{fmt(row.ytd)}</td>
                <td className="py-2.5 pr-4 text-right text-gray-400 w-32">{row.remaining > 0 ? fmt(row.remaining) : '—'}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 dark:border-gray-700">
              <td className="py-3 pl-4 font-bold text-gray-900 dark:text-white">Total</td>
              <td className="py-3 pr-4 text-right font-bold text-gray-900 dark:text-white">{fmt(totalYtd)}</td>
              <td className="py-3 pr-4 text-right font-bold text-gray-400">{fmt(totalRemaining)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Subscriptions are pro-rated ({daysElapsed} days elapsed of {daysInYear}). Maintenance and gift figures are totals only.
      </p>
    </div>
  )
}
```

- [ ] Verify build:

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -10
```

- [ ] Commit:

```bash
git add src/components/finance/CostsTab.tsx
git commit -m "feat: CostsTab component with YTD and projected spend breakdown"
```

---

## Task 10: Wire CostsTab into FinancePage + fix overview sub card font

**Files:**
- Modify: `src/components/finance/FinancePage.tsx`

- [ ] In `FinancePage.tsx`, add `'costs'` to the sections array and import `CostsTab`:

At the top of the file, add:
```ts
import CostsTab from '@/components/finance/CostsTab'
```

Replace the SECTIONS constant:
```ts
type FinanceSection = 'overview' | 'net-worth' | 'subscriptions' | 'costs'

const SECTIONS: { id: FinanceSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'net-worth', label: 'Net Worth' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'costs', label: 'Costs' },
]
```

- [ ] In `FinancePage.tsx`, add the Costs tab render below the existing section renders:

```tsx
{section === 'costs' && <CostsTab />}
```

- [ ] In `FinancePage.tsx`, in the Overview subscriptions card, update the monthly/annual footer rows (around lines 245–249) from `text-xs` to `text-sm`:

```tsx
<div className="flex justify-between text-sm text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
  <span>Monthly total</span><span className="font-medium">{fmtDecimal(monthlySubCost)}</span>
</div>
<div className="flex justify-between text-sm text-gray-500 pt-1">
  <span>Annual total</span><span className="font-medium">{fmt(annualSubCost)}</span>
</div>
```

- [ ] Verify final build:

```bash
cd /home/than/PersonalAssistant && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] Commit:

```bash
git add src/components/finance/FinancePage.tsx
git commit -m "feat: wire Costs tab into Finance; fix subscription overview card font size"
```

---

## Self-Review Checklist

| Spec requirement | Covered in |
|---|---|
| Finance costs tab (new tab) | Tasks 9, 10 |
| Spent YTD — trips | Task 9 |
| Spent YTD — appointments | Task 9 |
| Spent YTD — subscriptions pro-rated by category | Tasks 1–3, 9 |
| Spent YTD — purchases (inventory) | Task 9 |
| Spent YTD — maintenance | Task 9 |
| Spent YTD — gifts | Task 9 |
| Projected remaining — trips, appointments, subscriptions | Task 9 |
| Natural year reset (filter by current year) | Task 9 |
| Subscription `category` field + migration | Tasks 1, 2 |
| Subscription form category selector | Task 3 |
| Subscription page grouped by category | Task 3 |
| Subscription totals larger font | Tasks 3, 10 |
| Net worth: assets = portfolio only | Task 4 |
| Net worth: credit_card liability category | Task 4 |
| Net worth: fix FinancePage assetTotal | Task 4 |
| Static geo data JSON | Task 5 |
| Combobox component | Task 6 |
| travel/TripForm — country combobox | Task 7 |
| travel/CountryForm — country combobox | Task 7 |
| bucket-list/TripForm — destination combobox | Task 8 |
| City suggestions in TripForms | Tasks 7, 8 |
| Allow custom (not-in-list) entry | Task 6 (Combobox `__add__` option) |
