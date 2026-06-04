# Bulk Milestones, Portfolio Total Buy Price, Quarterly Subscriptions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three independent UI improvements: bulk-add milestones via textarea, replace per-unit buy price with total buy price in portfolio, and add quarterly as a subscription billing period.

**Architecture:** All changes are confined to three React component files. No schema migrations, no new API endpoints. Each task is self-contained and commits independently.

**Tech Stack:** Next.js 14, React, TypeScript (strict), Prisma, SWR. No unit test framework — verification uses `npx tsc --noEmit` (strict mode catches type errors) plus manual browser check.

**Spec:** `docs/superpowers/specs/2026-06-04-milestone-bulk-add-portfolio-total-price-quarterly-subscriptions-design.md`

---

## Files touched

| File | Change |
|------|--------|
| `src/components/goals/AreaDetail.tsx` | Replace single-add milestone form with textarea bulk-add |
| `src/components/portfolio/HoldingForm.tsx` | Fix broken buyPrice reference; add totalBuyPrice input |
| `src/components/portfolio/PortfolioPage.tsx` | Update P&L formula and display for total buy price |
| `src/components/subscriptions/SubscriptionsPage.tsx` | Add quarterly period everywhere it's needed |

---

## Task 1: Bulk-add milestones

**Files:**
- Modify: `src/components/goals/AreaDetail.tsx`

### Context
`GoalRow` (line ~130) has inline state `newMilestone`, `newMilestoneDate`, `addingMilestone` and a single-line form for adding one milestone at a time. We're replacing the two-field form with a textarea that accepts one milestone per line, optionally with a target date after ` | `.

- [ ] **Step 1: Replace the two single-add state declarations with one `bulkText` state**

In `GoalRow` (around line 134–136), remove:
```tsx
const [newMilestone, setNewMilestone] = useState('')
const [newMilestoneDate, setNewMilestoneDate] = useState('')
```
Add in their place:
```tsx
const [bulkText, setBulkText] = useState('')
```
Keep `addingMilestone` / `setAddingMilestone` unchanged.

- [ ] **Step 2: Replace the `addMilestone` function with a bulk version**

