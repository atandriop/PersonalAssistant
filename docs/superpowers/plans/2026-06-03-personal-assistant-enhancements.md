# Personal Assistant Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 11 features across the app: habit check-in notes, habit archiving, recurring tasks, task dependencies, memory/document tags, dashboard additions (overdue tasks + subscription renewal widget), Finance subscription renewal highlight, Goals deadline progress bar, enhanced Weekly Review AI prompt, and a global search page.

**Architecture:** Single Prisma migration adds all schema fields at once. API routes updated per feature. All UI is React with SWR for data fetching. No new dependencies.

**Note:** Net worth history chart, Goals AI prompt, and subscription renewal in Weekly Review are already implemented — skip those.

**Tech Stack:** Next.js 14 App Router, Prisma + SQLite, SWR, Tailwind CSS, TypeScript strict mode.

---

### Task 1: DB Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev`

- [ ] **Step 1: Update schema.prisma with all new fields**

Add to `HabitLog`:
```prisma
model HabitLog {
  id      Int    @id @default(autoincrement())
  habitId Int
  habit   Habit  @relation(fields: [habitId], references: [id], onDelete: Cascade)
  date    String
  note    String?
  @@unique([habitId, date])
}
```

Add to `Habit`:
```prisma
model Habit {
  id         Int             @id @default(autoincrement())
  name       String
  color      String
  logs       HabitLog[]
  goalLinks  GoalHabitLink[]
  archivedAt DateTime?
  createdAt  DateTime        @default(now())
}
```

Add to `Task` (self-relation for blockedBy):
```prisma
model Task {
  id                Int              @id @default(autoincrement())
  title             String
  priority          String           @default("Medium")
  dueDate           DateTime?
  category          String?
  notes             String?
  done              Boolean          @default(false)
  recurring         Boolean          @default(false)
  recurringInterval String?
  blockedById       Int?
  blockedBy         Task?            @relation("TaskBlocking", fields: [blockedById], references: [id])
  blocking          Task[]           @relation("TaskBlocking")
  createdAt         DateTime         @default(now())
  subtasks          Subtask[]
  sourceLink        TaskSourceLink?
}
```

Add to `Memory`:
```prisma
model Memory {
  id        Int          @id @default(autoincrement())
  title     String
  date      String
  endDate   String?
  category  String
  location  String?
  notes     String?
  tags      String       @default("")
  trips     MemoryTrip[]
  createdAt DateTime     @default(now())
}
```

Add to `Document`:
```prisma
model Document {
  id           Int      @id @default(autoincrement())
  name         String
  filename     String   @unique
  originalName String
  mimeType     String
  size         Int
  category     String
  notes        String?
  expiryDate   String?
  tags         String   @default("")
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/than/PersonalAssistant
npx prisma migrate dev --name "enhancements"
```

Expected: Migration created and applied successfully.

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: schema migration for habit notes, archiving, recurring tasks, task deps, tags"
```

---

### Task 2: Update Habit Log API

**Files:**
- Modify: `src/app/api/habits/[id]/logs/route.ts`

The GET now returns `{ date: string; note: string | null }[]` (was `string[]`). POST now accepts optional `note`.

- [ ] **Step 1: Rewrite the logs route**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const since = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000)
  const sinceStr = since.toISOString().slice(0, 10)
  const logs = await prisma.habitLog.findMany({
    where: { habitId, date: { gte: sinceStr } },
    select: { date: true, note: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(logs)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const today = new Date().toISOString().slice(0, 10)
  const body = await req.json().catch(() => ({}))
  const note: string | null = body.note?.trim() || null

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: 'deleted' })
  }
  await prisma.habitLog.create({ data: { habitId, date: today, note } })
  return NextResponse.json({ action: 'created' }, { status: 201 })
}
```

- [ ] **Step 2: Update all callers to handle `{ date, note }[]` instead of `string[]`**

**`src/components/habits/HabitsPage.tsx`** — `HabitRow` and `openPrompt`:

In `HabitRow`:
```typescript
function HabitRow({ habit, onEdit, onDelete }: { habit: Habit; onEdit: () => void; onDelete: () => void }) {
  const { data: logs = [], mutate } = useSWR<{ date: string; note: string | null }[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const loggedSet = new Set(logs.map(l => l.date))
  const today = toDateStr(new Date())
  // ... rest unchanged, loggedSet works the same
```

In `HabitRow.toggle`, add note support (see Task 4 for the full UI — for now just keep toggle working):
```typescript
  async function toggle() {
    await fetch(`/api/habits/${habit.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    mutate()
  }
```

In `openPrompt` inside `HabitsPage`:
```typescript
const logs: { date: string; note: string | null }[] = await fetch(`/api/habits/${h.id}/logs`).then(r => r.json())
const logSet = new Set(logs.map(l => l.date))
const recent = logs.filter(l => l.date >= cutoffStr)
const pct = Math.round((recent.length / 84) * 100)
```

**`src/components/dashboard/DashboardPage.tsx`** — `HabitDoneCheck` and `HabitTodayRow`:

```typescript
function HabitDoneCheck({ habitId, today, onResult }: {
  habitId: number; today: string
  onResult: (id: number, done: boolean) => void
}) {
  const { data: logs = [] } = useSWR<{ date: string; note: string | null }[]>(`/api/habits/${habitId}/logs`, fetcher)
  useEffect(() => { onResult(habitId, logs.some(l => l.date === today)) }, [habitId, today, logs, onResult])
  return null
}

