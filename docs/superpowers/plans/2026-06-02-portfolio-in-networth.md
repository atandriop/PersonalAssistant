# Portfolio in Net Worth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Portfolio from the sidebar and make it accessible via a "Manage holdings" modal launched from the Net Worth page.

**Architecture:** Add `hideHeader` prop to PortfolioPage; mount it inside a Modal on NetWorthPage triggered by a button on the Portfolio subtotal row; redirect `/portfolio` to `/net-worth`; remove Portfolio from sidebar.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS, TypeScript, SWR

---

## File Map

| Task | Files |
|------|-------|
| 1. PortfolioPage hideHeader prop | Modify `src/components/portfolio/PortfolioPage.tsx` |
| 2. NetWorthPage — modal integration | Modify `src/components/networth/NetWorthPage.tsx` |
| 3. Portfolio route redirect | Modify `src/app/portfolio/page.tsx` |
| 4. Sidebar update | Modify `src/components/Sidebar.tsx` |

---

## Task 1: Add hideHeader prop to PortfolioPage

**Files:** Modify `src/components/portfolio/PortfolioPage.tsx`

The Portfolio page has `export default function PortfolioPage()`. When rendered inside a Modal, the `<h1>Portfolio</h1>` heading is redundant (the modal has its own title). Add an optional prop to suppress it.

- [ ] **Step 1.1: Update the component signature**

Find:
```typescript
export default function PortfolioPage() {
```

Replace with:
```typescript
export default function PortfolioPage({ hideHeader = false }: { hideHeader?: boolean }) {
```

- [ ] **Step 1.2: Conditionally render the h1**

Find the heading line inside the JSX (inside the `return`):
```tsx
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
```

Replace with:
```tsx
{!hideHeader && <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>}
```

The heading is inside a flex row with other buttons. Find the full header div:
```tsx
<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
  <div className="flex gap-2">
```

Replace with:
```tsx
<div className="flex items-center justify-between mb-4">
  {!hideHeader && <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>}
  <div className="flex gap-2">
```

- [ ] **Step 1.3: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 1.4: Commit**

```bash
git add src/components/portfolio/PortfolioPage.tsx
git commit -m "feat: add hideHeader prop to PortfolioPage for modal embedding"
```

---

## Task 2: Add "Manage holdings" modal to NetWorthPage

**Files:** Modify `src/components/networth/NetWorthPage.tsx`

- [ ] **Step 2.1: Import PortfolioPage**

After `import Modal from '@/components/ui/Modal'`, add:

```typescript
import PortfolioPage from '@/components/portfolio/PortfolioPage'
```

- [ ] **Step 2.2: Add showPortfolio state**

Inside `NetWorthPage`, after the existing `useState` declarations, add:

```typescript
const [showPortfolio, setShowPortfolio] = useState(false)
```

- [ ] **Step 2.3: Add Manage button to Portfolio subtotal row**

Find the Portfolio subtotal row in the Assets column JSX:
```tsx
<div className="flex justify-between items-center pt-1 mt-1 border-t border-gray-200 dark:border-gray-700">
  <span className="text-xs text-gray-400">Portfolio subtotal</span>
  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{fmt(portfolioTotal)}</span>
</div>
```

Replace with:
```tsx
<div className="flex justify-between items-center pt-1 mt-1 border-t border-gray-200 dark:border-gray-700">
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-400">Portfolio subtotal</span>
    <button
      onClick={() => setShowPortfolio(true)}
      className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
    >
      Manage →
    </button>
  </div>
  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{fmt(portfolioTotal)}</span>
</div>
```

- [ ] **Step 2.4: Add the modal at the bottom of JSX**

After the last existing modal (the `{editing && ...}` Modal), add:

```tsx
{showPortfolio && (
  <Modal title="Portfolio Holdings" onClose={() => setShowPortfolio(false)}>
    <div className="max-h-[70vh] overflow-y-auto -mx-4 px-4">
      <PortfolioPage hideHeader />
    </div>
  </Modal>
)}
```

- [ ] **Step 2.5: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 2.6: Commit**

```bash
git add src/components/networth/NetWorthPage.tsx
git commit -m "feat: add Manage Holdings modal to Net Worth page"
```

---

## Task 3: Redirect /portfolio to /net-worth

**Files:** Modify `src/app/portfolio/page.tsx`

- [ ] **Step 3.1: Replace the route with a redirect**

The current file renders `<PortfolioPage />`. Replace the entire file content:

```tsx
import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/net-worth')
}
```

- [ ] **Step 3.2: Verify TypeScript**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3.3: Commit**

```bash
git add src/app/portfolio/page.tsx
git commit -m "feat: redirect /portfolio to /net-worth"
```

---

## Task 4: Remove Portfolio from sidebar

**Files:** Modify `src/components/Sidebar.tsx`

- [ ] **Step 4.1: Remove Portfolio entry**

Find and delete from the NAV array:
```typescript
{ href: '/portfolio', label: 'Portfolio', active: true },
```

- [ ] **Step 4.2: Verify TypeScript and lint**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit && npx next lint 2>&1 | tail -3
```

Expected: no output / `✔ No ESLint warnings or errors`

- [ ] **Step 4.3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: remove Portfolio from sidebar (now accessible via Net Worth)"
```
