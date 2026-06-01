# Phase 3: Config, System Page, AI Prompts & Weekly Review

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a JSON config file, a System page (stats + config editor + server controls), AI prompt generators on three existing pages, and a Weekly Review page.

**Architecture:** Config is stored in `config.json` at project root, read/written by a `src/lib/config.ts` helper that is server-side only. System stats come from Node's built-in `os` module. Restart/shutdown call `child_process.exec` with `systemctl --user`. AI prompts are generated client-side from SWR data already on each page and shown in a shared `PromptModal`. Weekly Review fetches a new `/api/weekly-review` route that aggregates the past 7 days across all Prisma tables.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Prisma v7 + better-sqlite3, SWR, TypeScript, Node.js `os` + `child_process`

---

## File Map

| File | Action |
|---|---|
| `config.json` | Create — project root, initial `{ "port": 3000 }` |
| `src/lib/config.ts` | Create — `readConfig()` + `writeConfig()` |
| `src/app/api/config/route.ts` | Create — GET + PUT |
| `src/app/api/system/route.ts` | Create — GET stats |
| `src/app/api/system/restart/route.ts` | Create — POST restart |
| `src/app/api/system/shutdown/route.ts` | Create — POST shutdown |
| `src/components/system/SystemPage.tsx` | Create |
| `src/app/system/page.tsx` | Create |
| `src/components/ui/PromptModal.tsx` | Create |
| `src/components/matrices/MatricesPage.tsx` | Modify — add AI Brief button |
| `src/components/wishlist/WishlistPage.tsx` | Modify — add AI Prompt button |
| `src/components/portfolio/PortfolioPage.tsx` | Modify — add AI Prompt button |
| `src/app/api/weekly-review/route.ts` | Create — GET weekly data |
| `src/components/weeklyreview/WeeklyReviewPage.tsx` | Create |
| `src/app/weekly-review/page.tsx` | Create |
| `src/components/Sidebar.tsx` | Modify — add Weekly Review + System |

---

### Task 1: Config system

**Files:**
- Create: `config.json`
- Create: `src/lib/config.ts`
- Create: `src/app/api/config/route.ts`

- [ ] Create `config.json` at project root:
```json
{
  "port": 3000
}
```

- [ ] Create `src/lib/config.ts`:
```ts
import fs from 'fs'
import path from 'path'

export interface Config {
  port: number
}

const CONFIG_PATH = path.join(process.cwd(), 'config.json')

export function readConfig(): Config {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  return JSON.parse(raw) as Config
}

export function writeConfig(partial: Partial<Config>): Config {
  const current = readConfig()
  const updated = { ...current, ...partial }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2))
  return updated
}
```

- [ ] Create `src/app/api/config/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { readConfig, writeConfig } from '@/lib/config'

export async function GET() {
  const config = readConfig()
  return NextResponse.json(config)
}

export async function PUT(req: Request) {
  const body = await req.json()
  const config = writeConfig(body)
  return NextResponse.json(config)
}
```

- [ ] Commit:
```bash
git add config.json src/lib/config.ts src/app/api/config && git commit -m "feat: add config.json and config API"
```

---

### Task 2: System API routes + SystemPage

**Files:**
- Create: `src/app/api/system/route.ts`
- Create: `src/app/api/system/restart/route.ts`
- Create: `src/app/api/system/shutdown/route.ts`
- Create: `src/components/system/SystemPage.tsx`
- Create: `src/app/system/page.tsx`

- [ ] Create `src/app/api/system/route.ts`:
```ts
import { NextResponse } from 'next/server'
import os from 'os'

export async function GET() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  return NextResponse.json({
    totalMem,
    freeMem,
    usedMem: totalMem - freeMem,
    uptimeSeconds: os.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
  })
}
```

- [ ] Create `src/app/api/system/restart/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST() {
  exec('systemctl --user restart personal-assistant', err => {
    if (err) console.error('Restart error:', err)
  })
  return NextResponse.json({ message: 'Restarting…' })
}
```

- [ ] Create `src/app/api/system/shutdown/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST() {
  exec('systemctl --user stop personal-assistant', err => {
    if (err) console.error('Shutdown error:', err)
  })
  return NextResponse.json({ message: 'Shutting down…' })
}
```