function HabitTodayRow({ habit }: { habit: Habit }) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: logs = [], mutate } = useSWR<{ date: string; note: string | null }[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const done = logs.some(l => l.date === today)

  async function toggle() {
    await fetch(`/api/habits/${habit.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    mutate()
  }
  // ... rest unchanged
```

**`src/components/weeklyreview/WeeklyReviewPage.tsx`** — `HabitWeekRow`:

```typescript
function HabitWeekRow({ habit, weekDates, onCount }: {
  habit: Habit; weekDates: string[]
  onCount?: (id: number, count: number) => void
}) {
  const { data: logs = [] } = useSWR<{ date: string; note: string | null }[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const logDates = logs.map(l => l.date)
  const count = weekDates.filter(d => logDates.includes(d)).length
  // ... rest unchanged
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: habit log API returns objects with note field, update all callers"
```

---

### Task 3: Habit Archiving

**Files:**
- Modify: `src/app/api/habits/route.ts`
- Modify: `src/app/api/habits/[id]/route.ts`
- Modify: `src/components/habits/HabitsPage.tsx`

- [ ] **Step 1: Update `GET /api/habits` to filter archived**

In `src/app/api/habits/route.ts`, the GET:
```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const archived = searchParams.get('archived') === 'true'
  const habits = await prisma.habit.findMany({
    where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(habits)
}
```

- [ ] **Step 2: Update `PUT /api/habits/[id]` to accept archived**

In `src/app/api/habits/[id]/route.ts`, the PUT:
```typescript
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, color, archived } = await req.json()
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (color !== undefined) data.color = color
  if (archived === true) data.archivedAt = new Date()
  if (archived === false) data.archivedAt = null
  const habit = await prisma.habit.update({
    where: { id: Number(params.id) },
    data,
  })
  return NextResponse.json(habit)
}
```

- [ ] **Step 3: Add Archive button to HabitRow and archived section to HabitsPage**

In `src/components/habits/HabitsPage.tsx`:

Add `onArchive` prop to `HabitRow`:
```typescript
function HabitRow({ habit, onEdit, onDelete, onArchive }: {
  habit: Habit; onEdit: () => void; onDelete: () => void; onArchive: () => void
}) {
  // ... existing code ...
  // In the button row, replace Delete button with:
  <button onClick={onArchive} className="text-xs px-2 py-1 text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20">Archive</button>
  <button onClick={onDelete} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
```

In `HabitsPage`, add archived habits fetch and section:
```typescript
const { data: archivedHabits = [], mutate: mutateArchived } = useSWR<Habit[]>('/api/habits?archived=true', fetcher)
const [showArchived, setShowArchived] = useState(false)

async function archive(id: number) {
  if (!confirm('Archive this habit? You can restore it later.')) return
  await fetch(`/api/habits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived: true }),
  })
  mutate()
  mutateArchived()
}

