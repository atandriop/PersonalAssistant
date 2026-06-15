# People / Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a People/Contacts module with birthday tracking, relationship type, last contact date, and a dashboard widget for upcoming birthdays.

**Architecture:** New `Person` Prisma model. Two new API routes. New People page with add/edit/delete. Dashboard gets a `birthdays` widget showing contacts with a birthday in the next 30 days. Existing Companion/Company/GiftPerson tables are left unchanged — People is a clean new entity.

**Tech Stack:** Prisma (SQLite), Next.js 14 App Router, React + SWR, Tailwind CSS, Vitest

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `src/app/api/people/route.ts` |
| Create | `src/app/api/people/[id]/route.ts` |
| Create | `src/app/people/page.tsx` |
| Create | `src/components/people/PeoplePage.tsx` |
| Create | `src/components/people/PersonForm.tsx` |
| Create | `src/lib/peopleUtils.ts` |
| Create | `src/lib/peopleUtils.test.ts` |
| Modify | `src/types/index.ts` |
| Modify | `src/components/Sidebar.tsx` |
| Modify | `src/components/dashboard/DashboardPage.tsx` |

---

### Task 1: Birthday utility + tests

**Files:**
- Create: `src/lib/peopleUtils.ts`
- Create: `src/lib/peopleUtils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/peopleUtils.test.ts
import { describe, it, expect } from 'vitest'
import { daysUntilBirthday, upcomingBirthdays } from './peopleUtils'

describe('daysUntilBirthday', () => {
  it('returns 0 for today', () => {
    const today = new Date('2026-06-15')
    expect(daysUntilBirthday('1990-06-15', today)).toBe(0)
  })
  it('returns correct days for a future birthday this year', () => {
    const today = new Date('2026-06-15')
    expect(daysUntilBirthday('1985-07-04', today)).toBe(19)
  })
  it('wraps around to next year when birthday already passed this year', () => {
    const today = new Date('2026-06-15')
    // June 1 already passed — next is June 1 2027
    expect(daysUntilBirthday('1990-06-01', today)).toBe(351)
  })
})

describe('upcomingBirthdays', () => {
  it('returns people with birthday within withinDays', () => {
    const today = new Date('2026-06-15')
    const people = [
      { id: 1, name: 'Alice', birthday: '1990-06-20' }, // 5 days away
      { id: 2, name: 'Bob',   birthday: '1985-07-20' }, // 35 days away
      { id: 3, name: 'Carol', birthday: null },
    ]
    const result = upcomingBirthdays(people as any, 30, today)
    expect(result.map(r => r.id)).toEqual([1])
    expect(result[0].daysUntil).toBe(5)
  })
  it('returns empty array when no one has a birthday within range', () => {
    const today = new Date('2026-06-15')
    expect(upcomingBirthdays([], 30, today)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/peopleUtils.test.ts
```

Expected: FAIL — `Cannot find module './peopleUtils'`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/peopleUtils.ts
export function daysUntilBirthday(birthday: string, today: Date = new Date()): number {
  const bday = new Date(birthday)
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  if (thisYear < today) {
    const nextYear = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate())
    return Math.round((nextYear.getTime() - today.getTime()) / 86400000)
  }
  return Math.round((thisYear.getTime() - today.getTime()) / 86400000)
}

