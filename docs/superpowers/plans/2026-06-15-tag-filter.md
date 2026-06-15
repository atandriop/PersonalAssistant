# Tag Filter on Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tag filter dropdown to the Tasks tab that lets users filter tasks by a single tag, collecting available tags client-side from loaded tasks.

**Architecture:** Pure frontend change to `TasksTab.tsx`. No API changes. Tags already loaded on tasks array (parsed from DB string to `string[]` in serializeTask). Collect unique tags client-side with `Array.from(new Set(tasks.flatMap(t => t.tags)))`. Filter applied to `active` array alongside existing `projectFilter`.

**Tech Stack:** React, SWR (tasks already fetched), Tailwind CSS

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/components/tasks/TasksTab.tsx` |

No pure logic functions to test. All changes are UI/state wiring.

---

### Task 1: Add tag filter state and dropdown to TasksTab

**Files:**
- Modify: `src/components/tasks/TasksTab.tsx`

- [ ] **Step 1: Add tagFilter state**

In `TasksTab` (around line 362, after the `projectFilter` state):

```typescript
const [tagFilter, setTagFilter] = useState<string>('')
```

- [ ] **Step 2: Compute available tags from loaded tasks**

After the `const in7 = ...` line (around line 366), add:

```typescript
const allTags = Array.from(new Set(tasks.flatMap(t => t.tags))).sort()
```

- [ ] **Step 3: Add tag filter to the active tasks filter chain**

Current (around line 368):
```typescript
const active = tasks
  .filter(t => !t.done)
  .filter(t => projectFilter === '' || t.projectId === Number(projectFilter))
```

Replace with:
```typescript
const active = tasks
  .filter(t => !t.done)
  .filter(t => projectFilter === '' || t.projectId === Number(projectFilter))
  .filter(t => tagFilter === '' || t.tags.includes(tagFilter))
```

- [ ] **Step 4: Add tag filter select to the filter bar UI**

Current filter bar (around line 455, inside the non-selectMode branch):
```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => setSelectMode(true)}
    className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
  >
    Select
  </button>
  <select
    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
    value={projectFilter}
    onChange={e => setProjectFilter(e.target.value === '' ? '' : Number(e.target.value))}
  >
    <option value="">All projects</option>
    {projects.filter(p => !p.done).map(p => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => setSelectMode(true)}
    className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
  >
    Select
  </button>
  <select
    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
    value={projectFilter}
    onChange={e => setProjectFilter(e.target.value === '' ? '' : Number(e.target.value))}
  >
    <option value="">All projects</option>
    {projects.filter(p => !p.done).map(p => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
  {allTags.length > 0 && (
    <select
      className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      value={tagFilter}
      onChange={e => setTagFilter(e.target.value)}
    >
      <option value="">All tags</option>
      {allTags.map(tag => (
        <option key={tag} value={tag}>{tag}</option>
      ))}
    </select>
  )}
</div>
```

- [ ] **Step 5: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | grep -v "search/route\|WorldMap"
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/TasksTab.tsx
git commit -m "feat: add tag filter dropdown to tasks tab"
```
