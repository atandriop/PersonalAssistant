# Net Worth Dashboard — Design Spec

## Overview

A net worth dashboard that combines automatically-pulled Portfolio holdings with manually entered assets and liabilities (property, vehicles, cash, loans, mortgages, etc.). Records one daily snapshot automatically on page load to power a historical trend chart.

## Data Model

```
NetWorthEntry
  id        Int      @id @default(autoincrement())
  name      String
  value     Float
  type      String   -- "asset" | "liability"
  category  String   -- "property" | "vehicle" | "cash" | "loan" | "mortgage" | "other"
  notes     String?
  createdAt DateTime @default(now())

NetWorthSnapshot
  id    Int    @id @default(autoincrement())
  date  String -- "YYYY-MM-DD"
  total Float

  @@unique([date])
```

## Portfolio Integration

Portfolio holdings (`PortfolioHolding`) are fetched at display time and included in the asset total. They are NOT stored in `NetWorthEntry`. Value per holding:
- If `quantity` and `currentPrice` are both present: `quantity × currentPrice`
- Else if `balance` is present: `balance`
- Otherwise: 0

## Snapshot Logic

On page load, the frontend calls `GET /api/net-worth/snapshot` which:
1. Gets today's date string (`YYYY-MM-DD`)
2. Checks if a `NetWorthSnapshot` with that date already exists
3. If not: computes total = (portfolio total + sum of asset entries) − sum of liability entries, then saves it
4. Returns the new or existing snapshot (no-op if already recorded today)

## Pages & Navigation

### `/net-worth` — Main page

**Top strip** — 3 summary cards:
- Net Worth = assets − liabilities (text colour: green if positive, red if negative)
- Total Assets
- Total Liabilities

**Trend chart** — SVG line chart of all `NetWorthSnapshot` records ordered by date:
- X-axis: date labels (month/year)
- Y-axis: total value
- Hidden if fewer than 2 snapshots exist (replaced by "Add more data to see trend" message)

**Bottom two columns:**

*Assets (left)*
- Portfolio section (read-only): lists each `PortfolioHolding` with its computed value; shows a subtotal
- Manual entries: grouped by category, each row shows name + value + Edit/Delete buttons
- "+ Add entry" button (opens modal pre-set to type=asset)

*Liabilities (right)*
- Manual entries grouped by category
- "+ Add entry" button (opens modal pre-set to type=liability)

**Add/edit modal** — fields: name (required), value (required, number), type (asset | liability), category (dropdown), notes (optional)

### Sidebar

Add "Net Worth" between Portfolio and Trends.

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/net-worth/entries` | List all entries |
| POST | `/api/net-worth/entries` | Create entry |
| PUT | `/api/net-worth/entries/[id]` | Update entry |
| DELETE | `/api/net-worth/entries/[id]` | Delete entry |
| GET | `/api/net-worth/snapshot` | Record today's snapshot if missing, return it |
| GET | `/api/net-worth/snapshots` | List all snapshots (for trend chart) |

## Out of Scope

- Historical value tracking per entry (e.g. property value changing over time)
- Automatic data sync with banks or brokers
- Currency conversion
