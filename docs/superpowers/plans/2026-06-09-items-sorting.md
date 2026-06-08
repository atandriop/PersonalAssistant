# Items Page Sorting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-column sort buttons (Priority/Name/Cost for wishlist, Name/Cost for inventory) that reorder items within each category section.

**Architecture:** All changes in one file. Two new `useState` variables control sort order; sorting is applied inline inside the `visibleCategories.map` callback. No API, schema, or new-file changes.

**Tech Stack:** React (useState), Next.js, TypeScript

---

### Task 1: Add sort state and sorting logic

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

- [ ] **Step 1: Add two sort state variables** after the existing `useState` block (around line 57, after `const [showUpdateValues, setShowUpdateValues] = useState(false)`):

```typescript
const [sortWish, setSortWish] = useState<'priority' | 'name' | 'cost'>('priority')
const [sortInv, setSortInv] = useState<'name' | 'cost'>('name')
```

- [ ] **Step 2: Replace the `catWish` sort** inside the `visibleCategories.map` callback. Find:

```typescript
const catWish = filteredWish
  .filter(i => i.categoryId === cat.id)
  .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
```

Replace with:

```typescript
const catWish = filteredWish
  .filter(i => i.categoryId === cat.id)
  .sort((a, b) => {
    if (sortWish === 'name') return a.name.localeCompare(b.name)
    if (sortWish === 'cost') return a.cost - b.cost
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })
```

- [ ] **Step 3: Add sorting to `catInv`**. Find:

```typescript
const catInv = filteredInv.filter(i => i.categoryId === cat.id)
```

Replace with:

```typescript
const catInv = filteredInv
  .filter(i => i.categoryId === cat.id)
  .sort((a, b) => sortInv === 'cost' ? a.cost - b.cost : a.name.localeCompare(b.name))
```

- [ ] **Step 4: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: add sort state and logic to items page"
```

---

### Task 2: Add sort button UI to column headers

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

- [ ] **Step 1: Replace the column headers block**. Find this section (around line 281):

```tsx
{/* Column headers */}
<div className="grid grid-cols-2 gap-4 mb-2">
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wishlist</span>
    <span className="text-xs text-gray-400">{filteredWish.length} items</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Inventory</span>
    <span className="text-xs text-gray-400">{filteredInv.length} items</span>
  </div>
</div>
```

Replace with:

```tsx
{/* Column headers */}
<div className="grid grid-cols-2 gap-4 mb-2">
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wishlist</span>
    <span className="text-xs text-gray-400">{filteredWish.length} items</span>
    <div className="flex gap-1 ml-1">
      {(['priority', 'name', 'cost'] as const).map(s => (
        <button key={s} onClick={() => setSortWish(s)}
          className={`text-xs px-1.5 py-0.5 rounded ${sortWish === s ? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}
    </div>
  </div>
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Inventory</span>
    <span className="text-xs text-gray-400">{filteredInv.length} items</span>
    <div className="flex gap-1 ml-1">
      {(['name', 'cost'] as const).map(s => (
        <button key={s} onClick={() => setSortInv(s)}
          className={`text-xs px-1.5 py-0.5 rounded ${sortInv === s ? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: add sort buttons to wishlist and inventory column headers"
```
