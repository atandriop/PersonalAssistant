# Finance + Items Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add color-accented icon labels to Finance metric cards and section tabs, and add priority left-borders + an Upgraded badge to Items page wishlist/inventory cards.

**Architecture:** Two independent file changes. `FinancePage.tsx` gets lucide icons on the tab strip and the three Overview metric cards. `ItemsPage.tsx` gets a `PRIORITY_BORDER` map used for inline left-border styles on wishlist cards, and an `↑ Upgraded` badge on inventory cards that have an `upgradeTarget`. No new components, no API changes.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, lucide-react (already installed)

---

## File Map

| File | Change |
|------|--------|
| `src/components/finance/FinancePage.tsx` | Add lucide imports; add icons to `SECTIONS` type + array; update tab render; update 3 metric card labels |
| `src/components/items/ItemsPage.tsx` | Add `PRIORITY_BORDER` map; add `borderLeft` inline style to wishlist item cards; add `↑ Upgraded` badge to inventory item cards |

---

## Task 1: Finance — Section Tab Icons

**Files:**
- Modify: `src/components/finance/FinancePage.tsx`

**What changes:** The `SECTIONS` array and its type gain an `icon: LucideIcon` field. The tab render adds `flex items-center gap-1.5` to the button and renders the icon before the label.

- [ ] **Step 1: Add lucide-react import to `FinancePage.tsx`**

Add after the existing `import { useState } from 'react'` line (line 2):

```tsx
import { LayoutDashboard, PieChart, RefreshCw, Receipt, TrendingUp, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
```

- [ ] **Step 2: Update the `SECTIONS` type and array**

Replace (lines 44–50):

```tsx
type FinanceSection = 'overview' | 'net-worth' | 'subscriptions' | 'costs'

const SECTIONS: { id: FinanceSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'net-worth', label: 'Net Worth' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'costs', label: 'Costs' },
]
```

With:

```tsx
type FinanceSection = 'overview' | 'net-worth' | 'subscriptions' | 'costs'

const SECTIONS: { id: FinanceSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'net-worth', label: 'Net Worth', icon: PieChart },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'costs', label: 'Costs', icon: Receipt },
]
```

- [ ] **Step 3: Update the tab render to show icon + label**

Find the tab render block (the `{SECTIONS.map(s => (` block starting around line 135) and replace the inner `<button>` content:

Replace:
```tsx
        <button
          key={s.id}
          onClick={() => setSection(s.id)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            section === s.id
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {s.label}
        </button>
```

With:

```tsx
        (() => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                section === s.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={13} strokeWidth={2.5} />
              {s.label}
            </button>
          )
        })()
```

Note: JSX requires component references to start with a capital letter. `s.icon` is lowercase so it must be assigned to a local `const Icon` before use — same pattern as `Sidebar.tsx`.

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/FinancePage.tsx
git commit -m "feat: icons in Finance section tabs"
```

---

## Task 2: Finance — Metric Card Color Labels

**Files:**
- Modify: `src/components/finance/FinancePage.tsx`

**What changes:** The three plain `<p>` labels in the Overview metric cards are replaced with icon + colored label divs. Colors are dynamic for Net Worth and P&L (green/red based on sign), fixed orange for Subscriptions.

- [ ] **Step 1: Update the Net Worth metric card label**

Find (lines 164–167):
```tsx
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Net Worth</p>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{fmt(netWorth)}</p>
        </div>
```

Replace with:
```tsx
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp size={13} strokeWidth={2.5} style={{ color: netWorth >= 0 ? '#10b981' : '#ef4444' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: netWorth >= 0 ? '#10b981' : '#ef4444' }}>Net Worth</span>
          </div>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{fmt(netWorth)}</p>
        </div>
```

- [ ] **Step 2: Update the Monthly Subscriptions metric card label**

Find (lines 168–171):
```tsx
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Monthly Subscriptions</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{fmtDecimal(monthlySubCost)}</p>
        </div>
```

Replace with:
```tsx
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <RefreshCw size={13} strokeWidth={2.5} color="#f97316" />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f97316' }}>Monthly Subscriptions</span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{fmtDecimal(monthlySubCost)}</p>
        </div>
```

- [ ] **Step 3: Update the Portfolio P&L metric card label**

Find (lines 172–177):
```tsx
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Portfolio P&amp;L</p>
          <p className={`text-xl font-semibold ${portfolioPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {portfolioPnl >= 0 ? '+' : ''}{fmtDecimal(portfolioPnl)}
          </p>
        </div>
```

Replace with:
```tsx
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Activity size={13} strokeWidth={2.5} style={{ color: portfolioPnl >= 0 ? '#10b981' : '#ef4444' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: portfolioPnl >= 0 ? '#10b981' : '#ef4444' }}>Portfolio P&amp;L</span>
          </div>
          <p className={`text-xl font-semibold ${portfolioPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {portfolioPnl >= 0 ? '+' : ''}{fmtDecimal(portfolioPnl)}
          </p>
        </div>
```

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/FinancePage.tsx
git commit -m "feat: colored icon labels on Finance Overview metric cards"
```

---

## Task 3: Items — Wishlist Priority Left Borders

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

**What changes:** A `PRIORITY_BORDER` map is added alongside the existing `PRIORITY_COLOR` map. Each wishlist item card's outer `div` gets a `borderLeft` inline style using that map.

- [ ] **Step 1: Add `PRIORITY_BORDER` map**

Find the existing maps near line 31:
```tsx
const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
```

Add one line after `PRIORITY_COLOR`:
```tsx
const PRIORITY_COLOR: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }
const PRIORITY_BORDER: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#6b7280' }
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
```

- [ ] **Step 2: Add the left border to each wishlist item card**

Find the wishlist item card div (line 276):
```tsx
                    <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5">
```

Replace with:
```tsx
                    <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5"
                      style={{ borderLeft: `3px solid ${PRIORITY_BORDER[item.priority] ?? '#6b7280'}` }}>
```

- [ ] **Step 3: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: priority left borders on wishlist items"
```

---

## Task 4: Items — Upgraded Badge on Inventory Cards

**Files:**
- Modify: `src/components/items/ItemsPage.tsx`

**What changes:** Inventory items with a non-null `upgradeTarget` show a green `↑ Upgraded` badge inline next to the item name. The existing `→ upgrade: [name]` text below is kept — the badge adds a quick visual scan indicator at the name level.

- [ ] **Step 1: Add the badge to inventory item name row**

Find the inventory item name flex div (lines 313–316):
```tsx
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                            {item.quantity > 1 && <Badge color="#6b7280">×{item.quantity}</Badge>}
                          </div>
```

Replace with:
```tsx
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                            {item.quantity > 1 && <Badge color="#6b7280">×{item.quantity}</Badge>}
                            {item.upgradeTarget && <Badge color="#10b981">↑ Upgraded</Badge>}
                          </div>
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/items/ItemsPage.tsx
git commit -m "feat: Upgraded badge on inventory items that came from wishlist"
```

---

## Verification

After all tasks are committed:

- [ ] Start dev server: `npm run dev`
- [ ] Open Finance (`/finance`): tab strip shows icons before each label; Overview metric cards have colored icon + label (Net Worth and P&L change color based on sign)
- [ ] Open Items (`/wishlist`): wishlist cards have left borders matching priority color; any inventory item purchased from wishlist shows a green `↑ Upgraded` badge
