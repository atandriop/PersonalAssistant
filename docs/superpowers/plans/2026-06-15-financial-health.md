# Financial Health View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Health" tab to the Finance page showing monthly burn breakdown, runway in months, FIRE number, and FIRE progress — connecting the existing subscriptions, net worth, and portfolio data that currently live in separate tabs.

**Architecture:** No schema changes. New `HealthTab` component receives computed values as props from `FinancePage` (which already fetches all the needed data). New `financialHealthUtils.ts` has pure math functions for burn, runway, and FIRE calculations. `FinancePage` gets a new `'health'` section entry.

**Tech Stack:** React + SWR (data already fetched by FinancePage), Tailwind CSS, Recharts (already installed), Vitest

---

## File Map

| Action | File |
|--------|------|
| Create | `src/lib/financialHealthUtils.ts` |
| Create | `src/lib/financialHealthUtils.test.ts` |
| Create | `src/components/finance/HealthTab.tsx` |
| Modify | `src/components/finance/FinancePage.tsx` |

---

### Task 1: Financial health utilities + tests

**Files:**
- Create: `src/lib/financialHealthUtils.ts`
- Create: `src/lib/financialHealthUtils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/financialHealthUtils.test.ts
import { describe, it, expect } from 'vitest'
import {
  normalizeToMonthly,
  calcFireNumber,
  calcRunwayMonths,
  calcFireProgress,
} from './financialHealthUtils'

describe('normalizeToMonthly', () => {
  it('returns monthly cost as-is for monthly period', () => {
    expect(normalizeToMonthly(10, 'monthly')).toBeCloseTo(10)
  })
  it('divides yearly cost by 12', () => {
    expect(normalizeToMonthly(120, 'yearly')).toBeCloseTo(10)
  })
  it('divides quarterly cost by 3', () => {
    expect(normalizeToMonthly(30, 'quarterly')).toBeCloseTo(10)
  })
})

describe('calcFireNumber', () => {
  it('multiplies monthly burn by 12 then by 25 (4% rule)', () => {
    expect(calcFireNumber(1000)).toBe(300000)
  })
  it('returns 0 for 0 burn', () => {
    expect(calcFireNumber(0)).toBe(0)
  })
})

describe('calcRunwayMonths', () => {
  it('divides liquid assets by monthly burn', () => {
    expect(calcRunwayMonths(60000, 2000)).toBe(30)
  })
  it('returns Infinity when monthly burn is 0', () => {
    expect(calcRunwayMonths(60000, 0)).toBe(Infinity)
  })
  it('returns 0 when assets are 0', () => {
    expect(calcRunwayMonths(0, 2000)).toBe(0)
  })
})

describe('calcFireProgress', () => {
  it('returns percentage of FIRE number reached', () => {
    expect(calcFireProgress(150000, 300000)).toBeCloseTo(50)
  })
  it('returns 0 when FIRE number is 0', () => {
    expect(calcFireProgress(100, 0)).toBe(0)
  })
  it('caps at 100 when portfolio exceeds FIRE number', () => {
    expect(calcFireProgress(400000, 300000)).toBe(100)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/financialHealthUtils.test.ts
```

Expected: FAIL — `Cannot find module './financialHealthUtils'`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/financialHealthUtils.ts

export function normalizeToMonthly(cost: number, period: string): number {
  if (period === 'yearly')    return cost / 12
  if (period === 'quarterly') return cost / 3
  return cost
}

export function calcFireNumber(monthlyBurn: number): number {
  return monthlyBurn * 12 * 25
}

export function calcRunwayMonths(liquidAssets: number, monthlyBurn: number): number {
  if (monthlyBurn === 0) return Infinity
  return liquidAssets / monthlyBurn
}

