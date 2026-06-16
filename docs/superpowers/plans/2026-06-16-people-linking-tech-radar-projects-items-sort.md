# People Linking, Tech Radar Projects, Items Sort Direction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three independent improvements: (1) link GiftPerson/Companion records to People entries with FK + click-through UI, (2) add "project" as a Tech Radar category, (3) add ascending/descending sort direction toggle on the Items page.

**Architecture:** All three features are isolated. Implement in order: sort direction (pure frontend), tech radar category (one-liner), people linking (schema migration + API + UI). Each task is independently deployable and testable.

**Tech Stack:** Next.js 14 App Router, Prisma + SQLite, SWR, Tailwind CSS, lucide-react icons, TypeScript.

---

## Task 1: Items Sort Direction Toggle

Wishlist and Inventory already support sort-by-field. This adds an asc/desc direction toggle: clicking the active sort button flips direction; clicking a different sort button switches field and resets to ascending.

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

---

- [ ] **Step 1: Add direction state and update sort click handlers**

In `src/components/items/ItemsPage.tsx`, add two new state variables after the existing sort state (around line 61):

```tsx
const [sortWishDir, setSortWishDir] = useState<'asc' | 'desc'>('asc')
const [sortInvDir, setSortInvDir] = useState<'asc' | 'desc'>('asc')
```

Add helper functions for handling sort clicks (after the state declarations):

```tsx
function handleSortWish(field: typeof sortWish) {
  if (field === sortWish) {
    setSortWishDir(d => d === 'asc' ? 'desc' : 'asc')
  } else {
    setSortWish(field)
    setSortWishDir('asc')
  }
}

function handleSortInv(field: typeof sortInv) {
  if (field === sortInv) {
    setSortInvDir(d => d === 'asc' ? 'desc' : 'asc')
  } else {
    setSortInv(field)
    setSortInvDir('asc')
  }
}
```

- [ ] **Step 2: Update wishlist sort logic to respect direction**

Find the `catWish` sort in the `visibleCategories.map(cat => { ... })` block. Replace:

```tsx
.sort((a, b) => {
  if (sortWish === 'name') return a.name.localeCompare(b.name)
  if (sortWish === 'cost') return (a.cost ?? 0) - (b.cost ?? 0)
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
})
```

with:

```tsx
.sort((a, b) => {
  let cmp: number
  if (sortWish === 'name') cmp = a.name.localeCompare(b.name)
  else if (sortWish === 'cost') cmp = (a.cost ?? 0) - (b.cost ?? 0)
  else cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  return sortWishDir === 'asc' ? cmp : -cmp
})
```

- [ ] **Step 3: Update inventory sort logic to respect direction**

Find the `catInv` sort. Replace:

```tsx
.sort((a, b) => sortInv === 'cost' ? (a.cost ?? 0) - (b.cost ?? 0) : a.name.localeCompare(b.name))
```

with:

```tsx
.sort((a, b) => {
  const cmp = sortInv === 'cost' ? (a.cost ?? 0) - (b.cost ?? 0) : a.name.localeCompare(b.name)
  return sortInvDir === 'asc' ? cmp : -cmp
})
```

- [ ] **Step 4: Update wishlist sort buttons to show direction indicator and use handler**

Find the wishlist sort buttons block:

