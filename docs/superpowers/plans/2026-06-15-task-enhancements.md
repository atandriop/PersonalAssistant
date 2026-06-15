# Task Enhancements (Life Area + Tags) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add life area linkage and multi-tag support to tasks, making them first-class citizens in the life areas system alongside goals and habits.

**Architecture:** Extend the Task Prisma model with `lifeAreaId` (nullable FK) and `tags` (comma-separated string, same pattern as Document.tags). Update the serializer functions in both task API routes, the Task type, and the TaskForm/TasksTab UI.

**Tech Stack:** Prisma (SQLite), Next.js 14 App Router API routes, React + SWR, Tailwind CSS, Vitest

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Modify | `src/types/index.ts` |
| Modify | `src/app/api/tasks/route.ts` |
| Modify | `src/app/api/tasks/[id]/route.ts` |
| Modify | `src/components/tasks/TaskForm.tsx` |
| Modify | `src/components/tasks/TasksTab.tsx` |
| Create | `src/lib/taskTagUtils.ts` |
| Create | `src/lib/taskTagUtils.test.ts` |

---

### Task 1: Tag utility + tests

**Files:**
- Create: `src/lib/taskTagUtils.ts`
- Create: `src/lib/taskTagUtils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/taskTagUtils.test.ts
import { describe, it, expect } from 'vitest'
import { parseTags, serializeTags } from './taskTagUtils'

describe('parseTags', () => {
  it('splits comma-separated string into trimmed array', () => {
    expect(parseTags('work, personal , home')).toEqual(['work', 'personal', 'home'])
  })
  it('returns empty array for empty string', () => {
    expect(parseTags('')).toEqual([])
  })
  it('filters out blank entries from double commas', () => {
    expect(parseTags('work,,home')).toEqual(['work', 'home'])
  })
})

describe('serializeTags', () => {
  it('joins array into comma-separated string', () => {
    expect(serializeTags(['work', 'home'])).toBe('work,home')
  })
  it('returns empty string for empty array', () => {
    expect(serializeTags([])).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/taskTagUtils.test.ts
```

Expected: FAIL — `Cannot find module './taskTagUtils'`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/taskTagUtils.ts
export function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

