# Quick UI Improvements — Design Spec

Three small UI-only improvements with no new data models or API routes.

---

## 1. Wishlist → Inventory Quick-Transfer

**File:** `src/components/wishlist/WishlistPage.tsx`

When a wishlist item is marked as purchased (`purchased: true`), show a "→ Inventory" button next to it. Clicking opens a modal with a pre-filled inventory form:
- Name: pre-filled from wishlist item name
- Cost: pre-filled from wishlist item cost
- Category: pre-filled from wishlist item categoryId

On save, the inventory item is created via `POST /api/inventory`. After creation, the `upgradeTarget` on the new inventory item is set to the wishlist item id via `PUT /api/inventory/:id` — linking them as the existing upgrade relationship.

The "→ Inventory" button only appears on purchased items that do NOT already have an inventory item referencing them as an `upgradeTarget`. (Check by looking at `inventoryUpgrades` array on the wishlist item — if it has entries, the item is already in inventory.)

**Note:** The existing wishlist API already returns `inventoryUpgrades` via the category route, so no API change is needed. The inventory form component (`src/components/inventory/InventoryForm.tsx`) can be reused directly.

---

## 2. Portfolio P&L Column

**File:** `src/components/portfolio/PortfolioPage.tsx`

Add a "Gain / Loss" column to the portfolio holdings table. Rules:
- Only shown when `quantity`, `currentPrice`, and `buyPrice` are all non-null
- Value = `(currentPrice − buyPrice) × quantity`
- Positive: green text with `+€X` prefix
- Negative: red text with `−€X` prefix (absolute value with minus sign)
- Zero: grey `€0`
- Holdings without all three fields (savings, balance-type) show `—` in that column

No API changes.

---

## 3. Subscriptions Annual Cost in Net Worth Liabilities

**File:** `src/components/networth/NetWorthPage.tsx`

Add a read-only "Subscriptions" row at the bottom of the Liabilities column.

**Annual cost calculation:**
- Fetch `/api/subscriptions`
- Filter `active: true` only
- Per subscription: `period === 'monthly' → cost × 12`, `period === 'yearly' → cost × 1`, other → `cost × 12` (default monthly)
- Sum all active subscriptions

**Display:**
- Row label: "Subscriptions (annual)"
- Value: formatted as `€X`
- Small italic note: "estimated annual cost"
- Shown in the Liabilities column as a read-only entry (no Edit/Delete buttons)
- Included in `totalLiabilities` and therefore in `netWorth`

The `NetWorthPage` already fetches subscriptions are not currently loaded — add `useSWR` for `/api/subscriptions` and compute the annual total client-side.
