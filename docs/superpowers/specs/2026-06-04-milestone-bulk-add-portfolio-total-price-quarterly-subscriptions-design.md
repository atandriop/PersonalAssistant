# Design: Bulk Milestones, Portfolio Total Buy Price, Quarterly Subscriptions

**Date:** 2026-06-04

## Overview

Three independent UI improvements to the personal assistant app:

1. **Bulk-add milestones** — replace single-at-a-time milestone entry with a textarea that accepts multiple milestones at once.
2. **Portfolio total buy price** — replace the per-unit buy price field with a total buy price field; fix a broken reference in HoldingForm left from a prior edit.
3. **Quarterly subscriptions** — add quarterly as a billing period option alongside monthly and yearly.

No schema migrations, no new API endpoints.

---

## 1. Bulk-add Milestones

**File:** `src/components/goals/AreaDetail.tsx`

### Current behaviour
Clicking "+ Add milestone" shows a single-line inline form: one title input + one optional date input. User must submit and re-open for each milestone.

### New behaviour
The inline form is replaced with a textarea-based bulk form:

- Textarea (autofocus, ~4 rows), placeholder:
  ```
  One milestone per line
  90kg
  85kg | 2026-09-01
  ```
- Each non-empty line is parsed: if it contains ` | `, the left part is the title and the right part is the target date (`YYYY-MM-DD`); otherwise the whole line is the title with no date.
- On submit, all lines are posted in parallel via `POST /api/goals/:id/milestones`.
- "Cancel" closes without saving.

### State changes
- Remove: `newMilestone`, `setNewMilestone`, `newMilestoneDate`, `setNewMilestoneDate`
- Add: `bulkText`, `setBulkText` (single string)
- Keep: `addingMilestone`, `setAddingMilestone` (controls visibility)

### API
No changes. Each line maps to one `POST /api/goals/:id/milestones` call with `{ title, targetDate }`.

---

## 2. Portfolio Total Buy Price

**Files:** `src/components/portfolio/HoldingForm.tsx`, `src/components/portfolio/PortfolioPage.tsx`

### Problem
`HoldingForm.tsx` was partially edited: the `buyPrice`/`setBuyPrice` state was deleted but the JSX input still references those variables, causing a runtime/TypeScript error. The user also wants per-unit price replaced by total cost basis.

### HoldingForm changes
- Add state: `const [totalBuyPrice, setTotalBuyPrice] = useState(initial?.buyPrice?.toString() ?? '')`
- Replace the broken JSX input (was "Buy price per unit") with:
  ```tsx
  <input type="number" min="0" step="0.01" value={totalBuyPrice}
    onChange={e => setTotalBuyPrice(e.target.value)}
    placeholder="Total buy price (optional)" className={field} />
  ```
- Field is optional (no `required`).
- Submit body: `buyPrice: totalBuyPrice ? Number(totalBuyPrice) : null`

### PortfolioPage changes

**`holdingPnl` function:**
```ts
// Before: (currentPrice - buyPrice) * quantity
// After:
return (h.currentPrice ?? 0) * (h.quantity ?? 0) - (h.buyPrice ?? 0)
```

**`pnlDisplay` function:**
```ts
// Before: (currentPrice - buyPrice) * quantity
// After:
const pnl = h.currentPrice * h.quantity - h.buyPrice
```
Guard: only show P&L when `quantity != null && currentPrice != null && buyPrice != null`.

**`totalCost` (summary strip):**
```ts
// Before: (h.buyPrice ?? 0) * (h.quantity ?? 0)
// After: h.buyPrice ?? 0   (buyPrice is now the total, not per-unit)
```

**Display line (holding card):**
```tsx
// Before: qty: {h.quantity} · buy: €{h.buyPrice?.toFixed(2)}
// After:  qty: {h.quantity} · cost: €{h.buyPrice?.toFixed(2)}
```

### Schema / API
No changes. The `buyPrice` column continues to store a nullable float; its interpretation changes from "price per unit" to "total cost basis".

---

## 3. Quarterly Subscriptions

**File:** `src/components/subscriptions/SubscriptionsPage.tsx`

### Changes

**`monthlyEquiv` helper:**
```ts
function monthlyEquiv(cost: number, period: string): number {
  if (period === 'yearly') return cost / 12
  if (period === 'quarterly') return cost / 3
  return cost  // monthly
}
```

**`annualTotal` reducer (in `SubscriptionsPage`):**
```ts
// Before: s.period === 'yearly' ? s.cost : s.cost * 12
// After:
s.period === 'yearly' ? s.cost
  : s.period === 'quarterly' ? s.cost * 4
  : s.cost * 12
```

**`SubscriptionForm` dropdown:**
```tsx
<option value="monthly">Monthly</option>
<option value="quarterly">Quarterly</option>
<option value="yearly">Yearly</option>
```

**Card cost display:**
```ts
// Before: period === 'monthly' ? 'mo' : 'yr'
// After:
period === 'monthly' ? 'mo' : period === 'quarterly' ? 'qtr' : 'yr'
```

**Card monthly-equivalent line** (currently shown only for yearly):
Show the monthly equivalent for quarterly too — same conditional already calls `monthlyEquiv`, just extend the condition:
```tsx
{(s.period === 'yearly' || s.period === 'quarterly') && <p ...>€{mo.toFixed(2)}/mo</p>}
```

**BulkEditor column definition:**
```ts
{ key: 'period', label: 'Period', type: 'select', options: [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
]},
```

**`buildPrompt`:** No change needed — it already calls `monthlyEquiv` which will handle quarterly correctly.

### Schema / API
No changes. `period` is stored as a plain string in the DB.

---

## Out of scope
- Milestone editing (title/date) after creation — existing behaviour unchanged.
- Portfolio buy price history or cost-averaging — out of scope.
- Subscription period validation on the API side — existing API accepts any string; no change.
