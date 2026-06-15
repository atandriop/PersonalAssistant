# Search: People and Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend global search to cover the new People and Projects entities added in the June 15 feature batch.

**Architecture:** Two-file change. `src/app/api/search/route.ts` adds two Prisma queries to the existing Promise.all. `src/components/search/SearchPage.tsx` extends the TypeScript interface and adds two Section renders. No schema changes, no new files.

**Tech Stack:** Next.js API route (Prisma), React (SWR), Tailwind CSS

**Pre-existing TS error to filter:** `src/app/api/search/route.ts` has an Iterator flag error unrelated to our changes — filter with `grep -v "search/route\|WorldMap"` in all TS checks.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/app/api/search/route.ts` |
| Modify | `src/components/search/SearchPage.tsx` |

---

### Task 1: Extend search API with People and Projects queries

**Files:**
- Modify: `src/app/api/search/route.ts`

- [ ] **Step 1: Update the empty-result return to include new arrays**

Current (lines 14–19):
```typescript
  if (q.length < 2) {
    return NextResponse.json({
      tasks: [], memories: [], documents: [], habits: [],
      bucketTrips: [], bucketExperiences: [], goals: [],
      appointments: [], subscriptions: [], wishlistItems: [],
      inventoryItems: [], travelTrips: [], maintenanceItems: [],
    })
  }
```

Replace with:
```typescript
  if (q.length < 2) {
    return NextResponse.json({
      tasks: [], memories: [], documents: [], habits: [],
      bucketTrips: [], bucketExperiences: [], goals: [],
      appointments: [], subscriptions: [], wishlistItems: [],
      inventoryItems: [], travelTrips: [], maintenanceItems: [],
      people: [], projects: [],
    })
  }
```

- [ ] **Step 2: Add people and projects to the Promise.all destructure and queries**

Current destructure (lines 27–32):
```typescript
  const [
    tasks, memories, documents, habits,
    bucketTrips, bucketExperiences, lifeAreas,
    appointments, subscriptions, wishlistItems,
    inventoryItems, travelTrips, homeItems,
  ] = await Promise.all([
```

Replace with:
```typescript
  const [
    tasks, memories, documents, habits,
    bucketTrips, bucketExperiences, lifeAreas,
    appointments, subscriptions, wishlistItems,
    inventoryItems, travelTrips, homeItems,
    people, projects,
  ] = await Promise.all([
```

After the last existing query (`prisma.homeItem.findMany(...)` — ends around line 171), before the closing `])`, add:

```typescript
    prisma.person.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { notes: { contains: q } },
          { relationship: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, name: true, relationship: true, birthday: true },
      take: 10,
    }),
    prisma.project.findMany({
      where: {
        done: false,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, name: true, description: true, color: true },
      take: 10,
    }),
```

- [ ] **Step 3: Add people and projects to the result object**

Current result object (lines 178–198):
```typescript
  const result = {
    tasks,
    memories,
    documents,
    habits,
    bucketTrips,
    bucketExperiences,
    goals,
    appointments,
    subscriptions,
    wishlistItems,
    inventoryItems,
    travelTrips: travelTrips.map(t => ({
      id: t.id,
      countryName: t.country?.name ?? null,
      cities: t.cities,
      startDate: t.startDate,
      endDate: t.endDate,
    })),
    maintenanceItems: homeItems,
  }