export function upcomingBirthdays<T extends { id: number; birthday: string | null }>(
  people: T[],
  withinDays: number,
  today: Date = new Date()
): (T & { daysUntil: number })[] {
  return people
    .filter(p => p.birthday !== null)
    .map(p => ({ ...p, daysUntil: daysUntilBirthday(p.birthday!, today) }))
    .filter(p => p.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/peopleUtils.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/peopleUtils.ts src/lib/peopleUtils.test.ts
git commit -m "feat: add birthday utility functions for People module"
```

---

### Task 2: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Person model**

Add the following model to `prisma/schema.prisma`:

```prisma
model Person {
  id              Int      @id @default(autoincrement())
  name            String
  birthday        String?
  relationship    String?
  email           String?
  phone           String?
  lastContactDate String?
  notes           String?
  createdAt       DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/than/PersonalAssistant && npx prisma migrate dev --name add_person
```

Expected: Migration applied, Prisma Client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Person model to schema"
```

---

### Task 3: Add Person type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add interface**

Add to `src/types/index.ts`:

```typescript
export interface Person {
  id: number
  name: string
  birthday: string | null
  relationship: string | null
  email: string | null
  phone: string | null
  lastContactDate: string | null
  notes: string | null
  createdAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Person type"
```

---

### Task 4: API routes

**Files:**
- Create: `src/app/api/people/route.ts`
- Create: `src/app/api/people/[id]/route.ts`

- [ ] **Step 1: Create list/create route**

```typescript
// src/app/api/people/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(people.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })))
}

export async function POST(req: Request) {
  const { name, birthday, relationship, email, phone, lastContactDate, notes } = await req.json()
  const person = await prisma.person.create({
    data: {
      name,
      birthday: birthday || null,
      relationship: relationship || null,
      email: email || null,
      phone: phone || null,
      lastContactDate: lastContactDate || null,
      notes: notes || null,
    },
  })
  return NextResponse.json({ ...person, createdAt: person.createdAt.toISOString() }, { status: 201 })
}
```

- [ ] **Step 2: Create update/delete route**

```typescript
// src/app/api/people/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, birthday, relationship, email, phone, lastContactDate, notes } = await req.json()
  const person = await prisma.person.update({
    where: { id: Number(params.id) },
    data: {
      name,
      birthday: birthday || null,
      relationship: relationship || null,
      email: email || null,
      phone: phone || null,
      lastContactDate: lastContactDate || null,
      notes: notes || null,
    },
  })
  return NextResponse.json({ ...person, createdAt: person.createdAt.toISOString() })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.person.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/people/
git commit -m "feat: add people CRUD API routes"
```

---

### Task 5: PersonForm component

**Files:**
- Create: `src/components/people/PersonForm.tsx`

- [ ] **Step 1: Create form**

```typescript
// src/components/people/PersonForm.tsx
'use client'

import { useState } from 'react'
import type { Person } from '@/types'

const RELATIONSHIPS = ['Friend', 'Family', 'Colleague', 'Acquaintance', 'Mentor', 'Partner', 'Other']

interface PersonFormProps {
  initial?: Person
  onSave: () => void
  onCancel: () => void
}

export default function PersonForm({ initial, onSave, onCancel }: PersonFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [birthday, setBirthday] = useState(initial?.birthday ?? '')
  const [relationship, setRelationship] = useState(initial?.relationship ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [lastContactDate, setLastContactDate] = useState(initial?.lastContactDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, birthday: birthday || null, relationship: relationship || null, email: email || null, phone: phone || null, lastContactDate: lastContactDate || null, notes: notes || null }
    if (initial?.id) {
      await fetch(`/api/people/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
        <input required className={inputCls} value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Birthday</label>
          <input type="date" className={inputCls} value={birthday} onChange={e => setBirthday(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last contact</label>
          <input type="date" className={inputCls} value={lastContactDate} onChange={e => setLastContactDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship</label>
        <select className={inputCls} value={relationship} onChange={e => setRelationship(e.target.value)}>
          <option value="">Select…</option>
          {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
          <input type="tel" className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea rows={3} className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Save</button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/people/PersonForm.tsx
git commit -m "feat: add PersonForm component"
```

---

### Task 6: PeoplePage component

**Files:**
- Create: `src/components/people/PeoplePage.tsx`

- [ ] **Step 1: Create page**

```typescript
// src/components/people/PeoplePage.tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Person } from '@/types'
import Modal from '@/components/ui/Modal'
import PersonForm from './PersonForm'
import { daysUntilBirthday } from '@/lib/peopleUtils'
import { Plus, Pencil, Trash2, Cake, Phone, Mail, Calendar } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const RELATIONSHIP_COLOR: Record<string, string> = {
  Friend:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Family:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Colleague:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Acquaintance:'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Mentor:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Partner:     'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Other:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default function PeoplePage() {
  const { data: people = [], mutate } = useSWR<Person[]>('/api/people', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Person | undefined>()
  const [search, setSearch] = useState('')

  async function deletePerson(p: Person) {
    if (!confirm(`Delete ${p.name}?`)) return
    await fetch(`/api/people/${p.id}`, { method: 'DELETE' })
    mutate()
  }

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.relationship ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">People</h1>
        <button
          onClick={() => { setEditing(undefined); setShowForm(true) }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Add person
        </button>
      </div>

      <input
        className="w-full mb-4 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        placeholder="Search by name or relationship…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No contacts yet.</p>
      )}

      <div className="grid gap-3">
        {filtered.map(p => {
          const daysUntil = p.birthday ? daysUntilBirthday(p.birthday) : null
          const birthdayLabel = daysUntil === null ? null
            : daysUntil === 0 ? 'Birthday today!'
            : daysUntil <= 7 ? `Birthday in ${daysUntil}d`
            : daysUntil <= 30 ? `Birthday in ${daysUntil}d`
            : null

          return (
            <div key={p.id} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                  {p.relationship && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATIONSHIP_COLOR[p.relationship] ?? RELATIONSHIP_COLOR.Other}`}>
                      {p.relationship}
                    </span>
                  )}
                  {birthdayLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 flex items-center gap-1">
                      <Cake size={10} /> {birthdayLabel}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                  {p.birthday && <span className="flex items-center gap-1"><Cake size={11} /> {p.birthday.slice(5)}</span>}
                  {p.email && <span className="flex items-center gap-1"><Mail size={11} /> {p.email}</span>}
                  {p.phone && <span className="flex items-center gap-1"><Phone size={11} /> {p.phone}</span>}
                  {p.lastContactDate && <span className="flex items-center gap-1"><Calendar size={11} /> Last contact {p.lastContactDate.slice(0, 10)}</span>}
                </div>
                {p.notes && <p className="text-xs text-gray-400 mt-1 truncate">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditing(p); setShowForm(true) }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Pencil size={14} /></button>
                <button onClick={() => deletePerson(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit person' : 'Add person'}>
        <PersonForm
          initial={editing}
          onSave={() => { setShowForm(false); mutate() }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/people/PeoplePage.tsx
git commit -m "feat: add PeoplePage component"
```

---

### Task 7: Page route and sidebar link

**Files:**
- Create: `src/app/people/page.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create page**

```typescript
// src/app/people/page.tsx
import PeoplePage from '@/components/people/PeoplePage'
export default function Page() { return <PeoplePage /> }
```

- [ ] **Step 2: Add sidebar link**

In `src/components/Sidebar.tsx`, add `Users` to the lucide-react import:

```typescript
import {
  LayoutDashboard, Sun, CalendarCheck, CalendarDays, CheckSquare, GitFork, FileText,
  TrendingUp, ShoppingBag, Heart, Wrench, Compass, Search, Target, Settings, Users,
} from 'lucide-react'
```

In the `NAV` array, under the `Life` section after the Life link:

```typescript
  { type: 'link', href: '/people', label: 'People', icon: Users },
```

- [ ] **Step 3: Commit**

```bash
git add src/app/people/page.tsx src/components/Sidebar.tsx
git commit -m "feat: add People page and sidebar link"
```

---

### Task 8: Dashboard birthday widget

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add 'birthdays' to ALL_WIDGETS**

In `DashboardPage.tsx`, add `'birthdays'` to the `ALL_WIDGETS` array:

```typescript
const ALL_WIDGETS = [
  'habits', 'maintenance', 'goals', 'gifts',
  'appointments', 'overdue-tasks', 'on-this-day', 'subscriptions',
  'travel', 'memories', 'bucket-list', 'expiring-docs', 'net-worth', 'birthdays',
] as const
```

Add to `WIDGET_LABELS`:

```typescript
'birthdays': 'Upcoming Birthdays',
```

- [ ] **Step 2: Add SWR fetch and widget render**

Add at the top of the `DashboardPage` component (alongside other SWR calls):

```typescript
const { data: people = [] } = useSWR<{ id: number; name: string; birthday: string | null; relationship: string | null }[]>(
  '/api/people',
  fetcher
)
```

Import the utility at the top of the file:

```typescript
import { upcomingBirthdays } from '@/lib/peopleUtils'
```

Import `Cake` from lucide-react (add to the existing import).

Add a computed value in the component:

```typescript
const birthdaySoon = upcomingBirthdays(people, 30)
```

Add the widget render case in the dashboard widget map (find the switch/conditional that renders each widget and add):

```tsx
{visibleWidgets.includes('birthdays') && (
  <WidgetCard title="Upcoming Birthdays" onHide={() => hideWidget('birthdays')}>
    {birthdaySoon.length === 0 ? (
      <p className="text-sm text-gray-400">No birthdays in the next 30 days.</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {birthdaySoon.map(p => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <Cake size={14} className="text-orange-400 shrink-0" />
            <span className="flex-1 text-gray-900 dark:text-white">{p.name}</span>
            <span className="text-gray-400 text-xs">
              {p.daysUntil === 0 ? 'Today!' : `in ${p.daysUntil}d`}
            </span>
          </li>
        ))}
      </ul>
    )}
  </WidgetCard>
)}
```

Note: look at how existing widgets like `gifts` or `appointments` are rendered in DashboardPage to match the exact widget card pattern used in this file.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 4: Run all tests**

```bash
cd /home/than/PersonalAssistant && npx vitest run
```

Expected: All tests pass including peopleUtils tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add upcoming birthdays dashboard widget"
```
