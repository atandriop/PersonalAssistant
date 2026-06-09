# Subscription Mark as Paid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Paid" button to each subscription card that advances the renewal date by one billing period.

**Architecture:** A pure `advanceRenewalDate` helper function lives in `src/lib/subscriptionUtils.ts`. The `SubscriptionsPage` component calls it on button click and fires the existing `PUT /api/subscriptions/:id` endpoint with the updated date. No backend or schema changes required.

**Tech Stack:** TypeScript, React, SWR, Next.js API routes, Vitest

---

### Task 1: Add `advanceRenewalDate` utility with tests

**Files:**
- Create: `src/lib/subscriptionUtils.ts`
- Create: `src/lib/subscriptionUtils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/subscriptionUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { advanceRenewalDate } from './subscriptionUtils'

describe('advanceRenewalDate', () => {
  it('advances a monthly subscription by 1 month', () => {
    expect(advanceRenewalDate('2026-06-09', 'monthly')).toBe('2026-07-09')
  })

  it('advances a quarterly subscription by 3 months', () => {
    expect(advanceRenewalDate('2026-06-09', 'quarterly')).toBe('2026-09-09')
  })

  it('advances a yearly subscription by 12 months', () => {
    expect(advanceRenewalDate('2026-06-09', 'yearly')).toBe('2027-06-09')
  })

  it('handles month-end dates (e.g. Jan 31 → Feb 28)', () => {
    expect(advanceRenewalDate('2026-01-31', 'monthly')).toBe('2026-02-28')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/subscriptionUtils.test.ts
```

Expected: FAIL — `Cannot find module './subscriptionUtils'`

- [ ] **Step 3: Implement the utility**

Create `src/lib/subscriptionUtils.ts`:

```typescript
const PERIOD_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

export function advanceRenewalDate(renewalDate: string, period: string): string {
  const d = new Date(renewalDate)
  const months = PERIOD_MONTHS[period] ?? 1
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/subscriptionUtils.test.ts
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/subscriptionUtils.ts src/lib/subscriptionUtils.test.ts
git commit -m "feat: add advanceRenewalDate utility for subscriptions"
```

---

### Task 2: Add "Paid" button to subscription cards

**Files:**
- Modify: `src/components/subscriptions/SubscriptionsPage.tsx`

- [ ] **Step 1: Import `advanceRenewalDate`**

At the top of `src/components/subscriptions/SubscriptionsPage.tsx`, add the import after the existing imports:

```typescript
import { advanceRenewalDate } from '@/lib/subscriptionUtils'
```

- [ ] **Step 2: Add the `markPaid` handler**

Inside the `SubscriptionsPage` component body, add after the `del` function (around line 128):

```typescript
async function markPaid(s: Subscription) {
  if (!s.renewalDate) return
  const newDate = advanceRenewalDate(s.renewalDate.slice(0, 10), s.period)
  await fetch(`/api/subscriptions/${s.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...s, renewalDate: newDate }),
  })
  mutate()
}
```

- [ ] **Step 3: Add the "Paid" button to each card**

In the card's action button row (the `<div className="flex gap-1 shrink-0">` around line 242), add the Paid button before the Edit button:

```tsx
<div className="flex gap-1 shrink-0">
  {s.renewalDate && (
    <button onClick={() => markPaid(s)} className="text-xs px-2 py-1 text-green-600 border border-green-300 rounded-md hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20">Paid</button>
  )}
  <button onClick={() => setEditing(s)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
  <button onClick={() => del(s.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/subscriptions/SubscriptionsPage.tsx
git commit -m "feat: add Paid button to subscription cards to advance renewal date"
```
