# Items Page (Wishlist + Inventory Merge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared tab bar to WishlistPage and InventoryPage so they feel like one "Items" section, and consolidate the two sidebar entries into one.

**Architecture:** Create a tiny shared `ItemsTabs` component; mount it at the top of both existing pages. Update the sidebar. No structural page changes beyond this addition.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS, TypeScript

---

## File Map

| Task | Files |
|------|-------|
| 1. ItemsTabs component | Create `src/components/items/ItemsTabs.tsx` |
| 2. Add tabs to WishlistPage | Modify `src/components/wishlist/WishlistPage.tsx` |
| 3. Add tabs to InventoryPage | Modify `src/components/inventory/InventoryPage.tsx` |
| 4. Update sidebar | Modify `src/components/Sidebar.tsx` |

---

## Task 1: Create ItemsTabs component

**Files:** Create `src/components/items/ItemsTabs.tsx`

- [ ] **Step 1.1: Create the component**

```tsx
'use client'

import Link from 'next/link'

export default function ItemsTabs({ active }: { active: 'wishlist' | 'inventory' }) {
  function tab(href: string, label: string, isActive: boolean) {
    return (
      <Link
        key={href}
        href={href}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          isActive
            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        {label}
      </Link>
    )
  }
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
      {tab('/wishlist', 'Wishlist', active === 'wishlist')}
      {tab('/inventory', 'Inventory', active === 'inventory')}
    </div>
  )
}
```

- [ ] **Step 1.2: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 1.3: Commit**

```bash
git add src/components/items/ItemsTabs.tsx
git commit -m "feat: add ItemsTabs shared component for wishlist/inventory navigation"
```

---

## Task 2: Add tab bar to WishlistPage

**Files:** Modify `src/components/wishlist/WishlistPage.tsx`

- [ ] **Step 2.1: Import ItemsTabs**

After `import CategoryManager from '@/components/categories/CategoryManager'`, add:

```typescript
import ItemsTabs from '@/components/items/ItemsTabs'
```

- [ ] **Step 2.2: Mount the tab bar**

Find the opening of the JSX return in `WishlistPage` — the outer `<div>` wrapper. The first child is currently the header row:

```tsx
return (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wishlist</h1>
```

Add `<ItemsTabs active="wishlist" />` as the first child inside the outer `<div>`:

```tsx
return (
  <div>
    <ItemsTabs active="wishlist" />
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wishlist</h1>
```

- [ ] **Step 2.3: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 2.4: Commit**

```bash
git add src/components/wishlist/WishlistPage.tsx
git commit -m "feat: add Items tab bar to WishlistPage"
```

---

## Task 3: Add tab bar to InventoryPage

**Files:** Modify `src/components/inventory/InventoryPage.tsx`

- [ ] **Step 3.1: Import ItemsTabs**

After existing imports at the top of `src/components/inventory/InventoryPage.tsx`, add:

```typescript
import ItemsTabs from '@/components/items/ItemsTabs'
```

- [ ] **Step 3.2: Mount the tab bar**

Find the JSX return in `InventoryPage`. Add `<ItemsTabs active="inventory" />` as the first child inside the outer `<div>`:

```tsx
return (
  <div>
    <ItemsTabs active="inventory" />
    {/* rest of existing content unchanged */}
```

- [ ] **Step 3.3: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3.4: Commit**

```bash
git add src/components/inventory/InventoryPage.tsx
git commit -m "feat: add Items tab bar to InventoryPage"
```

---

## Task 4: Update sidebar

**Files:** Modify `src/components/Sidebar.tsx`

- [ ] **Step 4.1: Rename Wishlist → Items, remove Inventory**

In the `NAV` array:

Find:
```typescript
{ href: '/wishlist', label: 'Wishlist', active: true },
{ href: '/inventory', label: 'Inventory', active: true },
```

Replace with:
```typescript
{ href: '/wishlist', label: 'Items', active: true },
```

- [ ] **Step 4.2: Verify TypeScript and lint**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit && npx next lint 2>&1 | tail -3
```

Expected: no output / `✔ No ESLint warnings or errors`

- [ ] **Step 4.3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: consolidate Wishlist/Inventory into single Items sidebar entry"
```