Remove the existing `addMilestone` function (lines ~158–163) and replace with:
```tsx
async function addMilestones(e: React.FormEvent) {
  e.preventDefault()
  const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return
  await Promise.all(lines.map(line => {
    const parts = line.split(' | ')
    const title = parts[0].trim()
    const targetDate = parts[1]?.trim() || null
    return fetch(`/api/goals/${goal.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, targetDate }),
    })
  }))
  setBulkText('')
  setAddingMilestone(false)
  onMutate()
}
```

- [ ] **Step 3: Replace the inline add form JSX with the textarea form**

Find the `{addingMilestone ? (` block (around line 228) and replace the entire ternary branch (the form part) with:
```tsx
{addingMilestone ? (
  <form onSubmit={addMilestones} className="flex flex-col gap-1.5 mt-2">
    <textarea
      autoFocus
      value={bulkText}
      onChange={e => setBulkText(e.target.value)}
      placeholder={"One milestone per line\n90kg\n85kg | 2026-09-01"}
      rows={4}
      className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none w-full"
    />
    <div className="flex gap-1">
      <button type="submit" className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
      <button type="button" onClick={() => { setAddingMilestone(false); setBulkText('') }} className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300">Cancel</button>
    </div>
  </form>
) : (
  <button onClick={() => setAddingMilestone(true)} className="mt-2 text-xs text-blue-500 hover:text-blue-600">+ Add milestone</button>
)}
```

- [ ] **Step 4: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```
Expected: no errors. If errors mention `newMilestone` or `newMilestoneDate`, you missed a reference — search for them and remove.

- [ ] **Step 5: Manual verification**

Start dev server (`npm run dev`), open Goals page, expand an area, expand a goal. Click "+ Add milestone". Verify a textarea appears. Type two lines (one plain, one with ` | 2026-12-31`). Submit. Verify both milestones appear in the list with correct titles and that the second one shows a date badge.

- [ ] **Step 6: Commit**

```bash
git add src/components/goals/AreaDetail.tsx
git commit -m "feat: bulk-add milestones via textarea with optional date"
```

---

## Task 2: Portfolio — replace buy price per unit with total buy price

**Files:**
- Modify: `src/components/portfolio/HoldingForm.tsx`
- Modify: `src/components/portfolio/PortfolioPage.tsx`

### Context
`HoldingForm` was partially edited: `buyPrice`/`setBuyPrice` state variables were removed but the JSX input still references them (TypeScript error). We fix this by introducing `totalBuyPrice` state. `PortfolioPage` uses `buyPrice` in P&L and display — those formulas and labels change to match the new "total cost" semantics.

### HoldingForm changes

- [ ] **Step 1: Add `totalBuyPrice` state**

In `HoldingForm` (around line 20–24), add after the `currentPrice` state line:
```tsx
const [totalBuyPrice, setTotalBuyPrice] = useState(initial?.buyPrice?.toString() ?? '')
```

- [ ] **Step 2: Fix the submit body**

In the `submit` function body, `buyPrice` is already hardcoded to `null` (line 33). Change it to:
```tsx
buyPrice: totalBuyPrice ? Number(totalBuyPrice) : null,
```

- [ ] **Step 3: Replace the broken JSX input**

Find the non-savings branch inside the form (around line 63–68). It currently contains a broken input referencing undefined `buyPrice`/`setBuyPrice`. Replace that input with:
```tsx
<input
  type="number" min="0" step="0.01"
  value={totalBuyPrice}
  onChange={e => setTotalBuyPrice(e.target.value)}
  placeholder="Total buy price (optional)"
  className={field}
/>
```
The full non-savings block should now be:
```tsx
<>
  <input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={field} />
  <input type="number" min="0" step="0.01" value={totalBuyPrice} onChange={e => setTotalBuyPrice(e.target.value)} placeholder="Total buy price (optional)" className={field} />
  <input required type="number" min="0" step="0.01" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="Current price per unit" className={field} />
</>
```

- [ ] **Step 4: Type-check HoldingForm**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```
Expected: no errors mentioning `buyPrice` or `setBuyPrice`.

### PortfolioPage changes

- [ ] **Step 5: Update `holdingPnl`**

Replace the function body (around line 27–29):
```tsx
function holdingPnl(h: Holding): number {
  if (h.type === 'savings') return 0
  return (h.currentPrice ?? 0) * (h.quantity ?? 0) - (h.buyPrice ?? 0)
}
```

- [ ] **Step 6: Update `pnlDisplay`**

Replace the function body (around line 31–39):
```tsx
function pnlDisplay(h: Holding): { text: string; cls: string } {
  if (h.quantity == null || h.currentPrice == null || h.buyPrice == null) {
    return { text: '—', cls: 'text-gray-400' }
  }
  const pnl = h.currentPrice * h.quantity - h.buyPrice
  if (pnl === 0) return { text: '€0', cls: 'text-gray-400' }
  if (pnl > 0) return { text: `+€${pnl.toFixed(2)}`, cls: 'text-green-600 dark:text-green-400' }
  return { text: `−€${Math.abs(pnl).toFixed(2)}`, cls: 'text-red-500' }
}
```

- [ ] **Step 7: Update `totalCost`**

Find (around line 58):
```tsx
const totalCost = nonSavings.reduce((s, h) => s + (h.buyPrice ?? 0) * (h.quantity ?? 0), 0)
```
Replace with:
```tsx
const totalCost = nonSavings.reduce((s, h) => s + (h.buyPrice ?? 0), 0)
```

- [ ] **Step 8: Update the holding card display label**

Find (around line 167):
```tsx
<p className="text-xs text-gray-400 mt-0.5">qty: {h.quantity} · buy: €{h.buyPrice?.toFixed(2)}</p>
```
Replace with:
```tsx
<p className="text-xs text-gray-400 mt-0.5">qty: {h.quantity} · cost: €{h.buyPrice?.toFixed(2)}</p>
```

- [ ] **Step 9: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 10: Manual verification**

Open Portfolio page. Add a new stock (e.g. name "AAPL", qty 10, total buy price 1500, current price 170). Verify:
- Form accepts all three fields without error.
- Holding card shows "qty: 10 · cost: €1500.00".
- Value shows €1700.00 (10 × 170).
- P&L shows +€200.00 (1700 − 1500).
- Edit the holding — "Total buy price" field pre-fills with 1500.

- [ ] **Step 11: Commit**

```bash
git add src/components/portfolio/HoldingForm.tsx src/components/portfolio/PortfolioPage.tsx
git commit -m "feat: replace per-unit buy price with total buy price in portfolio"
```

---

## Task 3: Quarterly subscriptions

**Files:**
- Modify: `src/components/subscriptions/SubscriptionsPage.tsx`

### Context
`period` is a plain string stored in the DB. Add `'quarterly'` support in the helper functions, form dropdown, card display, monthly-equivalent line, and BulkEditor column definition.

- [ ] **Step 1: Update `monthlyEquiv`**

Find (around line 27–29):
```tsx
function monthlyEquiv(cost: number, period: string): number {
  return period === 'yearly' ? cost / 12 : cost
}
```
Replace with:
```tsx
function monthlyEquiv(cost: number, period: string): number {
  if (period === 'yearly') return cost / 12
  if (period === 'quarterly') return cost / 3
  return cost
}
```

- [ ] **Step 2: Update the `annualTotal` calculation**

Find (around line 100):
```tsx
const annualTotal = active.reduce((sum, s) => sum + (s.period === 'yearly' ? s.cost : s.cost * 12), 0)
```
Replace with:
```tsx
const annualTotal = active.reduce((sum, s) => sum + (
  s.period === 'yearly' ? s.cost : s.period === 'quarterly' ? s.cost * 4 : s.cost * 12
), 0)
```

- [ ] **Step 3: Add quarterly option to the `SubscriptionForm` dropdown**

Find (around line 64–67):
```tsx
<select value={period} onChange={e => setPeriod(e.target.value)} className={field}>
  <option value="monthly">Monthly</option>
  <option value="yearly">Yearly</option>
</select>
```
Replace with:
```tsx
<select value={period} onChange={e => setPeriod(e.target.value)} className={field}>
  <option value="monthly">Monthly</option>
  <option value="quarterly">Quarterly</option>
  <option value="yearly">Yearly</option>
</select>
```

- [ ] **Step 4: Update the card cost display suffix**

Find (around line 216):
```tsx
<p className="font-semibold text-sm text-gray-900 dark:text-white">€{s.cost.toFixed(2)}/{s.period === 'monthly' ? 'mo' : 'yr'}</p>
```
Replace with:
```tsx
<p className="font-semibold text-sm text-gray-900 dark:text-white">€{s.cost.toFixed(2)}/{s.period === 'monthly' ? 'mo' : s.period === 'quarterly' ? 'qtr' : 'yr'}</p>
```

- [ ] **Step 5: Show monthly-equivalent line for quarterly too**

Find (around line 217):
```tsx
{s.period === 'yearly' && <p className="text-xs text-gray-400">€{mo.toFixed(2)}/mo</p>}
```
Replace with:
```tsx
{(s.period === 'yearly' || s.period === 'quarterly') && <p className="text-xs text-gray-400">€{mo.toFixed(2)}/mo</p>}
```

- [ ] **Step 6: Add quarterly to the BulkEditor column options**

Find the `SUBSCRIPTION_COLUMNS` definition (around line 118–130). Find the `period` column entry:
```tsx
{ key: 'period', label: 'Period', type: 'select', options: [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]},
```
Replace with:
```tsx
{ key: 'period', label: 'Period', type: 'select', options: [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
]},
```

- [ ] **Step 7: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Manual verification**

Open Subscriptions page. Add a new subscription with "Quarterly" period (e.g. name "Adobe CC", cost 60, quarterly). Verify:
- Card shows "€60.00/qtr".
- Card shows "€20.00/mo" below it.
- Monthly total in the header increases by €20.00.
- Annual total increases by €240.00 (60 × 4).
- Open Edit All (BulkEditor) — the period column dropdown includes "Quarterly".

- [ ] **Step 9: Commit**

```bash
git add src/components/subscriptions/SubscriptionsPage.tsx
git commit -m "feat: add quarterly billing period to subscriptions"
```