async function restore(id: number) {
  await fetch(`/api/habits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived: false }),
  })
  mutate()
  mutateArchived()
}
```

Below the active habits list, add:
```tsx
{archivedHabits.length > 0 && (
  <div className="mt-6">
    <button
      onClick={() => setShowArchived(v => !v)}
      className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
    >
      <span>{showArchived ? '▾' : '▸'}</span>
      Archived ({archivedHabits.length})
    </button>
    {showArchived && (
      <div className="flex flex-col gap-2 mt-2">
        {archivedHabits.map(h => (
          <div key={h.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.color }} />
            <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{h.name}</span>
            <button onClick={() => restore(h.id)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">Restore</button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

In the habits map:
```tsx
{habits.map(h => (
  <HabitRow key={h.id} habit={h} onEdit={() => setEditing(h)} onDelete={() => del(h.id)} onArchive={() => archive(h.id)} />
))}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: habit archiving — archive/restore habits without losing history"
```

---

### Task 4: Habit Check-in Notes UI

**Files:**
- Modify: `src/components/habits/HabitsPage.tsx`

When the user clicks "Mark done", show a small optional note textarea. When they confirm, POST with the note.

- [ ] **Step 1: Add note state and note UI to HabitRow**

Replace `HabitRow`'s toggle button with a two-step flow: first click opens a tiny note popover, "Done" button submits:

```typescript
function HabitRow({ habit, onEdit, onDelete, onArchive }: { habit: Habit; onEdit: () => void; onDelete: () => void; onArchive: () => void }) {
  const { data: logs = [], mutate } = useSWR<{ date: string; note: string | null }[]>(`/api/habits/${habit.id}/logs`, fetcher)
  const loggedSet = new Set(logs.map(l => l.date))
  const today = toDateStr(new Date())
  const streak = getStreak(loggedSet)
  const heatmapDates = buildHeatmapDates()
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')

  const weeks: Date[][] = []
  for (let i = 0; i < 12; i++) weeks.push(heatmapDates.slice(i * 7, i * 7 + 7))

  const isDone = loggedSet.has(today)
  const todayNote = logs.find(l => l.date === today)?.note ?? null

  async function toggle(note?: string) {
    await fetch(`/api/habits/${habit.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note ?? null }),
    })
    mutate()
    setShowNoteInput(false)
    setNoteText('')
  }

  function handleMarkDoneClick() {
    if (isDone) { toggle(); return }
    setShowNoteInput(true)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: habit.color }} />
        <span className="font-medium text-gray-900 dark:text-white flex-1">{habit.name}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {streak > 0 ? `🔥 ${streak} day${streak !== 1 ? 's' : ''}` : '—'}
        </span>
        <button
          onClick={handleMarkDoneClick}
          className="text-xs px-2 py-1 rounded-md border transition-colors"
          style={isDone
            ? { background: habit.color, borderColor: habit.color, color: 'white' }
            : { borderColor: habit.color, color: habit.color }
          }>
          {isDone ? '✓ Done' : 'Mark done'}
        </button>
        <button onClick={onEdit} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
        <button onClick={onArchive} className="text-xs px-2 py-1 text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20">Archive</button>
        <button onClick={onDelete} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
      </div>

      {showNoteInput && (
        <div className="mb-3 flex gap-2 items-end">
          <textarea
            autoFocus
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note (optional)…"
            rows={2}
            className="flex-1 text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => toggle(noteText || undefined)}
              className="text-xs px-3 py-1.5 rounded-md text-white"
              style={{ background: habit.color }}
            >Done</button>
            <button
              onClick={() => { setShowNoteInput(false); setNoteText('') }}
              className="text-xs px-3 py-1.5 rounded-md border dark:border-gray-600 dark:text-gray-300"
            >Skip</button>
          </div>
        </div>
      )}

      {!showNoteInput && isDone && todayNote && (
        <p className="text-xs text-gray-400 italic mb-2">"{todayNote}"</p>
      )}

      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(d => {
              const ds = toDateStr(d)
              const logEntry = logs.find(l => l.date === ds)
              const done = !!logEntry
              const isToday = ds === today
              const isFuture = d > new Date()
              return (
                <div
                  key={ds}
                  title={logEntry?.note ? `${ds}: ${logEntry.note}` : ds}
                  className={`w-3 h-3 rounded-sm transition-colors ${isToday ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500' : ''} ${isFuture ? 'invisible' : ''}`}
                  style={{ backgroundColor: done ? habit.color : 'rgb(229 231 235)' }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: habit check-in notes — optional note when marking done, shown in heatmap tooltip"
```

---

### Task 5: Recurring Tasks

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/[id]/route.ts`
- Modify: `src/components/tasks/TaskForm.tsx`
- Modify: `src/components/tasks/TasksTab.tsx`

- [ ] **Step 1: Update Task type**

In `src/types/index.ts`, add to the `Task` interface:
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
  createdAt: string
  subtasks: Subtask[]
  sourceLink: TaskSourceLink | null
}
```

- [ ] **Step 2: Update GET /api/tasks to include blockedBy**

In `src/app/api/tasks/route.ts`:
```typescript
export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { subtasks: true, sourceLink: true, blockedBy: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tasks.map(t => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    blockedById: t.blockedById,
    blockedByTitle: t.blockedBy?.title ?? null,
  })))
}
```

Also update POST to accept `recurring`, `recurringInterval`, `blockedById`:
```typescript
export async function POST(req: Request) {
  const { title, priority, dueDate, category, notes, subtasks = [], sourceLink, recurring, recurringInterval, blockedById } = await req.json()
  const task = await prisma.task.create({
    data: {
      title,
      priority: priority ?? 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category ?? null,
      notes: notes ?? null,
      recurring: recurring ?? false,
      recurringInterval: recurringInterval ?? null,
      blockedById: blockedById ? Number(blockedById) : null,
      subtasks: subtasks.length > 0
        ? { create: subtasks.map((s: { title: string }) => ({ title: s.title })) }
        : undefined,
      sourceLink: sourceLink
        ? { create: { sourceType: sourceLink.sourceType, sourceId: Number(sourceLink.sourceId) } }
        : undefined,
    },
    include: { subtasks: true, sourceLink: true, blockedBy: { select: { id: true, title: true } } },
  })
  return NextResponse.json({
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    blockedById: task.blockedById,
    blockedByTitle: task.blockedBy?.title ?? null,
  }, { status: 201 })
}
```

- [ ] **Step 3: Update PUT /api/tasks/[id] with recurring + blockedById + auto-regeneration**

In `src/app/api/tasks/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function addInterval(date: Date, interval: string): Date {
  const d = new Date(date)
  switch (interval) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: Number(params.id) },
    include: { subtasks: true, sourceLink: true, blockedBy: { select: { id: true, title: true } } },
  })
  if (!task) return new NextResponse(null, { status: 404 })
  return NextResponse.json({
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    blockedByTitle: task.blockedBy?.title ?? null,
  })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { title, priority, dueDate, category, notes, done, recurring, recurringInterval, blockedById } = await req.json()

  const existing = await prisma.task.findUnique({ where: { id }, include: { subtasks: true } })

  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category ?? null,
      notes: notes ?? null,
      done: done ?? false,
      recurring: recurring ?? existing?.recurring ?? false,
      recurringInterval: recurringInterval ?? existing?.recurringInterval ?? null,
      blockedById: blockedById !== undefined ? (blockedById ? Number(blockedById) : null) : existing?.blockedById,
    },
    include: { subtasks: true, sourceLink: true, blockedBy: { select: { id: true, title: true } } },
  })

  // Auto-create successor for recurring tasks when marked done
  if (done === true && task.recurring && task.recurringInterval) {
    const baseDue = task.dueDate ?? new Date()
    const nextDue = addInterval(baseDue, task.recurringInterval)
    await prisma.task.create({
      data: {
        title: task.title,
        priority: task.priority,
        dueDate: nextDue,
        category: task.category,
        notes: task.notes,
        recurring: true,
        recurringInterval: task.recurringInterval,
        subtasks: existing?.subtasks && existing.subtasks.length > 0
          ? { create: existing.subtasks.map(s => ({ title: s.title })) }
          : undefined,
      },
    })
  }

  return NextResponse.json({
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    blockedByTitle: task.blockedBy?.title ?? null,
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.task.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Update TaskForm to show recurring toggle + interval**

In `src/components/tasks/TaskForm.tsx`, add state and UI:
```typescript
const [recurring, setRecurring] = useState(initial?.recurring ?? false)
const [recurringInterval, setRecurringInterval] = useState(initial?.recurringInterval ?? 'weekly')
const [blockedById, setBlockedById] = useState<number | ''>(initial?.blockedById ?? '')
```

In the `body` object inside `submit`:
```typescript
const body = {
  title, priority,
  dueDate: dueDate || null,
  category: category || null,
  notes: notes || null,
  subtasks,
  sourceLink: sourceType && sourceId ? { sourceType, sourceId: Number(sourceId) } : null,
  recurring,
  recurringInterval: recurring ? recurringInterval : null,
  blockedById: blockedById !== '' ? Number(blockedById) : null,
}
```

Add to the form JSX (after the notes textarea):
```tsx
<div className="flex items-center gap-3">
  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
    <input
      type="checkbox"
      checked={recurring}
      onChange={e => setRecurring(e.target.checked)}
      className="rounded"
    />
    Recurring
  </label>
  {recurring && (
    <select
      value={recurringInterval}
      onChange={e => setRecurringInterval(e.target.value)}
      className={inputCls + ' w-auto flex-none'}
    >
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </select>
  )}
</div>
```

Add "Blocked by" field. First fetch open tasks (excluding self):
```typescript
const { data: allTasks = [] } = useSWR<{ id: number; title: string }[]>('/api/tasks', fetcher)
const blockableOptions = allTasks.filter(t => !t.done && t.id !== initial?.id)
```

Add to JSX:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blocked by</label>
  <select
    className={inputCls}
    value={blockedById}
    onChange={e => setBlockedById(e.target.value === '' ? '' : Number(e.target.value))}
  >
    <option value="">None</option>
    {blockableOptions.map(t => (
      <option key={t.id} value={t.id}>{t.title}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 5: Update TasksTab / TaskRow to show recurring badge + blocked indicator**

In `src/components/tasks/TasksTab.tsx`, in `TaskRow`'s header div, after the dueDate span:

```tsx
{task.recurring && (
  <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0" title={`Repeats ${task.recurringInterval}`}>
    ↻
  </span>
)}
{task.blockedByTitle && (
  <span className="text-xs text-orange-500 shrink-0" title={`Blocked by: ${task.blockedByTitle}`}>
    🚫
  </span>
)}
```

Also in `TaskRow`'s `toggleDone`, pass `recurring` and `recurringInterval` through:
```typescript
body: JSON.stringify({
  title: task.title,
  priority: task.priority,
  dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
  category: task.category,
  notes: task.notes,
  done: !task.done,
  recurring: task.recurring,
  recurringInterval: task.recurringInterval,
}),
```

In the expanded section, show blocked-by if present:
```tsx
{task.blockedByTitle && (
  <p className="text-xs text-orange-500 dark:text-orange-400 mb-3">
    🚫 Blocked by: {task.blockedByTitle}
  </p>
)}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/ prisma/
git commit -m "feat: recurring tasks (auto-regenerate on done) and task dependencies (blocked-by)"
```

---

### Task 6: Memory Tags

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/api/memories/route.ts`
- Modify: `src/app/api/memories/[id]/route.ts`
- Modify: `src/components/memories/MemoryForm.tsx`
- Modify: `src/components/memories/MemoriesPage.tsx`

Tags are stored as a comma-separated string in DB. UI shows them as chips.

- [ ] **Step 1: Update Memory type**

In `src/types/index.ts`, add to `Memory`:
```typescript
export interface Memory {
  id: number
  title: string
  date: string
  endDate: string | null
  category: 'Career' | 'Education' | 'Travel' | 'Personal' | 'Other'
  location: string | null
  notes: string | null
  tags: string[]
  trips: { id: number; countryName: string; startDate: string | null }[]
  createdAt: string
}
```

- [ ] **Step 2: Update memories API routes**

In `src/app/api/memories/route.ts`, update `serializeMemory` to include tags:
```typescript
function serializeMemory(m: {
  id: number; title: string; date: string; endDate: string | null
  category: string; location: string | null; notes: string | null
  tags: string
  createdAt: Date
  trips: { trip: { id: number; startDate: string | null; country: { name: string } } }[]
}) {
  return {
    // ... existing fields ...
    tags: m.tags ? m.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  }
}
```

Update POST to accept tags:
```typescript
const { title, date, endDate, category, location, notes, tripIds, tags } = await req.json()
// ...
const memory = await prisma.memory.create({
  data: {
    // ... existing ...
    tags: Array.isArray(tags) ? tags.filter(Boolean).join(',') : '',
  },
  // ...
})
```

In `src/app/api/memories/[id]/route.ts`, update PUT similarly:
```typescript
const { title, date, endDate, category, location, notes, tripIds, tags } = await req.json()
// In update data:
tags: Array.isArray(tags) ? tags.filter(Boolean).join(',') : undefined,
```

Also update GET to serialize tags the same way (read the file to see current GET implementation, then add tags field to the select and serialization).

- [ ] **Step 3: Update MemoryForm to include tag input**

In `src/components/memories/MemoryForm.tsx` (read the file first to see exact structure), add:

```typescript
const [tagInput, setTagInput] = useState('')
const [tags, setTags] = useState<string[]>(initial?.tags ?? [])

function addTag() {
  const t = tagInput.trim().toLowerCase()
  if (t && !tags.includes(t)) setTags(prev => [...prev, t])
  setTagInput('')
}

function removeTag(t: string) {
  setTags(prev => prev.filter(x => x !== t))
}
```

In the form body passed to POST/PUT:
```typescript
body: JSON.stringify({ ...existingFields, tags }),
```

Add to form JSX (before submit buttons):
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
  <div className="flex flex-wrap gap-1 mb-2">
    {tags.map(t => (
      <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
        {t}
        <button type="button" onClick={() => removeTag(t)} className="opacity-70 hover:opacity-100">×</button>
      </span>
    ))}
  </div>
  <div className="flex gap-2">
    <input
      value={tagInput}
      onChange={e => setTagInput(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
      placeholder="Add tag…"
      className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
    />
    <button type="button" onClick={addTag} className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300">Add</button>
  </div>
</div>
```

- [ ] **Step 4: Add tag filter chips to MemoriesPage**

In `src/components/memories/MemoriesPage.tsx`, extract all unique tags:
```typescript
const [tagFilter, setTagFilter] = useState<string | null>(null)
const allTags = Array.from(new Set(memories.flatMap(m => m.tags))).sort()
```

In filtered:
```typescript
const filtered = memories
  .filter(m => !tripIdFilter || m.trips.some(t => t.id === tripIdFilter))
  .filter(m => categoryFilter === 'All' || m.category === categoryFilter)
  .filter(m => !tagFilter || m.tags.includes(tagFilter))
```

Add tag chips below the category filters:
```tsx
{allTags.length > 0 && (
  <div className="flex gap-2 flex-wrap mb-4">
    <button
      onClick={() => setTagFilter(null)}
      className={`px-3 py-1 text-xs rounded-full font-medium ${!tagFilter ? 'bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}
    >
      All tags
    </button>
    {allTags.map(tag => (
      <button
        key={tag}
        onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
        className={`px-3 py-1 text-xs rounded-full font-medium ${tagFilter === tag ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100'}`}
      >
        #{tag}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 5: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/
git commit -m "feat: memory tags — add/filter tags on memories"
```

---

### Task 7: Document Tags

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/api/documents/route.ts`
- Modify: `src/app/api/documents/[id]/route.ts`
- Modify: `src/components/documents/DocumentForm.tsx`
- Modify: `src/components/documents/DocumentsPage.tsx`

Same pattern as memory tags (comma-separated string in DB, array in API response).

- [ ] **Step 1: Update Document type**

In `src/types/index.ts`, update Document:
```typescript
export interface Document {
  id: number
  name: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  category: string
  notes: string | null
  expiryDate: string | null
  tags: string[]
  createdAt: string
}
```

- [ ] **Step 2: Update document API routes**

Read `src/app/api/documents/route.ts` and `src/app/api/documents/[id]/route.ts` before editing.

In GET route, after fetching, map to include parsed tags:
```typescript
return NextResponse.json(docs.map(d => ({
  ...d,
  createdAt: d.createdAt.toISOString(),
  tags: d.tags ? d.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
})))
```

In POST route, accept `tags` from formdata or JSON and store as comma-separated string.

Note: documents use multipart/form-data for file upload. Check the existing POST route to understand how to add tags field. The approach:
```typescript
const tags = formData.get('tags') as string ?? ''
// store as-is (already comma-separated from form)
```

In PUT (JSON), add:
```typescript
const { name, category, notes, expiryDate, tags } = await req.json()
await prisma.document.update({
  where: { id: Number(params.id) },
  data: {
    name: name ?? undefined,
    category: category ?? undefined,
    notes: notes ?? null,
    expiryDate: expiryDate ?? null,
    tags: Array.isArray(tags) ? tags.filter(Boolean).join(',') : (tags ?? undefined),
  },
})
```

- [ ] **Step 3: Update DocumentForm with tag input (same pattern as MemoryForm Task 6 Step 3)**

Read `src/components/documents/DocumentForm.tsx` before editing. Add the same tag input UI as in Task 6 Step 3.

For the POST (multipart), append tags as a JSON string to FormData:
```typescript
formData.append('tags', tags.join(','))
```

For PUT (JSON edit), include tags in the request body.

- [ ] **Step 4: Add tag filtering to DocumentsPage**

Read `src/components/documents/DocumentsPage.tsx` before editing. Apply the same tag filter chip pattern as Task 6 Step 4.

- [ ] **Step 5: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/
git commit -m "feat: document tags — add/filter tags on documents"
```

---

### Task 8: Dashboard Additions

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

Add two new widgets: Overdue Tasks and Subscriptions Renewing Soon. Both use SWR with existing API endpoints.

- [ ] **Step 1: Add SWR fetches for tasks and subscriptions**

At top of `DashboardPage`:
```typescript
const { data: tasks = [] } = useSWR<Task[]>('/api/tasks', fetcher)
const { data: subscriptions = [] } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
```

Add the needed types import if not already present:
```typescript
import type { Habit, LifeArea, GiftPerson, Appointment, Document, BucketTrip, BucketExperience, TravelCountry, TravelTrip, Memory, Task, Subscription } from '@/types'
```

- [ ] **Step 2: Compute derived data**

```typescript
const overdueTasks = tasks
  .filter(t => !t.done && t.dueDate && t.dueDate.slice(0, 10) < today)
  .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  .slice(0, 5)

const today30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const renewingSoon = subscriptions
  .filter(s => s.active && s.renewalDate != null)
  .filter(s => s.renewalDate!.slice(0, 10) >= today && s.renewalDate!.slice(0, 10) <= today30)
  .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))
```

- [ ] **Step 3: Add the two new WidgetCards to the grid**

Add "Overdue Tasks" widget:
```tsx
<WidgetCard title="Overdue Tasks" borderStyle={overdueTasks.length > 0 ? { borderColor: '#f87171' } : {}}>
  {overdueTasks.length === 0 ? (
    <p className="text-sm text-green-600 dark:text-green-400">No overdue tasks ✓</p>
  ) : (
    <div className="flex flex-col gap-1">
      {overdueTasks.map(t => (
        <div key={t.id} className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.title}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              t.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              t.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>{t.priority}</span>
            <span className="text-xs text-red-500 font-medium">{t.dueDate!.slice(0, 10)}</span>
          </div>
        </div>
      ))}
    </div>
  )}
</WidgetCard>
```

Add "Subscriptions Renewing" widget (only show if any renewing within 30 days):
```tsx
{renewingSoon.length > 0 && (
  <WidgetCard title="Subscriptions Renewing" borderStyle={{ borderColor: '#fbbf24' }}>
    <div className="flex flex-col gap-1">
      {renewingSoon.map(s => {
        const renewDate = s.renewalDate!.slice(0, 10)
        const daysLeft = Math.round((new Date(renewDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
        return (
          <div key={s.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
            <div className="text-right shrink-0">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">
                {daysLeft === 0 ? 'today' : `${daysLeft}d`}
              </span>
              <span className="text-xs text-gray-400">€{s.cost.toFixed(2)}/{s.period}</span>
            </div>
          </div>
        )
      })}
    </div>
  </WidgetCard>
)}
```

- [ ] **Step 4: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/
git commit -m "feat: dashboard overdue tasks widget and subscriptions renewing soon widget"
```

---

### Task 9: Finance Subscription Renewal Highlight

**Files:**
- Modify: `src/components/finance/FinancePage.tsx`

In the subscriptions list, show an amber badge if a subscription renews within 14 days.

- [ ] **Step 1: Compute renewal alerts**

In `FinancePage`, after computing `activeSubs`:
```typescript
const today = new Date().toISOString().slice(0, 10)
const in14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
```

- [ ] **Step 2: Update subscription list rendering**

In the subscription list div, update the item render to show a renewal badge:
```tsx
{activeSubs.map(s => {
  const renewSoon = s.renewalDate &&
    s.renewalDate.slice(0, 10) >= today &&
    s.renewalDate.slice(0, 10) <= in14
  return (
    <div key={s.id} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{s.name}</span>
        {s.renewalDate && (
          <span className={`text-xs ml-2 ${renewSoon ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>
            renews {new Date(s.renewalDate.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {renewSoon && ' ⚠'}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white shrink-0 ml-2">{fmtDecimal(s.monthly)}/mo</span>
    </div>
  )
})}
```

- [ ] **Step 3: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/
git commit -m "feat: Finance page highlights subscriptions renewing in the next 14 days"
```

---

### Task 10: Goals Deadline Progress Bar

**Files:**
- Modify: `src/components/goals/GoalsPage.tsx`

Parse the `timePeriod` string (e.g., "2026", "Q2 2026", "H1 2026") into a date range and show a time-elapsed bar in each `GoalRow`.

- [ ] **Step 1: Add a parseTimePeriod helper**

Add this function near the top of `GoalsPage.tsx`:

```typescript
function parseTimePeriod(tp: string): { start: Date; end: Date } | null {
  const y = tp.match(/^(\d{4})$/)
  if (y) {
    return {
      start: new Date(`${y[1]}-01-01`),
      end: new Date(`${y[1]}-12-31`),
    }
  }
  const q = tp.match(/^Q([1-4])\s+(\d{4})$/)
  if (q) {
    const quarter = Number(q[1])
    const year = Number(q[2])
    const startMonth = (quarter - 1) * 3
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, startMonth + 3, 0)
    return { start, end }
  }
  const h = tp.match(/^H([12])\s+(\d{4})$/)
  if (h) {
    const half = Number(h[1])
    const year = Number(h[2])
    return {
      start: new Date(year, half === 1 ? 0 : 6, 1),
      end: new Date(year, half === 1 ? 5 : 11, half === 1 ? 30 : 31),
    }
  }
  return null
}
```

- [ ] **Step 2: Add time bar to GoalRow**

In the `GoalRow` component (around line 279 in GoalsPage.tsx), after the `pct` computation, add:

```typescript
const now = new Date()
const period = parseTimePeriod(goal.timePeriod)
const timeElapsedPct = period
  ? Math.min(100, Math.max(0, Math.round(
      ((now.getTime() - period.start.getTime()) / (period.end.getTime() - period.start.getTime())) * 100
    )))
  : null
const isOverdue = period ? now > period.end : false
```

In the expanded `GoalRow` content, just below the milestone progress bar (or inside the header section before expanded), add the time bar after the existing progress display:

```tsx
{timeElapsedPct !== null && (
  <div className="mt-1 mb-1">
    <div className="flex justify-between text-xs text-gray-400 mb-0.5">
      <span>Time elapsed</span>
      <span className={isOverdue ? 'text-red-500' : ''}>{timeElapsedPct}%</span>
    </div>
    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${isOverdue ? 'bg-red-400' : timeElapsedPct > 75 ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-500'}`}
        style={{ width: `${timeElapsedPct}%` }}
      />
    </div>
  </div>
)}
```

Place this inside the `GoalRow` header section (inside the `<div className="flex-1 min-w-0">` block), so it's visible without needing to expand the goal.

- [ ] **Step 3: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/
git commit -m "feat: goals deadline progress bar — visual time-elapsed indicator per goal"
```

---

### Task 11: Weekly Review Prompt Enhancement

**Files:**
- Modify: `src/components/weeklyreview/WeeklyReviewPage.tsx`

The existing `buildPrompt()` only covers wishlist/inventory/portfolio. Extend it to include habits, goals, and maintenance data that the page already fetches.

- [ ] **Step 1: Update buildPrompt() to include all section data**

Replace the current `buildPrompt` function body with:

```typescript
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

  // Habits section
  const habitLines = sortedHabits.map(h => {
    const count = weekCounts[h.id] ?? 0
    return `- ${h.name}: ${count}/7 days`
  }).join('\n')

  // Goals section
  const goalLines = goalsWithMilestones.map(g =>
    `- ${g.title} (${g.areaName}): ${g.done}/${g.total} milestones done`
  ).join('\n')

  // Maintenance section
  const maintenanceLines = maintenanceAlerts.length > 0
    ? maintenanceAlerts.map(({ item, task, status }) =>
        `- ${item.name} — ${task.description} [${status}]`
      ).join('\n')
    : '(none)'

  // Subscriptions section
  const renewLines = renewingSoon.length > 0
    ? renewingSoon.map(s =>
        `- ${s.name}: €${s.cost.toFixed(2)}/${s.period} on ${new Date(s.renewalDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
      ).join('\n')
    : '(none)'

  return `Weekly review — ${fmt(weekStart)} to ${fmt(weekEnd)}

HABITS (this week):
${habitLines || '(no habits tracked)'}

GOALS:
${goalLines || '(no goals with milestones)'}

MAINTENANCE ALERTS:
${maintenanceLines}

SUBSCRIPTIONS RENEWING SOON:
${renewLines}

WISHLIST (${wishlistItems.length} added${wishlistItems.length ? `, €${wTotal.toFixed(2)} total` : ''}):
${wLines}

INVENTORY (${inventoryItems.length} added):
${iLines}

PORTFOLIO (${portfolioHoldings.length} added):
${pLines}
${delta}

MY NOTES:
${notes.trim() || '(none)'}

Please identify patterns in this week's activity across habits, goals, and finances. Flag anything I should follow up on, and suggest 2-3 priorities for next week.`
}
```

- [ ] **Step 2: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/
git commit -m "feat: weekly review AI prompt now includes habits, goals, maintenance, and subscription data"
```

---

### Task 12: Global Search

**Files:**
- Create: `src/app/api/search/route.ts`
- Create: `src/components/search/SearchPage.tsx`
- Create: `src/app/search/page.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create search API route**

`src/app/api/search/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], memories: [], documents: [], habits: [], bucketTrips: [], bucketExperiences: [], goals: [] })

  const [tasks, memories, documents, habits, bucketTrips, bucketExperiences, lifeAreas] = await Promise.all([
    prisma.task.findMany({
      where: {
        done: false,
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
          { category: { contains: q } },
        ],
      },
      select: { id: true, title: true, priority: true, dueDate: true, category: true },
      take: 10,
    }),
    prisma.memory.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
          { location: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      select: { id: true, title: true, date: true, category: true, location: true },
      take: 10,
    }),
    prisma.document.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { notes: { contains: q } },
          { category: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      select: { id: true, name: true, category: true, expiryDate: true },
      take: 10,
    }),
    prisma.habit.findMany({
      where: {
        archivedAt: null,
        name: { contains: q },
      },
      select: { id: true, name: true, color: true },
      take: 5,
    }),
    prisma.bucketTrip.findMany({
      where: {
        OR: [
          { destination: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      select: { id: true, destination: true, done: true, targetYear: true },
      take: 5,
    }),
    prisma.bucketExperience.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      select: { id: true, title: true, category: true, done: true },
      take: 5,
    }),
    prisma.lifeArea.findMany({
      include: {
        goals: {
          where: {
            OR: [
              { title: { contains: q } },
              { notes: { contains: q } },
            ],
          },
          select: { id: true, title: true, timePeriod: true },
        },
      },
    }),
  ])

  const goals = lifeAreas
    .flatMap(a => a.goals.map(g => ({ ...g, areaName: a.name })))
    .slice(0, 5)

  return NextResponse.json({
    tasks: tasks.map(t => ({ ...t, dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null })),
    memories,
    documents,
    habits,
    bucketTrips,
    bucketExperiences,
    goals,
  })
}
```

- [ ] **Step 2: Create SearchPage component**

`src/components/search/SearchPage.tsx`:
```typescript
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SearchResults {
  tasks: { id: number; title: string; priority: string; dueDate: string | null; category: string | null }[]
  memories: { id: number; title: string; date: string; category: string; location: string | null }[]
  documents: { id: number; name: string; category: string; expiryDate: string | null }[]
  habits: { id: number; name: string; color: string }[]
  bucketTrips: { id: number; destination: string; done: boolean; targetYear: number | null }[]
  bucketExperiences: { id: number; title: string; category: string; done: boolean }[]
  goals: { id: number; title: string; timePeriod: string; areaName: string }[]
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {title} ({count})
      </h3>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  )
}

function ResultRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{label}</span>
      {sub && <span className="text-xs text-gray-400 shrink-0 ml-2">{sub}</span>}
    </Link>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data, isLoading } = useSWR<SearchResults>(
    debouncedQuery.length >= 2 ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher
  )

  const totalResults = data
    ? data.tasks.length + data.memories.length + data.documents.length +
      data.habits.length + data.bucketTrips.length + data.bucketExperiences.length + data.goals.length
    : 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Search</h1>

      <div className="mb-6">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search across tasks, memories, documents, habits, bucket list, goals…"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-gray-400">Type at least 2 characters…</p>
      )}

      {isLoading && <p className="text-sm text-gray-400">Searching…</p>}

      {data && !isLoading && (
        <>
          {totalResults === 0 && (
            <p className="text-sm text-gray-400">No results for "{debouncedQuery}"</p>
          )}

          <Section title="Tasks" count={data.tasks.length}>
            {data.tasks.map(t => (
              <ResultRow key={t.id} href="/tasks" label={t.title} sub={t.dueDate ?? t.priority} />
            ))}
          </Section>

          <Section title="Goals" count={data.goals.length}>
            {data.goals.map(g => (
              <ResultRow key={g.id} href="/goals" label={g.title} sub={`${g.areaName} · ${g.timePeriod}`} />
            ))}
          </Section>

          <Section title="Memories" count={data.memories.length}>
            {data.memories.map(m => (
              <ResultRow key={m.id} href="/memories" label={m.title} sub={`${m.category} · ${m.date}`} />
            ))}
          </Section>

          <Section title="Documents" count={data.documents.length}>
            {data.documents.map(d => (
              <ResultRow key={d.id} href="/documents" label={d.name} sub={d.category} />
            ))}
          </Section>

          <Section title="Habits" count={data.habits.length}>
            {data.habits.map(h => (
              <ResultRow key={h.id} href="/habits" label={h.name} />
            ))}
          </Section>

          <Section title="Bucket List" count={data.bucketTrips.length + data.bucketExperiences.length}>
            {data.bucketTrips.map(t => (
              <ResultRow key={`trip-${t.id}`} href="/bucket-list" label={t.destination} sub={t.targetYear?.toString() ?? (t.done ? 'Done' : undefined)} />
            ))}
            {data.bucketExperiences.map(e => (
              <ResultRow key={`exp-${e.id}`} href="/bucket-list" label={e.title} sub={e.category} />
            ))}
          </Section>
        </>
      )}
    </div>
  )
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useCallback(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])()
  return debounced
}
```

Note: The `useDebounce` hook above is inline for simplicity but uses a pattern that won't work correctly due to React rules. Use this corrected version instead:

```typescript
import { useState, useEffect } from 'react'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
```

Place `useDebounce` as a module-level function above the component.

- [ ] **Step 3: Create the page route**

`src/app/search/page.tsx`:
```typescript
import SearchPage from '@/components/search/SearchPage'
export default function Page() { return <SearchPage /> }
```

- [ ] **Step 4: Add Search to Sidebar**

In `src/components/Sidebar.tsx`, add to NAV array (after Dashboard):
```typescript
{ href: '/search', label: 'Search', active: true },
```

- [ ] **Step 5: TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/
git commit -m "feat: global search page — search across tasks, memories, documents, habits, goals, bucket list"
```

---

### Final Verification

- [ ] **Run full TypeScript check**

```bash
cd /home/than/PersonalAssistant
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Start dev server and verify key flows**

```bash
npm run dev
```

Spot-check:
1. Habits page: Archive a habit → it disappears from active list → appears in Archived section → Restore works
2. Habits page: Click "Mark done" → note textarea appears → "Done" submits → note appears below the button and as heatmap tooltip
3. Tasks page: Create a task with recurring=weekly → mark it done → a new task appears in the list
4. Tasks page: Create task B blocked by task A → task B shows 🚫 in the list
5. Memories page: Add tags to a memory → tag chips appear → filter by tag works
6. Documents page: Tags visible in form and filter
7. Dashboard: Overdue tasks widget shows overdue tasks with red border
8. Finance page: Subscription renewing within 14 days shows amber "⚠" marker
9. Goals page: Goals with timePeriod like "2026" show a time-elapsed bar
10. Weekly Review: AI prompt includes habits and goals sections
11. Search page (`/search`): Searching "test" returns results across sections

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete personal assistant enhancements — all 11 features implemented"
```