export function calcFireProgress(portfolioTotal: number, fireNumber: number): number {
  if (fireNumber === 0) return 0
  return Math.min(100, (portfolioTotal / fireNumber) * 100)
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd /home/than/PersonalAssistant && npx vitest run src/lib/financialHealthUtils.test.ts
```

Expected: All 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/financialHealthUtils.ts src/lib/financialHealthUtils.test.ts
git commit -m "feat: add financial health utility functions (burn, runway, FIRE)"
```

---

### Task 2: HealthTab component

**Files:**
- Create: `src/components/finance/HealthTab.tsx`

- [ ] **Step 1: Create component**

```typescript
// src/components/finance/HealthTab.tsx
'use client'

import { calcFireNumber, calcRunwayMonths, calcFireProgress } from '@/lib/financialHealthUtils'

interface HealthTabProps {
  monthlySubCost: number
  apptMonthly: number
  maintMonthly: number
  portfolioTotal: number
  netWorthAssets: number
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtDecimal(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

export default function HealthTab({ monthlySubCost, apptMonthly, maintMonthly, portfolioTotal, netWorthAssets }: HealthTabProps) {
  const totalMonthlyBurn = monthlySubCost + apptMonthly + maintMonthly
  const fireNumber       = calcFireNumber(totalMonthlyBurn)
  const runwayMonths     = calcRunwayMonths(netWorthAssets, totalMonthlyBurn)
  const fireProgress     = calcFireProgress(portfolioTotal, fireNumber)

  const runwayLabel = runwayMonths === Infinity
    ? '∞'
    : runwayMonths >= 24
    ? `${(runwayMonths / 12).toFixed(1)} yrs`
    : `${Math.round(runwayMonths)} mo`

  const burnBreakdown = [
    { label: 'Subscriptions', value: monthlySubCost, color: 'bg-blue-500' },
    { label: 'Appointments (avg)', value: apptMonthly, color: 'bg-yellow-500' },
    { label: 'Maintenance (avg)', value: maintMonthly, color: 'bg-orange-500' },
  ].filter(b => b.value > 0)

  return (
    <div className="max-w-2xl space-y-6">

      {/* Monthly burn breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Monthly burn</h2>
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{fmtDecimal(totalMonthlyBurn)}<span className="text-base font-normal text-gray-400">/mo</span></div>
        <div className="space-y-2">
          {burnBreakdown.map(b => (
            <div key={b.label} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.color}`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{b.label}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{fmtDecimal(b.value)}/mo</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
          Appointments and maintenance based on 12-month trailing average.
        </div>
      </div>

      {/* Runway */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Runway</h2>
        <p className="text-xs text-gray-400 mb-4">How long liquid assets last at current burn</p>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{runwayLabel}</div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {fmt(netWorthAssets)} assets ÷ {fmtDecimal(totalMonthlyBurn)}/mo
        </div>
      </div>

      {/* FIRE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">FIRE number</h2>
        <p className="text-xs text-gray-400 mb-4">25× annual spend (4% withdrawal rule)</p>
        <div className="flex items-end gap-4 mb-4">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{fmt(fireNumber)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{fmt(portfolioTotal)} invested ({fireProgress.toFixed(1)}%)</div>
          </div>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${fireProgress}%`,
              backgroundColor: fireProgress >= 100 ? '#10b981' : fireProgress >= 50 ? '#3b82f6' : '#f59e0b',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{fmt(fireNumber)}</span>
        </div>
        {totalMonthlyBurn === 0 && (
          <p className="text-xs text-gray-400 mt-3">Add subscriptions or cost data to calculate FIRE number.</p>
        )}
      </div>

      {/* Annual summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Annual summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400">Annual spend</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">{fmt(totalMonthlyBurn * 12)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Savings needed for FIRE</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">{fmt(Math.max(0, fireNumber - portfolioTotal))}</div>
          </div>
        </div>
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/finance/HealthTab.tsx
git commit -m "feat: add HealthTab component with FIRE, runway, and burn breakdown"
```

---

### Task 3: Wire HealthTab into FinancePage

**Files:**
- Modify: `src/components/finance/FinancePage.tsx`

- [ ] **Step 1: Add 'health' to the FinanceSection type and SECTIONS array**

In `FinancePage.tsx`, find:

```typescript
type FinanceSection = 'overview' | 'net-worth' | 'subscriptions' | 'costs'
```

Replace with:

```typescript
type FinanceSection = 'overview' | 'net-worth' | 'subscriptions' | 'costs' | 'health'
```

Find the `SECTIONS` array and add after the `costs` entry:

```typescript
import { Activity } from 'lucide-react' // Activity is already imported
```

```typescript
  { id: 'health', label: 'Health', icon: Activity },
```

Note: `Activity` is already imported in this file (check the import at the top — it's in the destructure).

- [ ] **Step 2: Make appointment/maintenance data available for health section**

The existing conditional fetch currently is:

```typescript
const { data: appointments = [] } = useSWR<{ cost: number | null; date: string }[]>(
  section === 'overview' ? '/api/appointments' : null, fetcher)
const { data: maintItems = [] }   = useSWR<{ logs: { cost: number | null; date: string }[] }[]>(
  section === 'overview' ? '/api/maintenance/items' : null, fetcher)
```

Update the condition to also fetch for the health section:

```typescript
const { data: appointments = [] } = useSWR<{ cost: number | null; date: string }[]>(
  (section === 'overview' || section === 'health') ? '/api/appointments' : null, fetcher)
const { data: maintItems = [] }   = useSWR<{ logs: { cost: number | null; date: string }[] }[]>(
  (section === 'overview' || section === 'health') ? '/api/maintenance/items' : null, fetcher)
```

- [ ] **Step 3: Import HealthTab and add import**

Add import at the top of the file with the other component imports:

```typescript
import HealthTab from '@/components/finance/HealthTab'
```

- [ ] **Step 4: Add HealthTab render in the section conditional**

Find where the existing sections are rendered (after the tab nav). Look for the pattern that renders different content based on `section`. Add alongside the existing section renders:

```tsx
{section === 'health' && (
  <HealthTab
    monthlySubCost={monthlySubCost}
    apptMonthly={apptMonthly}
    maintMonthly={maintMonthly}
    portfolioTotal={portfolioTotal}
    netWorthAssets={assetTotal}
  />
)}
```

Note: `monthlySubCost`, `apptMonthly`, `maintMonthly`, `portfolioTotal`, and `assetTotal` are all already computed in `FinancePage` — no new calculations needed.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

- [ ] **Step 6: Run all tests**

```bash
cd /home/than/PersonalAssistant && npx vitest run
```

Expected: All tests pass including financialHealthUtils tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/finance/FinancePage.tsx
git commit -m "feat: add Health tab to Finance page with FIRE number and runway"
```
