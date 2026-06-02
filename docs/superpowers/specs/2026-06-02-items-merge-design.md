# Items Page (Wishlist + Inventory Merge) — Design Spec

## Overview

Add a shared tab bar to both WishlistPage and InventoryPage so users can switch between them without going back to the sidebar. Remove the separate "Inventory" sidebar entry and rename "Wishlist" to "Items".

## Changes

### Tab bar component

Add a small inline `ItemsTabs` component used by both pages:

```tsx
// renders inside both WishlistPage and InventoryPage, above their <h1>
function ItemsTabs({ active }: { active: 'wishlist' | 'inventory' }) { ... }
```

Renders two pill tabs: **Wishlist** (`/wishlist`) and **Inventory** (`/inventory`). Active tab is highlighted. Uses Next.js `<Link>`.

### WishlistPage (`src/components/wishlist/WishlistPage.tsx`)

- Add `<ItemsTabs active="wishlist" />` at the very top, before the existing page header row.

### InventoryPage (`src/components/inventory/InventoryPage.tsx`)

- Add `<ItemsTabs active="inventory" />` at the very top, before the existing page header row.

### Sidebar (`src/components/Sidebar.tsx`)

- Change `{ href: '/wishlist', label: 'Wishlist' }` → `{ href: '/wishlist', label: 'Items' }`
- Remove `{ href: '/inventory', label: 'Inventory' }`

Both `/wishlist` and `/inventory` routes continue to exist and work — the tab bar just provides in-page navigation between them.

## Out of Scope

- Merging the two pages into a single component
- Shared state between tabs
- URL query param for active tab (the distinct routes are sufficient)