```tsx
{(['priority', 'name', 'cost'] as const).map(s => (
  <button key={s} onClick={() => setSortWish(s)}
    className={`text-xs px-1.5 py-0.5 rounded ${sortWish === s ? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
    {s.charAt(0).toUpperCase() + s.slice(1)}
  </button>
))}
```

Replace with:

```tsx
{(['priority', 'name', 'cost'] as const).map(s => (
  <button key={s} onClick={() => handleSortWish(s)}
    className={`text-xs px-1.5 py-0.5 rounded ${sortWish === s ? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
    {s.charAt(0).toUpperCase() + s.slice(1)}{sortWish === s ? (sortWishDir === 'asc' ? ' ↑' : ' ↓') : ''}
  </button>
))}
```

- [ ] **Step 5: Update inventory sort buttons similarly**

Find the inventory sort buttons block:

```tsx
{(['name', 'cost'] as const).map(s => (
  <button key={s} onClick={() => setSortInv(s)}
    className={`text-xs px-1.5 py-0.5 rounded ${sortInv === s ? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
    {s.charAt(0).toUpperCase() + s.slice(1)}
  </button>
))}
```

Replace with:

```tsx
{(['name', 'cost'] as const).map(s => (
  <button key={s} onClick={() => handleSortInv(s)}
    className={`text-xs px-1.5 py-0.5 rounded ${sortInv === s ? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
    {s.charAt(0).toUpperCase() + s.slice(1)}{sortInv === s ? (sortInvDir === 'asc' ? ' ↑' : ' ↓') : ''}
  </button>
))}
```

- [ ] **Step 6: Verify in browser**

Start dev server (`npm run dev`). Go to `/wishlist` (Items page). Confirm:
- Wishlist sort buttons show `↑` on active button
- Clicking active button flips to `↓` and reverses list order
- Clicking a different button switches sort field and resets to `↑`
- Inventory column behaves the same way

- [ ] **Step 7: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: add asc/desc sort direction toggle to Items page"
```

---

## Task 2: Add "Project" Category to Tech Radar

**Files:**
- Modify: `src/components/techradar/TechRadarPage.tsx`

---

- [ ] **Step 1: Add project to CATEGORIES and CAT_COLOR**

In `src/components/techradar/TechRadarPage.tsx`, find:

```tsx
const CATEGORIES = ['language', 'framework', 'tool', 'platform'] as const
const CAT_COLOR: Record<string, string> = {
  language: '#6366f1', framework: '#ec4899', tool: '#14b8a6', platform: '#f97316',
}
```

Replace with:

```tsx
const CATEGORIES = ['language', 'framework', 'tool', 'platform', 'project'] as const
const CAT_COLOR: Record<string, string> = {
  language: '#6366f1', framework: '#ec4899', tool: '#14b8a6', platform: '#f97316', project: '#8b5cf6',
}
```

- [ ] **Step 2: Verify in browser**

Go to `/tech-radar`. Confirm:
- Category filter dropdown now includes "Project"
- When adding a new tech radar item, "project" appears in the category select
- A newly added project-category item renders with a violet badge

- [ ] **Step 3: Commit**

```bash
git add src/components/techradar/TechRadarPage.tsx
git commit -m "feat: add project category to Tech Radar"
```

---

## Task 3: People Linking — Schema Migration

Add optional `personId` FK to `GiftPerson` and `Companion` models.

**Files:**
- Modify: `prisma/schema.prisma`
- Generate: Prisma migration (auto-generated SQL)

---

- [ ] **Step 1: Update schema.prisma**

In `prisma/schema.prisma`, update the `GiftPerson` model (currently around line 254):

```prisma
model GiftPerson {
  id        Int        @id @default(autoincrement())
  name      String
  budget    Float?
  notes     String?
  personId  Int?
  person    Person?    @relation("GiftPersonLink", fields: [personId], references: [id], onDelete: SetNull)
  ideas     GiftIdea[]
  createdAt DateTime   @default(now())
}
```

Update the `Companion` model (currently around line 428):

```prisma
model Companion {
  id       Int     @id @default(autoincrement())
  name     String  @unique
  personId Int?
  person   Person? @relation("CompanionLink", fields: [personId], references: [id], onDelete: SetNull)
}
```

Update the `Person` model (currently around line 451) to add back-relations:

```prisma
model Person {
  id              Int          @id @default(autoincrement())
  name            String
  birthday        String?
  relationship    String?
  email           String?
  phone           String?
  lastContactDate String?
  notes           String?
  createdAt       DateTime     @default(now())
  giftLinks       GiftPerson[] @relation("GiftPersonLink")
  companionLinks  Companion[]  @relation("CompanionLink")
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/than/PersonalAssistant && npx prisma migrate dev --name add_person_links
```

Expected output: `The following migration(s) have been applied: 20260616xxxxxx_add_person_links`

- [ ] **Step 3: Verify schema applied**

```bash
npx prisma studio
```

Open browser to Prisma Studio (default port 5555). Confirm `GiftPerson` table has a `personId` column and `Companion` table has a `personId` column. Close Prisma Studio.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add personId FK to GiftPerson and Companion for people linking"
```

---

## Task 4: People Linking — Update Types

**Files:**
- Modify: `src/types/index.ts`

---

- [ ] **Step 1: Add personId to GiftPerson type and add Companion type**

In `src/types/index.ts`, find:

```ts
export interface GiftPerson { id: number; name: string; budget: number | null; notes: string | null; ideas: GiftIdea[] }
```

Replace with:

```ts
export interface GiftPerson { id: number; name: string; budget: number | null; notes: string | null; ideas: GiftIdea[]; personId: number | null }
export interface Companion { id: number; name: string; personId: number | null }
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add personId to GiftPerson type and add Companion type"
```

---

## Task 5: People Linking — Update API Routes

**Files:**
- Modify: `src/app/api/gifts/people/[id]/route.ts`
- Modify: `src/app/api/companions/route.ts`
- Create: `src/app/api/companions/[id]/route.ts`

---

- [ ] **Step 1: Update GiftPerson PUT to accept personId**

In `src/app/api/gifts/people/[id]/route.ts`, replace the entire file content:

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, budget, notes, personId } = await req.json()
  const person = await prisma.giftPerson.update({
    where: { id: Number(params.id) },
    data: {
      name,
      budget: budget != null ? Number(budget) : null,
      notes: notes ?? null,
      personId: personId != null ? Number(personId) : null,
    },
  })
  return NextResponse.json(person)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.giftPerson.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Update companions GET to include personId**

In `src/app/api/companions/route.ts`, the `findMany` already returns all fields including `personId` (Prisma returns all scalar fields by default). Verify the GET response now includes `personId` by running the dev server and fetching `http://localhost:<port>/api/companions`. If needed, no change is required since Prisma returns new columns automatically.

- [ ] **Step 3: Create companions/[id] route**

Create `src/app/api/companions/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { personId } = await req.json()
  const companion = await prisma.companion.update({
    where: { id: Number(params.id) },
    data: { personId: personId != null ? Number(personId) : null },
  })
  return NextResponse.json(companion)
}
```

- [ ] **Step 4: Update gifts/people GET to include personId in response**

In `src/app/api/gifts/people/route.ts`, check that the GET handler uses `include: { ideas: true }` and that `personId` is returned. Since Prisma returns all scalar fields, `personId` will be included automatically. Verify by checking the route — no change needed unless it explicitly selects fields.

Run: `curl http://localhost:<port>/api/gifts/people` and confirm `personId` field appears in response.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/gifts/people/[id]/route.ts src/app/api/companions/route.ts src/app/api/companions/[id]/route.ts
git commit -m "feat: add personId support to gift people and companions API"
```

---

## Task 6: People Linking — Gifts Page UI

Add a link-to-person control on each gift person row. If linked, shows a clickable person icon → `/people`. If unlinked, shows a "Link" button that opens an inline select.

**Files:**
- Modify: `src/components/gifts/GiftsPage.tsx`

---

- [ ] **Step 1: Add Person fetch and link state**

At the top of `GiftsPage` (main export function), add after the existing `useSWR` calls:

```tsx
import { User } from 'lucide-react'
```

Add to the import at the top of the file.

Inside the component, after `const [editing, setEditing] = useState<GiftPerson | null>(null)`:

```tsx
const { data: allPeople = [] } = useSWR<{ id: number; name: string }[]>('/api/people', fetcher)
const [linkingId, setLinkingId] = useState<number | null>(null)
```

- [ ] **Step 2: Add linkPerson helper function**

Inside `GiftsPage`, add after the `deletePerson` function:

```tsx
async function linkPerson(giftPersonId: number, personId: number | null) {
  const gp = people.find(p => p.id === giftPersonId)
  if (!gp) return
  await fetch(`/api/gifts/people/${giftPersonId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: gp.name, budget: gp.budget, notes: gp.notes, personId }),
  })
  setLinkingId(null)
  mutate()
}
```

- [ ] **Step 3: Add link UI to each gift person row header**

In the gift person row, find the button group inside `onClick={e => e.stopPropagation()}`:

```tsx
<div className="flex gap-1" onClick={e => e.stopPropagation()}>
  <button onClick={() => setEditing(person)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
  <button onClick={() => deletePerson(person.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
</div>
```

Replace with:

```tsx
<div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
  {person.personId ? (
    <a
      href="/people"
      title="View in People"
      className="p-1 text-blue-500 hover:text-blue-600"
    >
      <User size={14} />
    </a>
  ) : linkingId === person.id ? (
    <select
      autoFocus
      className="text-xs border rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white px-1 py-0.5"
      defaultValue=""
      onChange={e => linkPerson(person.id, e.target.value ? Number(e.target.value) : null)}
      onBlur={() => setLinkingId(null)}
    >
      <option value="">— pick person —</option>
      {allPeople.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  ) : (
    <button
      onClick={() => setLinkingId(person.id)}
      title="Link to People entry"
      className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500"
    >
      <User size={14} />
    </button>
  )}
  <button onClick={() => setEditing(person)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
  <button onClick={() => deletePerson(person.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
</div>
```

- [ ] **Step 4: Verify in browser**

Go to `/gifts`. For each person:
- Unlinked: grey person icon. Click it → dropdown appears with all People entries. Selecting one saves the link (icon turns blue). Clicking away cancels.
- Linked: blue person icon. Click it → navigates to `/people`.

- [ ] **Step 5: Commit**

```bash
git add src/components/gifts/GiftsPage.tsx
git commit -m "feat: add person link UI to gift person rows"
```

---

## Task 7: People Linking — Travel Page UI

Add a link-to-person control in the "By Person" section of the Travel page. The companion names come from trip strings; we look up the matching `Companion` record (by name) to read/write its `personId`.

**Files:**
- Modify: `src/components/travel/TravelPage.tsx`

---

- [ ] **Step 1: Update CollapsibleSection to accept labelSuffix**

In `src/components/travel/TravelPage.tsx`, find the `CollapsibleSection` component definition:

```tsx
function CollapsibleSection({ label, count, labelColor, defaultOpen, children }: {
  label: string
  count: number
  labelColor?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
```

Replace with:

```tsx
function CollapsibleSection({ label, count, labelColor, defaultOpen, labelSuffix, children }: {
  label: string
  count: number
  labelColor?: string
  defaultOpen?: boolean
  labelSuffix?: React.ReactNode
  children: React.ReactNode
}) {
```

Then find where the label is rendered inside `CollapsibleSection` (the `<button>` or header element that shows `label` and `count`). Add `{labelSuffix}` after the label text. The header typically looks like:

```tsx
<span className={`font-semibold ${labelColor ?? 'text-gray-800 dark:text-gray-200'}`}>{label}</span>
<span className="text-xs text-gray-400 ml-1">({count})</span>
```

Add `{labelSuffix && <span onClick={e => e.stopPropagation()}>{labelSuffix}</span>}` after the count span.

- [ ] **Step 2: Add imports and Companion fetch**

Add to the imports at the top of the file:

```tsx
import { User } from 'lucide-react'
import type { Companion } from '@/types'
```

Inside the `TravelPage` component, after the existing `useSWR` calls for countries and trips, add:

```tsx
const { data: companions = [], mutate: mutateCompanions } = useSWR<Companion[]>('/api/companions', fetcher)
const { data: allPeople = [] } = useSWR<{ id: number; name: string }[]>('/api/people', fetcher)
const [linkingCompanion, setLinkingCompanion] = useState<string | null>(null)
```

- [ ] **Step 3: Add linkCompanion helper**

After the `useSWR` calls, add:

```tsx
async function linkCompanion(companionName: string, personId: number | null) {
  const companion = companions.find(c => c.name.toLowerCase() === companionName.toLowerCase())
  if (!companion) return
  await fetch(`/api/companions/${companion.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId }),
  })
  setLinkingCompanion(null)
  mutateCompanions()
}
```

- [ ] **Step 4: Build companion name → personId map and pass labelSuffix**

In the "By Person" section, find:

```tsx
{companionList.map(([person, personTrips]) => (
  <CollapsibleSection
    key={person}
    label={person}
    count={personTrips.length}
    labelColor="text-purple-600 dark:text-purple-400"
    defaultOpen={false}
  >
```

Before this block, add (inside the render, after `companionList` is built):

```tsx
const companionPersonIdMap = new Map(companions.map(c => [c.name.toLowerCase(), c.personId]))
```

Replace the `CollapsibleSection` usage with:

```tsx
{companionList.map(([person, personTrips]) => {
  const linkedPersonId = companionPersonIdMap.get(person.toLowerCase()) ?? null
  const companionLinkSuffix = linkedPersonId ? (
    <a href="/people" title="View in People" className="ml-1 text-blue-500 hover:text-blue-600 inline-flex items-center">
      <User size={12} />
    </a>
  ) : linkingCompanion === person ? (
    <select
      autoFocus
      className="ml-1 text-xs border rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white px-1 py-0"
      defaultValue=""
      onChange={e => linkCompanion(person, e.target.value ? Number(e.target.value) : null)}
      onBlur={() => setLinkingCompanion(null)}
    >
      <option value="">— pick person —</option>
      {allPeople.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  ) : (
    <button
      onClick={() => setLinkingCompanion(person)}
      title="Link to People entry"
      className="ml-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 inline-flex items-center"
    >
      <User size={12} />
    </button>
  )
  return (
    <CollapsibleSection
      key={person}
      label={person}
      count={personTrips.length}
      labelColor="text-purple-600 dark:text-purple-400"
      defaultOpen={false}
      labelSuffix={companionLinkSuffix}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...personTrips]
          .sort((a: TravelTrip, b: TravelTrip) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
          .map((t: TravelTrip) => <TripCard key={t.id} trip={t} onClick={() => setEditTrip(t)} />)}
      </div>
    </CollapsibleSection>
  )
})}
```

- [ ] **Step 5: Verify in browser**

Go to `/travel` → "By Person" section. For each companion:
- Unlinked: grey person icon next to their name. Click → dropdown of People entries. Select one → icon turns blue.
- Linked: blue person icon. Click → navigates to `/people`.

- [ ] **Step 6: Commit**

```bash
git add src/components/travel/TravelPage.tsx
git commit -m "feat: add person link UI to travel companions"
```

---

## Task 8: People Linking — Update People Page to ID-Match

Update the People page badge detection to use personId FK matching (more reliable than name matching). Keep name matching as fallback for unlinked records so existing badges still appear.

**Files:**
- Modify: `src/components/people/PeoplePage.tsx`

---

- [ ] **Step 1: Update companion/giftPeople types and matching logic**

In `src/components/people/PeoplePage.tsx`, update the SWR calls from:

```tsx
const { data: companions = [] } = useSWR<{ id: number; name: string }[]>('/api/companions', fetcher)
const { data: giftPeople = [] } = useSWR<{ id: number; name: string; budget: number | null; notes: string | null }[]>('/api/gifts/people', fetcher)
const companionNames = new Set(companions.map(c => c.name.toLowerCase()))
const giftNames = new Set(giftPeople.map(g => g.name.toLowerCase()))
```

to:

```tsx
const { data: companions = [] } = useSWR<{ id: number; name: string; personId: number | null }[]>('/api/companions', fetcher)
const { data: giftPeople = [] } = useSWR<{ id: number; name: string; budget: number | null; notes: string | null; personId: number | null }[]>('/api/gifts/people', fetcher)
const companionPersonIds = new Set(companions.filter(c => c.personId).map(c => c.personId!))
const companionNames = new Set(companions.filter(c => !c.personId).map(c => c.name.toLowerCase()))
const giftPersonIds = new Set(giftPeople.filter(g => g.personId).map(g => g.personId!))
const giftNames = new Set(giftPeople.filter(g => !g.personId).map(g => g.name.toLowerCase()))
```

- [ ] **Step 2: Update isGiftPerson and isCompanion checks**

Find in the `filtered.map(p => { ... })` block:

```tsx
const isGiftPerson = giftNames.has(p.name.toLowerCase())
const isCompanion = companionNames.has(p.name.toLowerCase())
```

Replace with:

```tsx
const isGiftPerson = giftPersonIds.has(p.id) || giftNames.has(p.name.toLowerCase())
const isCompanion = companionPersonIds.has(p.id) || companionNames.has(p.name.toLowerCase())
```

- [ ] **Step 3: Verify in browser**

Go to `/people`. Confirm:
- People who were previously matched by name still show Gift/Travel badges
- People newly linked via ID also show badges
- A person whose name was changed in gifts but is ID-linked still shows the badge

- [ ] **Step 4: Commit**

```bash
git add src/components/people/PeoplePage.tsx
git commit -m "feat: use ID-based matching for gift/companion badges on People page (with name fallback)"
```

---

## Self-Review Notes

### Spec coverage check:
- ✅ Feature 1 (People linking / FK): Tasks 3–8
- ✅ Feature 2 (Projects in Tech Radar): Task 2
- ✅ Feature 3 (Sort direction): Task 1
- ✅ GiftPerson PUT accepts personId: Task 5 Step 1
- ✅ New companions/[id] route: Task 5 Step 3
- ✅ People page uses ID-match with name fallback: Task 8

### Implementation notes:
- The `CollapsibleSection` component in TravelPage is local to that file — `labelSuffix` prop change doesn't affect any other component.
- `Companion` model has `name @unique`, so `companions.find(c => c.name.toLowerCase() === ...)` is safe.
- The `GiftPerson` PUT already sends all fields — the `linkPerson` function in Task 6 must pass `name`/`budget`/`notes` alongside `personId` to avoid overwriting them with null.
- No existing data is affected by the migration — `personId` defaults to null (optional FK).
