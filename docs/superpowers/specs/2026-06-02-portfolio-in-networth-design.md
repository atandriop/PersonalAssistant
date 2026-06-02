# Portfolio Merged into Net Worth — Design Spec

## Overview

Remove Portfolio from the sidebar. Add a "Manage holdings" button to the Net Worth page's Portfolio subtotal row that opens PortfolioPage inside a Modal. Redirect `/portfolio` to `/net-worth`.

## Changes

### PortfolioPage (`src/components/portfolio/PortfolioPage.tsx`)

Add an optional `hideHeader?: boolean` prop. When `true`, omit the `<h1>Portfolio</h1>` heading (so it renders cleanly inside a modal). Default `false` — existing behaviour unchanged.

### NetWorthPage (`src/components/networth/NetWorthPage.tsx`)

- Import `PortfolioPage` from `@/components/portfolio/PortfolioPage`
- Add `const [showPortfolio, setShowPortfolio] = useState(false)`
- In the Assets column, find the "Portfolio subtotal" row. Add a small "Manage →" button to its right side that sets `showPortfolio(true)`.
- At the bottom of JSX (alongside existing modals), add:

```tsx
{showPortfolio && (
  <Modal title="Portfolio Holdings" onClose={() => setShowPortfolio(false)}>
    <div className="max-h-[70vh] overflow-y-auto">
      <PortfolioPage hideHeader />
    </div>
  </Modal>
)}
```

The Modal already exists in the codebase (`src/components/ui/Modal.tsx`).

### Portfolio route (`src/app/portfolio/page.tsx`)

Replace existing content with a redirect:

```tsx
import { redirect } from 'next/navigation'
export default function Page() { redirect('/net-worth') }
```

### Sidebar (`src/components/Sidebar.tsx`)

Remove `{ href: '/portfolio', label: 'Portfolio' }` from the NAV array.

## Out of Scope

- Removing `PortfolioPage.tsx` entirely (it is still used as the modal content)
- Combining the portfolio AI prompt with the net worth page
