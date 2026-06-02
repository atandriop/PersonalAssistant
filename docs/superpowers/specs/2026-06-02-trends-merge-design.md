# Trends Merge into Net Worth — Design Spec

## Overview

Move the Wishlist Total Over Time and Portfolio Value Over Time charts from the standalone Trends page into the Net Worth page, then remove the Trends page and its sidebar entry.

## Changes

### Net Worth page (`src/components/networth/NetWorthPage.tsx`)

Add two new chart sections below the existing "Net Worth Over Time" chart:

1. **Wishlist Total Over Time** — fetches from `/api/snapshots` (existing endpoint), renders a `LineChart` using `snapshot.wishlistTotal` values. Same SVG LineChart component already in the file, with color `#3b82f6`.
2. **Portfolio Value Over Time** — same snapshot data, renders using `snapshot.portfolioTotal` values, color `#10b981`.

The existing `Snapshot` session-based recording (in `TrendsPage`) moves here: on mount, POST to `/api/snapshots` once per session (using `sessionStorage.getItem('lastSnapshot')` key — same key the old TrendsPage used, so existing snapshot history is preserved).

### Remove Trends page

- Delete `src/app/trends/page.tsx`
- Delete `src/components/trends/TrendsPage.tsx`
- Remove `{ href: '/trends', label: 'Trends', active: true }` from sidebar NAV array

### Data

No new API routes. Uses existing `/api/snapshots` GET + POST.

## Out of Scope

- Merging the two snapshot tables (net worth vs wishlist/portfolio) into one