export function serializeTags(tags: string[]): string {
  return tags.join(',')
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/taskTagUtils.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/taskTagUtils.ts src/lib/taskTagUtils.test.ts
git commit -m "feat: add tag parse/serialize utility for tasks"
```

---

### Task 2: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update schema**

In `prisma/schema.prisma`, find the `Task` model and add two fields after `blockedById`:

```prisma
  lifeAreaId        Int?
  lifeArea          LifeArea?        @relation("TaskLifeArea", fields: [lifeAreaId], references: [id], onDelete: SetNull)
  tags              String           @default("")
```

Find the `LifeArea` model and add a tasks relation:

```prisma
  tasks             Task[]           @relation("TaskLifeArea")
```

The complete updated `LifeArea` model should look like:

```prisma
model LifeArea {
  id        Int      @id @default(autoincrement())
  name      String
  color     String
  goals     Goal[]
  habits    Habit[]
  tasks     Task[]   @relation("TaskLifeArea")
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/than/PersonalAssistant && npx prisma migrate dev --name add_task_lifearea_tags
```

Expected: Migration applied, `Prisma Client generated`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add lifeAreaId and tags fields to Task model"
```

---

### Task 3: Update TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Extend Task interface**

In `src/types/index.ts`, update the `Task` interface to add three new fields:

```typescript
export interface Task {
  id: number
  title: string
  priority: string
  dueDate: string | null
  category: string | null
  notes: string | null
  done: boolean
  recurring: boolean
  recurringInterval: string | null
  blockedById: number | null
  blockedByTitle: string | null
  lifeAreaId: number | null
  lifeArea: { id: number; name: string; color: string } | null
  tags: string[]
  createdAt: string
  subtasks: Subtask[]
  sourceLink: TaskSourceLink | null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add lifeArea and tags to Task type"
```

---

### Task 4: Update API routes

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Update `src/app/api/tasks/route.ts`**

Replace the entire file with:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseTags, serializeTags } from '@/lib/taskTagUtils'

export const dynamic = 'force-dynamic'

function serializeTask(t: {
  id: number; title: string; priority: string; dueDate: string | null; category: string | null
  notes: string | null; done: boolean; recurring: boolean; recurringInterval: string | null
  blockedById: number | null; tags: string; createdAt: Date
  lifeAreaId: number | null
  lifeArea: { id: number; name: string; color: string } | null
  subtasks: { id: number; taskId: number; title: string; done: boolean }[]
  sourceLink: { id: number; taskId: number; sourceType: string; sourceId: number } | null
  blockedBy: { title: string } | null
}) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    blockedByTitle: t.blockedBy?.title ?? null,
    tags: parseTags(t.tags),
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const doneFilter = searchParams.get('done')

  const where = doneFilter !== null ? { done: doneFilter === 'true' } : {}

  const tasks = await prisma.task.findMany({
    where,
    include: {
      subtasks: true,
      sourceLink: true,
      blockedBy: { select: { title: true } },
      lifeArea: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tasks.map(serializeTask))
}

export async function POST(req: Request) {
  const {
    title, priority, dueDate, category, notes, subtasks = [], sourceLink,
    recurring, recurringInterval, blockedById, lifeAreaId, tags = [],
  } = await req.json()

  const task = await prisma.task.create({
    data: {
      title,
      priority: priority ?? 'Medium',
      dueDate: dueDate ?? null,
      category: category ?? null,
      notes: notes ?? null,
      recurring: recurring ?? false,
      recurringInterval: recurringInterval ?? null,
      blockedById: blockedById ? Number(blockedById) : null,
      lifeAreaId: lifeAreaId ? Number(lifeAreaId) : null,
      tags: serializeTags(tags),
      subtasks: subtasks.length > 0
        ? { create: subtasks.map((s: { title: string }) => ({ title: s.title })) }
        : undefined,
      sourceLink: sourceLink
        ? { create: { sourceType: sourceLink.sourceType, sourceId: Number(sourceLink.sourceId) } }
        : undefined,
    },
    include: {
      subtasks: true,
      sourceLink: true,
      blockedBy: { select: { title: true } },
      lifeArea: { select: { id: true, name: true, color: true } },
    },
  })
  return NextResponse.json(serializeTask(task), { status: 201 })
}
```

- [ ] **Step 2: Update `src/app/api/tasks/[id]/route.ts`**

Replace the entire file with:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addInterval } from '@/lib/taskUtils'
import { parseTags, serializeTags } from '@/lib/taskTagUtils'

function serializeTask(t: {
  id: number; title: string; priority: string; dueDate: string | null; category: string | null
  notes: string | null; done: boolean; recurring: boolean; recurringInterval: string | null
  blockedById: number | null; tags: string; createdAt: Date
  lifeAreaId: number | null
  lifeArea: { id: number; name: string; color: string } | null
  subtasks: { id: number; taskId: number; title: string; done: boolean }[]
  sourceLink: { id: number; taskId: number; sourceType: string; sourceId: number } | null
  blockedBy: { title: string } | null
}) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    blockedByTitle: t.blockedBy?.title ?? null,
    tags: parseTags(t.tags),
  }
}

const INCLUDE = {
  subtasks: true,
  sourceLink: true,
  blockedBy: { select: { title: true } },
  lifeArea: { select: { id: true, name: true, color: true } },
} as const

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: Number(params.id) },
    include: INCLUDE,
  })
  if (!task) return new NextResponse(null, { status: 404 })
  return NextResponse.json(serializeTask(task))
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const {
    title, priority, dueDate, category, notes, done, recurring,
    recurringInterval, blockedById, lifeAreaId, tags,
  } = body

  const existing = await prisma.task.findUnique({ where: { id }, include: { subtasks: true } })

  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      priority,
      dueDate: dueDate !== undefined ? dueDate : existing?.dueDate ?? null,
      category: category !== undefined ? category : existing?.category ?? null,
      notes: notes !== undefined ? notes : existing?.notes ?? null,
      done: done ?? false,
      recurring: recurring ?? existing?.recurring ?? false,
      recurringInterval: recurringInterval !== undefined ? recurringInterval : (existing?.recurringInterval ?? null),
      blockedById: blockedById !== undefined ? (blockedById ? Number(blockedById) : null) : existing?.blockedById,
      lifeAreaId: lifeAreaId !== undefined ? (lifeAreaId ? Number(lifeAreaId) : null) : existing?.lifeAreaId,
      tags: tags !== undefined ? serializeTags(Array.isArray(tags) ? tags : []) : existing?.tags ?? '',
    },
    include: INCLUDE,
  })

  if (done === true && task.recurring && task.recurringInterval) {
    const baseDue = task.dueDate ?? new Date().toISOString().slice(0, 10)
    const nextDue = addInterval(baseDue, task.recurringInterval)
    await prisma.task.create({
      data: {
        title: task.title,
        priority: task.priority,
        dueDate: nextDue,
        category: task.category,
        notes: task.notes,
        tags: task.tags,
        lifeAreaId: task.lifeAreaId,
        recurring: true,
        recurringInterval: task.recurringInterval,
        subtasks: existing?.subtasks && existing.subtasks.length > 0
          ? { create: existing.subtasks.map(s => ({ title: s.title })) }
          : undefined,
      },
    })
  }

  return NextResponse.json(serializeTask(task))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.task.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/route.ts src/app/api/tasks/[id]/route.ts
git commit -m "feat: expose lifeArea and tags in task API routes"
```

---

### Task 5: Update TaskForm UI

**Files:**
- Modify: `src/components/tasks/TaskForm.tsx`

- [ ] **Step 1: Add state and fetch for new fields**

In `TaskForm.tsx`, add these new state variables after the existing `blockedById` state (line ~39):

```typescript
const [lifeAreaId, setLifeAreaId] = useState<number | ''>(initial?.lifeAreaId ?? '')
const [tagInput, setTagInput] = useState(initial?.tags?.join(', ') ?? '')
```

Add a SWR fetch for life areas (always, not conditional) — replace or add alongside existing SWR calls:

```typescript
const { data: allLifeAreas = [] } = useSWR<{ id: number; name: string; color: string }[]>(
  '/api/life-areas',
  fetcher
)
```

- [ ] **Step 2: Add new fields to the submit body**

In the `submit` function, add `lifeAreaId` and `tags` to the `body` object:

```typescript
const body = {
  title,
  priority,
  dueDate: dueDate || null,
  category: category || null,
  notes: notes || null,
  subtasks,
  sourceLink: sourceType && sourceId
    ? { sourceType, sourceId: Number(sourceId) }
    : null,
  recurring,
  recurringInterval: recurring ? recurringInterval : null,
  blockedById: blockedById !== '' ? Number(blockedById) : null,
  lifeAreaId: lifeAreaId !== '' ? Number(lifeAreaId) : null,
  tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
}
```

- [ ] **Step 3: Add Life Area and Tags fields to the form JSX**

Add these two form fields before the final submit/cancel buttons (before the `<div className="flex justify-end gap-3 pt-2">` block):

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Life area</label>
  <select
    className={inputCls}
    value={lifeAreaId}
    onChange={e => setLifeAreaId(e.target.value === '' ? '' : Number(e.target.value))}
  >
    <option value="">None</option>
    {allLifeAreas.map(a => (
      <option key={a.id} value={a.id}>{a.name}</option>
    ))}
  </select>
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
  <input
    className={inputCls}
    placeholder="work, personal, urgent…"
    value={tagInput}
    onChange={e => setTagInput(e.target.value)}
  />
  <p className="text-xs text-gray-400 mt-0.5">Comma-separated</p>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskForm.tsx
git commit -m "feat: add life area and tags fields to TaskForm"
```

---

### Task 6: Show tags and life area in TasksTab

**Files:**
- Modify: `src/components/tasks/TasksTab.tsx`

- [ ] **Step 1: Add life area dot and tags chips to TaskRow**

In `TasksTab.tsx`, find the JSX in `TaskRow` where the task title is rendered. It's inside the main task row div. Add life area + tags display just below the title line. Look for the section that renders `task.title` and add after it:

```tsx
{/* life area + tags */}
{(task.lifeArea || (task.tags && task.tags.length > 0)) && (
  <div className="flex flex-wrap items-center gap-1 mt-0.5">
    {task.lifeArea && (
      <span
        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
        style={{ backgroundColor: task.lifeArea.color }}
      >
        {task.lifeArea.name}
      </span>
    )}
    {task.tags?.map(tag => (
      <span
        key={tag}
        className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      >
        {tag}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 2: Also pass lifeAreaId + tags through the toggleDone PUT call**

In the `toggleDone` function inside `TaskRow`, the fetch body needs to include the new fields so they are preserved when toggling done:

```typescript
async function toggleDone() {
  await fetch(`/api/tasks/${task.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
      category: task.category,
      notes: task.notes,
      done: !task.done,
      recurring: task.recurring,
      recurringInterval: task.recurringInterval,
      blockedById: task.blockedById,
      lifeAreaId: task.lifeAreaId,
      tags: task.tags,
    }),
  })
  onMutate()
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/TasksTab.tsx
git commit -m "feat: display life area and tags on task rows"
```

---

### Task 7: Run all tests

- [ ] **Step 1: Run full test suite**

```bash
cd /home/than/PersonalAssistant && npx vitest run
```

Expected: All tests pass including the new taskTagUtils tests.

- [ ] **Step 2: Start dev server and manually verify**

```bash
cd /home/than/PersonalAssistant && npm run dev
```

- Navigate to Tasks page
- Create a new task, set a life area and tags
- Verify life area dot and tag chips appear on the task row
- Edit the task — verify life area and tags are pre-populated
- Toggle done — verify the task recurs correctly (if recurring) with life area preserved