- [ ] Create `src/components/system/SystemPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SystemStats {
  totalMem: number; freeMem: number; usedMem: number
  uptimeSeconds: number; nodeVersion: string; platform: string
}

interface Config { port: number }

function formatBytes(b: number): string {
  const gb = b / (1024 ** 3)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(b / (1024 ** 2)).toFixed(0)} MB`
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function SystemPage() {
  const { data: stats } = useSWR<SystemStats>('/api/system', fetcher, { refreshInterval: 10000 })
  const { data: config, mutate: mutateConfig } = useSWR<Config>('/api/config', fetcher)
  const [portInput, setPortInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shutting, setShutting] = useState(false)

  const memPct = stats ? Math.round((stats.usedMem / stats.totalMem) * 100) : 0

  async function saveConfig() {
    const port = Number(portInput || config?.port)
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port }),
    })
    await mutateConfig()
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function restart() {
    if (!confirm('Restart the server?')) return
    await fetch('/api/system/restart', { method: 'POST' })
  }

  async function shutdown() {
    if (!confirm('Shut down the server? You will need to start it manually.')) return
    setShutting(true)
    await fetch('/api/system/shutdown', { method: 'POST' })
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System</h1>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">System Info</h2>
        {!stats ? <p className="text-sm text-gray-400">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Stat label="Total RAM" value={formatBytes(stats.totalMem)} />
              <Stat label="Used RAM" value={`${formatBytes(stats.usedMem)} (${memPct}%)`} />
              <Stat label="Free RAM" value={formatBytes(stats.freeMem)} />
              <Stat label="Uptime" value={formatUptime(stats.uptimeSeconds)} />
              <Stat label="Node" value={stats.nodeVersion} />
              <Stat label="Platform" value={stats.platform} />
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${memPct}%` }} />
            </div>
          </>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Configuration</h2>
        {!config ? <p className="text-sm text-gray-400">Loading…</p> : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">Port</label>
              <input
                type="number"
                value={portInput !== '' ? portInput : config.port}
                onChange={e => setPortInput(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-32 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              <p className="text-xs text-gray-400">The port the app runs on. Restart required for changes to take effect.</p>
            </div>
            <button
              onClick={saveConfig} disabled={saving}
              className="w-fit bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Server Controls</h2>
        {shutting ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Server is shutting down…</p>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={restart}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              Restart
            </button>
            <button
              onClick={shutdown}
              className="px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            >
              Shutdown
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] Create `src/app/system/page.tsx`:
```tsx
import SystemPage from '@/components/system/SystemPage'

export default function Page() {
  return <SystemPage />
}
```

- [ ] Commit:
```bash
git add src/app/api/system src/components/system src/app/system && git commit -m "feat: add System page with stats, config editor, and server controls"
```

---

### Task 3: PromptModal + AI prompt on MatricesPage

**Files:**
- Create: `src/components/ui/PromptModal.tsx`
- Modify: `src/components/matrices/MatricesPage.tsx`

- [ ] Create `src/components/ui/PromptModal.tsx`:
```tsx
'use client'

import { useState } from 'react'

interface Props {
  title: string
  prompt: string
  onClose: () => void
}

export default function PromptModal({ title, prompt, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <textarea
            readOnly value={prompt} rows={12}
            className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 resize-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 text-gray-700"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={copy} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] In `src/components/matrices/MatricesPage.tsx`, add the PromptModal import at the top (after the existing `useSWR` import):
```tsx
import PromptModal from '@/components/ui/PromptModal'
```

- [ ] In `MatricesPage`, add state for the prompt modal after the existing `const [newDesc, setNewDesc] = useState('')` line:
```tsx
const [showPrompt, setShowPrompt] = useState(false)
```

- [ ] In `MatricesPage`, add the `buildMatrixPrompt` function after the `getWeightedScore` function definition:
```tsx
function buildMatrixPrompt(): string {
  if (!matrix || !criteria.length || !options.length) return ''
  const criteriaLines = criteria.map(c => `- ${c.name} — ${c.weight}%`).join('\n')
  const optionLines = options.map(opt => {
    const scoreList = criteria.map(c => `${c.name} = ${getScore(c.id, opt.id)}`).join(', ')
    return `- ${opt.name}: ${scoreList}`
  }).join('\n')
  const resultLines = [...options]
    .sort((a, b) => getWeightedScore(b.id) - getWeightedScore(a.id))
    .map((opt, i) => `${i + 1}. ${opt.name} — ${getWeightedScore(opt.id).toFixed(2)}`)
    .join('\n')
  return `I'm evaluating options using a weighted decision matrix.

Criteria and weights:
${criteriaLines}

Options with scores (0–10 per criterion):
${optionLines}

Weighted results (higher is better, max 10):
${resultLines}

Please analyse my scoring. Identify potential biases, flag criteria that may be under/over-weighted relative to their importance, and suggest whether the top-ranked option is clearly the right choice or if the decision is too close to call.`
}
```

- [ ] In `MatricesPage`, in the matrix selector row (the `div` containing the `<select>` and Delete button), add the AI Brief button after the Delete button:
```tsx
{selectedId && matrix && criteria.length > 0 && options.length > 0 && (
  <button
    onClick={() => setShowPrompt(true)}
    className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
  >
    AI Brief
  </button>
)}
```

- [ ] At the end of the `MatricesPage` return, before the closing `</div>`, add the PromptModal:
```tsx
{showPrompt && (
  <PromptModal
    title="Decision Matrix AI Brief"
    prompt={buildMatrixPrompt()}
    onClose={() => setShowPrompt(false)}
  />
)}
```

- [ ] Commit:
```bash
git add src/components/ui/PromptModal.tsx src/components/matrices/MatricesPage.tsx && git commit -m "feat: add PromptModal and AI Brief on Matrices page"
```

---

### Task 4: AI prompt buttons on WishlistPage and PortfolioPage

**Files:**
- Modify: `src/components/wishlist/WishlistPage.tsx`
- Modify: `src/components/portfolio/PortfolioPage.tsx`

- [ ] In `src/components/wishlist/WishlistPage.tsx`, add the PromptModal import:
```tsx
import PromptModal from '@/components/ui/PromptModal'
```

- [ ] In `WishlistPage`, add state after the existing `const [filterCat, setFilterCat] = useState('')` line:
```tsx
const [showPrompt, setShowPrompt] = useState(false)
```

- [ ] In `WishlistPage`, add the `buildWishlistPrompt` function after the `del` function:
```tsx
function buildWishlistPrompt(): string {
  const byPriority: Record<string, typeof active> = { High: [], Medium: [], Low: [] }
  active.forEach(i => { byPriority[i.priority]?.push(i) })
  const section = (label: string, items: typeof active) =>
    items.length ? `${label.toUpperCase()} PRIORITY:\n${items.map(i => `- ${i.name} — €${i.cost.toFixed(2)}`).join('\n')}` : ''
  const sections = ['High', 'Medium', 'Low'].map(p => section(p, byPriority[p])).filter(Boolean).join('\n\n')
  const total = active.reduce((s, i) => s + i.cost, 0)
  return `Here is my current wishlist (unpurchased items only), grouped by priority:

${sections}

Total wishlist value: €${total.toFixed(2)}

Given typical budget constraints, suggest a sensible purchase order. Flag any items that seem overpriced relative to their priority, and identify any obvious quick wins (low cost, high priority).`
}
```

- [ ] In `WishlistPage`, in the header `div` containing the "Categories" and "+ Add item" buttons, add the "AI Prompt" button between them:
```tsx
<button
  onClick={() => setShowPrompt(true)}
  disabled={active.length === 0}
  className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
>
  AI Prompt
</button>
```

- [ ] At the end of the `WishlistPage` return, before the closing `</div>`, add:
```tsx
{showPrompt && (
  <PromptModal
    title="Wishlist Priority Prompt"
    prompt={buildWishlistPrompt()}
    onClose={() => setShowPrompt(false)}
  />
)}
```

- [ ] In `src/components/portfolio/PortfolioPage.tsx`, add the PromptModal import:
```tsx
import PromptModal from '@/components/ui/PromptModal'
```

- [ ] In `PortfolioPage`, add state after `const [filterType, setFilterType] = useState('')`:
```tsx
const [showPrompt, setShowPrompt] = useState(false)
```

- [ ] In `PortfolioPage`, add `buildPortfolioPrompt` after the `del` function. It uses `holdings`, `totalValue`, `totalPnl`, `totalCost`, and `holdingValue`/`holdingPnl` which are already in scope:
```tsx
function buildPortfolioPrompt(): string {
  const lines = holdings.map(h => {
    if (h.type === 'savings') {
      return `[SAVINGS — ${h.name}]: balance €${(h.balance ?? 0).toFixed(2)}${h.interestRate ? `, interest ${h.interestRate}%` : ''}`
    }
    const v = holdingValue(h)
    const p = holdingPnl(h)
    return `[${h.type.toUpperCase()} — ${h.name}]: value €${v.toFixed(2)}, P&L ${p >= 0 ? '+' : ''}€${p.toFixed(2)}`
  }).join('\n')
  const byType = ['stock', 'crypto', 'savings', 'other']
    .map(t => {
      const total = holdings.filter(h => h.type === t).reduce((s, h) => s + holdingValue(h), 0)
      return total > 0 ? `${t} €${total.toFixed(2)}` : ''
    })
    .filter(Boolean).join(', ')
  return `Here is my current investment portfolio:

${lines}

Summary:
- Total portfolio value: €${totalValue.toFixed(2)}
- Total P&L (non-savings): ${totalPnl >= 0 ? '+' : ''}€${totalPnl.toFixed(2)}${totalCost > 0 ? ` (${((totalPnl / totalCost) * 100).toFixed(1)}%)` : ''}
- Breakdown by type: ${byType}

Please analyse this portfolio. Identify concentration risk, comment on the balance between asset types, flag any significant unrealised losses, and suggest 2-3 rebalancing considerations.`
}
```

- [ ] In `PortfolioPage` header, add the "AI Prompt" button next to "+ Add holding":
```tsx
<button
  onClick={() => setShowPrompt(true)}
  disabled={holdings.length === 0}
  className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
>
  AI Prompt
</button>
```

- [ ] At the end of `PortfolioPage` return, before the closing `</div>`, add:
```tsx
{showPrompt && (
  <PromptModal
    title="Portfolio Health Check"
    prompt={buildPortfolioPrompt()}
    onClose={() => setShowPrompt(false)}
  />
)}
```

- [ ] Commit:
```bash
git add src/components/wishlist/WishlistPage.tsx src/components/portfolio/PortfolioPage.tsx && git commit -m "feat: add AI prompt buttons on Wishlist and Portfolio pages"
```

---

### Task 5: Weekly Review API + WeeklyReviewPage

**Files:**
- Create: `src/app/api/weekly-review/route.ts`
- Create: `src/components/weeklyreview/WeeklyReviewPage.tsx`
- Create: `src/app/weekly-review/page.tsx`

- [ ] Create `src/app/api/weekly-review/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [wishlistItems, inventoryItems, portfolioHoldings, snapshots] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryItem.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.portfolioHolding.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.snapshot.findMany({ orderBy: { date: 'desc' }, take: 50 }),
  ])

  const latestSnapshot = snapshots[0] ?? null
  const oldSnapshot = snapshots.find(s => new Date(s.date) <= sevenDaysAgo) ?? null
  const portfolioDelta =
    latestSnapshot && oldSnapshot
      ? latestSnapshot.portfolioTotal - oldSnapshot.portfolioTotal
      : null

  return NextResponse.json({
    wishlistItems,
    inventoryItems,
    portfolioHoldings,
    portfolioDelta,
    weekStart: sevenDaysAgo.toISOString(),
    weekEnd: new Date().toISOString(),
  })
}
```

- [ ] Create `src/components/weeklyreview/WeeklyReviewPage.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface WishlistItemRow { id: number; name: string; cost: number; priority: string }
interface InventoryItemRow { id: number; name: string; cost: number }
interface PortfolioHoldingRow {
  id: number; name: string; type: string
  currentPrice?: number | null; buyPrice?: number | null; quantity?: number | null
  balance?: number | null; interestRate?: number | null
}
interface WeeklyData {
  wishlistItems: WishlistItemRow[]
  inventoryItems: InventoryItemRow[]
  portfolioHoldings: PortfolioHoldingRow[]
  portfolioDelta: number | null
  weekStart: string
  weekEnd: string
}

function getWeekKey(): string {
  const d = new Date()
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `weekly-review-notes-${d.getFullYear()}-W${week}`
}

function WeekSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function WeeklyReviewPage() {
  const { data } = useSWR<WeeklyData>('/api/weekly-review', fetcher)
  const [notes, setNotes] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const weekKey = getWeekKey()

  useEffect(() => {
    setNotes(localStorage.getItem(weekKey) ?? '')
  }, [weekKey])

  function saveNotes(value: string) {
    setNotes(value)
    localStorage.setItem(weekKey, value)
  }

  function buildPrompt(): string {
    if (!data) return ''
    const { wishlistItems, inventoryItems, portfolioHoldings, portfolioDelta, weekStart, weekEnd } = data
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const wTotal = wishlistItems.reduce((s, i) => s + i.cost, 0)
    const wLines = wishlistItems.length
      ? wishlistItems.map(i => `- ${i.name} — €${i.cost.toFixed(2)} [${i.priority}]`).join('\n')
      : '(none)'
    const iLines = inventoryItems.length
      ? inventoryItems.map(i => `- ${i.name} — €${i.cost.toFixed(2)}`).join('\n')
      : '(none)'
    const pLines = portfolioHoldings.length
      ? portfolioHoldings.map(h => {
          if (h.type === 'savings') return `- ${h.name} (savings): €${(h.balance ?? 0).toFixed(2)}`
          const v = (h.currentPrice ?? 0) * (h.quantity ?? 0)
          const p = ((h.currentPrice ?? 0) - (h.buyPrice ?? 0)) * (h.quantity ?? 0)
          return `- ${h.name} (${h.type}): €${v.toFixed(2)} [P&L: ${p >= 0 ? '+' : ''}€${p.toFixed(2)}]`
        }).join('\n')
      : '(none)'
    const delta = portfolioDelta !== null
      ? `Portfolio delta vs 7 days ago: ${portfolioDelta >= 0 ? '+' : ''}€${portfolioDelta.toFixed(2)}`
      : 'Portfolio delta: not enough data'
    return `Weekly review — ${fmt(weekStart)} to ${fmt(weekEnd)}

WISHLIST (${wishlistItems.length} added${wishlistItems.length ? `, €${wTotal.toFixed(2)} total` : ''}):
${wLines}

INVENTORY (${inventoryItems.length} added):
${iLines}

PORTFOLIO (${portfolioHoldings.length} added):
${pLines}

${delta}

MY NOTES:
${notes.trim() || '(none)'}

Please identify patterns in this week's activity, flag anything I should follow up on, and suggest 2-3 priorities for next week.`
  }

  const dateRange = data
    ? `${new Date(data.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(data.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Review</h1>
          {dateRange && <p className="text-sm text-gray-400 mt-0.5">{dateRange}</p>}
        </div>
        <button
          onClick={() => setShowPrompt(true)}
          disabled={!data}
          className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Generate AI Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <WeekSection title={`Wishlist added (${data?.wishlistItems.length ?? 0})`}>
            {data?.wishlistItems.length ? (
              <ul className="flex flex-col gap-1">
                {data.wishlistItems.map(i => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{i.name}</span>
                    <span className="text-gray-500">€{i.cost.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
          </WeekSection>

          <WeekSection title={`Inventory added (${data?.inventoryItems.length ?? 0})`}>
            {data?.inventoryItems.length ? (
              <ul className="flex flex-col gap-1">
                {data.inventoryItems.map(i => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{i.name}</span>
                    <span className="text-gray-500">€{i.cost.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
          </WeekSection>

          <WeekSection title={`Portfolio changes (${data?.portfolioHoldings.length ?? 0})`}>
            {data?.portfolioHoldings.length ? (
              <ul className="flex flex-col gap-1">
                {data.portfolioHoldings.map(h => (
                  <li key={h.id} className="text-sm text-gray-800 dark:text-gray-200">
                    {h.name} <span className="text-gray-400">({h.type})</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-400">Nothing added this week.</p>}
            {data?.portfolioDelta != null && (
              <p className={`text-sm font-medium mt-2 ${data.portfolioDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                Delta: {data.portfolioDelta >= 0 ? '+' : ''}€{data.portfolioDelta.toFixed(2)} vs 7 days ago
              </p>
            )}
          </WeekSection>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={e => saveNotes(e.target.value)}
            placeholder="What happened this week? What's on your mind?"
            rows={16}
            className="flex-1 border rounded-xl px-4 py-3 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Saved automatically. Clears at the start of a new week.</p>
        </div>
      </div>

      {showPrompt && data && (
        <PromptModal
          title="Weekly Review AI Prompt"
          prompt={buildPrompt()}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
```

- [ ] Create `src/app/weekly-review/page.tsx`:
```tsx
import WeeklyReviewPage from '@/components/weeklyreview/WeeklyReviewPage'

export default function Page() {
  return <WeeklyReviewPage />
}
```

- [ ] Commit:
```bash
git add src/app/api/weekly-review src/components/weeklyreview src/app/weekly-review && git commit -m "feat: add Weekly Review page with AI prompt generator"
```

---

### Task 6: Sidebar update + build check

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] In `src/components/Sidebar.tsx`, replace the NAV array with:
```tsx
const NAV = [
  { href: '/wishlist', label: 'Wishlist', active: true },
  { href: '/inventory', label: 'Inventory', active: true },
  { href: '/matrices', label: 'Matrices', active: true },
  { href: '/portfolio', label: 'Portfolio', active: true },
  { href: '/trends', label: 'Trends', active: true },
  { href: '/weekly-review', label: 'Weekly Review', active: true },
  { href: '/system', label: 'System', active: true },
]
```

- [ ] Run TypeScript check:
```bash
npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] Run build:
```bash
npx next build 2>&1 | tail -20
```
Expected: all pages compile, including `/system`, `/weekly-review`.

- [ ] Fix any build errors, then commit:
```bash
git add src/components/Sidebar.tsx && git commit -m "feat: add Weekly Review and System to sidebar"
```
If build fixes were needed: `git add -A && git commit -m "fix: resolve Phase 3 build errors"`