```

Replace with:
```typescript
  const result = {
    tasks,
    memories,
    documents,
    habits,
    bucketTrips,
    bucketExperiences,
    goals,
    appointments,
    subscriptions,
    wishlistItems,
    inventoryItems,
    travelTrips: travelTrips.map(t => ({
      id: t.id,
      countryName: t.country?.name ?? null,
      cities: t.cities,
      startDate: t.startDate,
      endDate: t.endDate,
    })),
    maintenanceItems: homeItems,
    people,
    projects,
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "feat: add people and projects to global search API"
```

---

### Task 2: Extend SearchPage with People and Projects sections

**Files:**
- Modify: `src/components/search/SearchPage.tsx`

- [ ] **Step 1: Add people and projects to SearchResults interface**

Current interface (lines 9–23):
```typescript
interface SearchResults {
  tasks: { id: number; title: string; priority: string; dueDate: string | null; category: string | null }[]
  memories: { id: number; title: string; date: string; category: string; location: string | null }[]
  documents: { id: number; name: string; category: string; expiryDate: string | null }[]
  habits: { id: number; name: string; color: string }[]
  bucketTrips: { id: number; destination: string; done: boolean; targetYear: number | null }[]
  bucketExperiences: { id: number; title: string; category: string; done: boolean }[]
  goals: { id: number; title: string; timePeriod: string; areaName: string }[]
  appointments: { id: number; title: string; date: string; category: string; location: string | null }[]
  subscriptions: { id: number; name: string; cost: number; period: string; active: boolean }[]
  wishlistItems: { id: number; name: string; cost: number; priority: string; purchased: boolean }[]
  inventoryItems: { id: number; name: string; cost: number }[]
  travelTrips: { id: number; countryName: string; cities: string | null; startDate: string | null }[]
  maintenanceItems: { id: number; name: string }[]
}
```

Replace with:
```typescript
interface SearchResults {
  tasks: { id: number; title: string; priority: string; dueDate: string | null; category: string | null }[]
  memories: { id: number; title: string; date: string; category: string; location: string | null }[]
  documents: { id: number; name: string; category: string; expiryDate: string | null }[]
  habits: { id: number; name: string; color: string }[]
  bucketTrips: { id: number; destination: string; done: boolean; targetYear: number | null }[]
  bucketExperiences: { id: number; title: string; category: string; done: boolean }[]
  goals: { id: number; title: string; timePeriod: string; areaName: string }[]
  appointments: { id: number; title: string; date: string; category: string; location: string | null }[]
  subscriptions: { id: number; name: string; cost: number; period: string; active: boolean }[]
  wishlistItems: { id: number; name: string; cost: number; priority: string; purchased: boolean }[]
  inventoryItems: { id: number; name: string; cost: number }[]
  travelTrips: { id: number; countryName: string; cities: string | null; startDate: string | null }[]
  maintenanceItems: { id: number; name: string }[]
  people: { id: number; name: string; relationship: string | null; birthday: string | null }[]
  projects: { id: number; name: string; description: string | null; color: string }[]
}
```

- [ ] **Step 2: Update totalResults to include people and projects**

Current (lines 67–72):
```typescript
  const totalResults = data
    ? data.tasks.length + data.memories.length + data.documents.length +
      data.habits.length + data.bucketTrips.length + data.bucketExperiences.length +
      data.goals.length + data.appointments.length + data.subscriptions.length +
      data.wishlistItems.length + data.inventoryItems.length +
      data.travelTrips.length + data.maintenanceItems.length
    : 0
```

Replace with:
```typescript
  const totalResults = data
    ? data.tasks.length + data.memories.length + data.documents.length +
      data.habits.length + data.bucketTrips.length + data.bucketExperiences.length +
      data.goals.length + data.appointments.length + data.subscriptions.length +
      data.wishlistItems.length + data.inventoryItems.length +
      data.travelTrips.length + data.maintenanceItems.length +
      data.people.length + data.projects.length
    : 0
```

- [ ] **Step 3: Add People and Projects Section renders**

After the existing `<Section title="Tasks" ...>` block (around line 101), add the People and Projects sections. Insert them near the top of the results list, after Tasks:

```tsx
          <Section title="People" count={data.people.length}>
            {data.people.map(p => (
              <ResultRow key={p.id} href="/people" label={p.name} sub={p.relationship ?? undefined} />
            ))}
          </Section>

          <Section title="Projects" count={data.projects.length}>
            {data.projects.map(p => (
              <ResultRow key={p.id} href="/projects" label={p.name} sub={p.description ?? undefined} />
            ))}
          </Section>
```

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | grep -v "search/route\|WorldMap"
```

Expected: no errors from our changes (pre-existing search/route error is filtered out).

- [ ] **Step 5: Commit**

```bash
git add src/components/search/SearchPage.tsx
git commit -m "feat: add People and Projects sections to global search UI"
```
