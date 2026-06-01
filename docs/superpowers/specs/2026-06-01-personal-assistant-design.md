# Personal Assistant Web App — Design Spec

**Date:** 2026-06-01  
**Status:** Approved

---

## Overview

A personal-use local web app for tracking wishlists, inventory, decision matrices, and a financial portfolio. Runs on localhost, no authentication. Built with Next.js 14 (App Router), Tailwind CSS, Prisma, and SQLite3.

---

## Phased Implementation

### Phase 1 (current)
Build: Wishlist, Inventory, Categories.  
Full Prisma schema runs on first migration — all tables created including future modules.  
Sidebar shows all 5 pages; Matrices, Portfolio, and Trends are greyed out and non-clickable.  
No stub routes or placeholder files for unbuilt pages.

### Future phases
Matrices → Portfolio → Trends, in any order. Each phase activates its sidebar link, implements its API routes, and adds its components.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS with dark mode (`class` strategy) |
| Backend | Next.js API Routes (no separate server) |
| ORM | Prisma |
| Database | SQLite3 (via Prisma) |
| Runtime | Node.js, single `npm run dev` process |

No authentication. Personal local use only.

---

## Layout

Persistent left sidebar with navigation links to all five pages and a dark/light mode toggle at the bottom. The sidebar is always visible.

Pages:
1. Wishlist — active (Phase 1)
2. Inventory — active (Phase 1)
3. Matrices — disabled, greyed out (future)
4. Portfolio — disabled, greyed out (future)
5. Trends — disabled, greyed out (future)

Disabled links are non-clickable and show a subtle visual indicator. Activating a future page requires removing its disabled state from `Sidebar.tsx`.

Dark/light mode toggle in the sidebar footer. Preference persisted in `localStorage`. Tailwind `darkMode: 'class'` strategy — toggle switches `dark` class on `<html>`.

---

## Shared: Categories

Categories are defined once and shared across Wishlist and Inventory. Each category has a name and a colour. Managed inline from either page (add/edit/delete). No separate settings page.

---

## Page 1: Wishlist

Tracks products the user wants to buy.

**Features:**
- Add/edit/delete items with: name, URL (optional), cost, category, priority (High/Medium/Low), notes (optional)
- Items grouped by category, each group showing item count and subtotal
- Summary strip at the top: total cost + per-category cost chips
- Search bar and category filter dropdown
- "Got it" button on each item: marks as purchased. Prompts to move the item to Inventory (with purchase date pre-filled).
- Upgrade badge: if any inventory item targets this wishlist item as an upgrade, a label is shown on the item row ("Upgrade for: [inventory item name]")

---

## Page 2: Inventory

Tracks items the user owns.

**Features:**
- Add/edit/delete items with: name, category, cost, quantity, purchase date (optional), notes (optional), upgrade target (optional — links to a Wishlist item)
- Items grouped by category, each group showing item count and subtotal
- Summary strip: total value, per-category value chips, count of items with an upgrade available on the wishlist
- Search bar and category filter dropdown
- Upgrade target shown as a badge (orange) with the wishlist item name and cost; clicking it navigates to that item in the Wishlist

---

## Page 3: Weighted Matrices (future)

Stores and displays weighted decision matrices.

**Features:**
- Multiple saved matrices, selected from a dropdown
- Create new matrix (name + optional description)
- Add/remove criteria (rows) — each criterion has a name and a weight (%)
- Add/remove options (columns) — each option has a name
- Score grid: each cell (option × criterion) holds a score from 0–10, editable inline
- Weighted score row at the bottom: auto-calculated as `sum(score × weight/100)` per option
- Mini progress bar per option in the weighted score row
- Bar chart below the table ranking all options by weighted score, sorted descending
- Weight validation: warning shown if weights do not sum to 100%
- All changes auto-save

---

## Page 4: Portfolio (future)

Tracks financial holdings manually.

**Holding types and fields:**

| Type | Fields |
|---|---|
| Stock | name, quantity, buy price, current price |
| Crypto | name, quantity, buy price, current price |
| Savings | name, current balance, annual interest rate (%) |
| Other | name, quantity, buy price, current price |

**Features:**
- Add/edit/delete holdings
- Current price / balance editable inline; P&L updates immediately
- P&L = (current price − buy price) × quantity; shown in green (positive) or red (negative)
- Savings: projected 1-year value shown = `balance × (1 + rate/100)`
- Summary strip: total portfolio value, total P&L vs purchase cost, breakdown by type
- Filter by type dropdown

---

## Page 5: Trends (future)

Visualises how key totals change over time.

**Charts:**
1. Wishlist total cost over time (line chart, blue)
2. Portfolio total value over time (line chart, green)

**Snapshot mechanism:** A snapshot is saved automatically on each visit to the Trends page. The snapshot records the current date, wishlist total, and portfolio total.

---

## Data Model (Prisma / SQLite)

Full schema created on first migration. Phase 1 tables are populated through the UI; future tables remain empty until their pages are built.

