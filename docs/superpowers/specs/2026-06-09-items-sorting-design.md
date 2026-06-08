# Items Page Sorting — Design

**Date:** 2026-06-09  
**Scope:** Add per-column sort controls to the Items page (wishlist and inventory)

## What we're building

Sort buttons in the column header row, independent for each column.

```
Wishlist  3 items   [Priority] [Name] [Cost]
Inventory 5 items   [Name] [Cost]
```

## State

| State | Type | Default |
|-------|------|---------|
| `sortWish` | `'priority' \| 'name' \| 'cost'` | `'priority'` |
| `sortInv` | `'name' \| 'cost'` | `'name'` |

## Sorting rules

Applied inside the per-category map when building `catWish` / `catInv`:

- `priority` → `PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]` (existing behaviour)
- `name` → `a.name.localeCompare(b.name)`
- `cost` → `a.cost - b.cost` (ascending)

## UI placement

In the column headers row (lines 281–290 of `ItemsPage.tsx`), after the item count, add small inline toggle buttons. Active sort gets a subtle background highlight (`bg-gray-100 dark:bg-gray-700 font-medium`).

## Scope

Single file change: `src/components/items/ItemsPage.tsx`

No API changes. No schema changes. No new files.
