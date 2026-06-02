# Finance Summary Page — Design Spec

## Overview

New read-only page at `/finance` giving a quick financial health snapshot. No charts (those live on Net Worth), no CRUD. Four sections.

## Route & Component

- `src/app/finance/page.tsx` — renders `<FinancePage />`
- `src/components/finance/FinancePage.tsx` — new component
- Sidebar: add `{ href: '/finance', label: 'Finance', active: true }` after Net Worth

## Data

Fetches (all existing endpoints):
- `GET /api/portfolio` — holdings
- `GET /api/net-worth/entries` — manual assets/liabilities
- `GET /api/subscriptions` — for cost summary
- `GET /api/wishlist` — for wishlist value summary

## Sections

### 1. Summary Strip (3 stat cards)

| Stat | Calculation |
|------|-------------|
| **Net Worth** | `totalAssets − totalLiabilities` (same logic as NetWorthPage: portfolio value + asset entries − liability entries − subscription annual cost) |
| **Monthly Subscriptions** | Sum of active subscriptions: `period === 'yearly' ? cost/12 : cost` |
| **Portfolio P&L** | Sum of `(currentPrice − buyPrice) × quantity` for non-savings holdings where all three fields are non-null |

Net Worth shown large with green/red colour. Monthly subs and P&L shown smaller.

### 2. Portfolio Breakdown

Table showing holdings grouped by type with total value and % of portfolio per type.

| Type | Value | % |
|------|-------|---|
| Stock | €X | X% |
| Crypto | €X | X% |
| Savings | €X | X% |
| Other | €X | X% |
| **Total** | **€X** | **100%** |

Below the table: a simple horizontal bar split by type (colour-coded using existing type colours: stock=#3b82f6, crypto=#f59e0b, savings=#10b981, other=#8b5cf6).

If no holdings: `"No portfolio holdings yet."` 

### 3. Subscriptions

Lists all active subscriptions, sorted by monthly cost descending.

Each row: name, renewal date (if set), monthly equivalent, period label.

Footer: total monthly cost, total annual cost.

If no active subscriptions: `"No active subscriptions."`

### 4. Wishlist Summary

Shows active (unpurchased) wishlist items grouped by priority with item count and total value.

| Priority | Items | Value |
|----------|-------|-------|
| High | N | €X |
| Medium | N | €X |
| Low | N | €X |
| **Total** | **N** | **€X** |

If empty: `"Wishlist is clear."`

## Out of Scope

- Charts (already on Net Worth page)
- Spending history / budget tracking
- Investment return calculations