```prisma
model Category {
  id             Int             @id @default(autoincrement())
  name           String
  color          String
  wishlistItems  WishlistItem[]
  inventoryItems InventoryItem[]
}

model WishlistItem {
  id                Int             @id @default(autoincrement())
  name              String
  url               String?
  cost              Float
  priority          String          @default("Medium") // High | Medium | Low
  notes             String?
  purchased         Boolean         @default(false)
  categoryId        Int
  category          Category        @relation(fields: [categoryId], references: [id])
  inventoryUpgrades InventoryItem[] @relation("UpgradeTarget")
  createdAt         DateTime        @default(now())
}

model InventoryItem {
  id              Int           @id @default(autoincrement())
  name            String
  cost            Float
  quantity        Int           @default(1)
  purchaseDate    DateTime?
  notes           String?
  categoryId      Int
  category        Category      @relation(fields: [categoryId], references: [id])
  upgradeTargetId Int?
  upgradeTarget   WishlistItem? @relation("UpgradeTarget", fields: [upgradeTargetId], references: [id])
  createdAt       DateTime      @default(now())
}

model Matrix {
  id          Int              @id @default(autoincrement())
  name        String
  description String?
  criteria    MatrixCriteria[]
  options     MatrixOption[]
  createdAt   DateTime         @default(now())
}

model MatrixCriteria {
  id       Int           @id @default(autoincrement())
  name     String
  weight   Float         // 0–100
  matrixId Int
  matrix   Matrix        @relation(fields: [matrixId], references: [id], onDelete: Cascade)
  scores   MatrixScore[]
}

model MatrixOption {
  id       Int           @id @default(autoincrement())
  name     String
  matrixId Int
  matrix   Matrix        @relation(fields: [matrixId], references: [id], onDelete: Cascade)
  scores   MatrixScore[]
}

model MatrixScore {
  id         Int            @id @default(autoincrement())
  score      Float          @default(0) // 0–10
  optionId   Int
  option     MatrixOption   @relation(fields: [optionId], references: [id], onDelete: Cascade)
  criteriaId Int
  criteria   MatrixCriteria @relation(fields: [criteriaId], references: [id], onDelete: Cascade)

  @@unique([optionId, criteriaId])
}

model PortfolioHolding {
  id           Int      @id @default(autoincrement())
  name         String
  type         String   // stock | crypto | savings | other
  quantity     Float?
  buyPrice     Float?
  currentPrice Float?
  balance      Float?
  interestRate Float?
  notes        String?
  createdAt    DateTime @default(now())
}

model Snapshot {
  id             Int      @id @default(autoincrement())
  date           DateTime @default(now())
  wishlistTotal  Float
  portfolioTotal Float
}
```

---

## API Routes (Phase 1)

All routes under `/api/`. Only phase 1 routes are implemented; future module routes are added when those pages are built.

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/categories` | List / create categories |
| PUT/DELETE | `/api/categories/[id]` | Update / delete category |
| GET/POST | `/api/wishlist` | List / create wishlist items |
| PUT/DELETE | `/api/wishlist/[id]` | Update / delete wishlist item |
| GET/POST | `/api/inventory` | List / create inventory items |
| PUT/DELETE | `/api/inventory/[id]` | Update / delete inventory item |

Future API routes (added per phase):

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/matrices` | List / create matrices |
| PUT/DELETE | `/api/matrices/[id]` | Update / delete matrix |
| GET/POST | `/api/matrices/[id]/criteria` | List / add criteria |
| PUT/DELETE | `/api/matrices/criteria/[id]` | Update / delete criterion |
| GET/POST | `/api/matrices/[id]/options` | List / add options |
| PUT/DELETE | `/api/matrices/options/[id]` | Update / delete option |
| PUT | `/api/matrices/scores` | Upsert a score |
| GET/POST | `/api/portfolio` | List / create holdings |
| PUT/DELETE | `/api/portfolio/[id]` | Update / delete holding |
| GET/POST | `/api/snapshots` | List snapshots / create snapshot |

---

## Project Structure

```
/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with sidebar
│   │   ├── page.tsx               # Redirect → /wishlist
│   │   ├── wishlist/page.tsx
│   │   ├── inventory/page.tsx
│   │   └── api/
│   │       ├── categories/
│   │       │   ├── route.ts       # GET, POST
│   │       │   └── [id]/route.ts  # PUT, DELETE
│   │       ├── wishlist/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       └── inventory/
│   │           ├── route.ts
│   │           └── [id]/route.ts
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── wishlist/
│   │   │   ├── WishlistPage.tsx
│   │   │   ├── WishlistItem.tsx
│   │   │   └── WishlistForm.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── InventoryItem.tsx
│   │   │   └── InventoryForm.tsx
│   │   └── ui/
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       └── CategoryPill.tsx
│   └── lib/
│       └── prisma.ts              # Prisma client singleton
├── .env                           # DATABASE_URL="file:./dev.db"
└── package.json
```
