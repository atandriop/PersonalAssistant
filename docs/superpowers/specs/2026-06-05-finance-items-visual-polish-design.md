# Finance + Items Visual Polish — Design Spec

## Overview

Two targeted visual improvements continuing the color-accent pattern established in the sidebar, Today page, and Dashboard. No new features, no API changes, no new components.

---

## Part 1 — Finance Page

### 1A. Metric Cards (Overview section)

The three stat cards at the top of the Finance Overview (`FinancePage.tsx`) currently have plain gray uppercase labels. They get the same icon + colored label treatment as Dashboard widgets.

| Card | Icon | Color |
|------|------|-------|
| Net Worth | `TrendingUp` | Dynamic: `#10b981` (positive) / `#ef4444` (negative) — derives from `netWorth >= 0` |
| Monthly Subscriptions | `RefreshCw` | `#f97316` (orange) |
| Portfolio P&L | `Activity` | Dynamic: `#10b981` (positive) / `#ef4444` (negative) — derives from `portfolioPnl >= 0` |

Each card's `<p>` label changes to a `<div className="flex items-center gap-1.5">` containing the icon and a `<span style={{ color }}>` title. Icons render at 13×13px, `strokeWidth={2.5}`, color matches the label. The value text below keeps its existing green/red class — only the label treatment changes.

### 1B. Section Tabs

The four pill tabs (`Overview / Net Worth / Subscriptions / Costs`) gain a small icon before each label. Current implementation renders each tab as a plain text button inside a gray pill container.

| Tab | Icon |
|-----|------|
| Overview | `LayoutDashboard` |
| Net Worth | `PieChart` |
| Subscriptions | `RefreshCw` |
| Costs | `Receipt` |

Icons render at 13×13px inline before the label text with `gap-1.5`. No layout change — just icon prepended inside each button.

**File:** `src/components/finance/FinancePage.tsx`

---

## Part 2 — Items Page

### 2A. Wishlist Priority Left Borders

Each wishlist item card currently has no visual priority indicator beyond a small colored dot in the priority badge. Adding a 3px colored left border per item makes the priority scannable at a glance, consistent with the Today page card pattern.

| Priority | Border color |
|----------|-------------|
| High | `#ef4444` (red) |
| Medium | `#f59e0b` (amber) |
| Low | `#6b7280` (gray) |

The existing `PRIORITY_COLOR` map in `ItemsPage.tsx` handles text badges — a separate `PRIORITY_BORDER` map provides the hex values for inline `borderLeft` styles. Applied to the outer `div` of each wishlist item card.

### 2B. "Upgraded" Badge on Inventory Items

Inventory items with a non-null `upgradeTarget` field (a wishlist item they were purchased to replace) show a small `↑ Upgraded` pill badge. This is informational only — no interaction.

**Style:** `text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400` — consistent with existing badge styles in the file. Rendered inline after the item name.

**File:** `src/components/items/ItemsPage.tsx`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/finance/FinancePage.tsx` | Colored icon + label on 3 metric cards; icons in section tabs |
| `src/components/items/ItemsPage.tsx` | Priority left borders on wishlist items; Upgraded badge on inventory items |
