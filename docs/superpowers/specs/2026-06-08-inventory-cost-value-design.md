# Inventory Cost & Current Value

**Date:** 2026-06-08

## Overview

Every inventory item should track two prices: `cost` (what was paid) and a computed current `value` (what it is worth today). Vehicles and similar assets depreciate; collectibles fluctuate unpredictably. Value is estimated automatically where a formula applies, defaults to cost otherwise, and can always be overridden manually per item.

---

## Data Model

### Category (new fields)

| Field | Type | Default | Description |
|---|---|---|---|
| `valueMethod` | `String` | `"cost"` | `"cost"` or `"depreciation"` |
| `depreciationRate` | `Float?` | `null` | Annual compound rate as decimal (e.g. `0.15` = 15%/year). Only used when `valueMethod = "depreciation"` |

### InventoryItem (new field)

| Field | Type | Default | Description |
|---|---|---|---|
| `currentValue` | `Float?` | `null` | Explicit manual override. `null` means "use formula" |

### Value Resolution (shared utility `computeValue`)

```
computeValue(item, category) → Float:
  if item.currentValue != null:
    return item.currentValue
  if category.valueMethod == "depreciation"
     && category.depreciationRate != null
     && item.purchaseDate != null:
    years = (today - item.purchaseDate) / 365.25
    return item.cost * (1 - category.depreciationRate) ^ years
  return item.cost
```

This utility lives in `src/lib/inventoryUtils.ts` and is used by all display and export surfaces.

---

## Category Manager UI

When creating or editing a category, two new fields appear:

- **Value Method** — dropdown: "Cost (default)" | "Depreciation (compound %/year)"
- **Annual Rate %** — number input, visible only when "Depreciation" is selected. User enters e.g. `15` (stored as `0.15`).

---

## Inventory Form UI

- New optional **Current Value Override** field (number input).
- Placeholder text shows the formula-calculated estimate (e.g. `"Estimated: €14,500"`) so the user knows what the formula would produce before deciding to override.
- Leaving it empty stores `null` — the formula applies.
- When a wishlist item is moved to inventory via "Got it" or "→ Inventory", `currentValue` is left `null`.

---

## Items Page Display

### Inventory cards

Each card shows:
- **Value** — prominent, computed via `computeValue` — prefixed with `~` if formula-derived, no prefix if manually set
- **Cost** — smaller, muted — what was paid
- **Delta** — `+€X` (green) or `-€X` (red) showing gain/loss vs cost

### Summary strip

Before: `Owned value: €X`
After: `Cost: €X · Value: €Y · +€Z` (or `-€Z` for net loss)

### Bulk editor

- Existing `cost` column remains editable
- New read-only `value` column shows computed value
- New editable `currentValue` column for the manual override

---

## "Update Values" AI Prompt Flow

A new **"Update Values"** button in the page header opens a two-tab modal:

### Tab 1 — Get Prompt

Generates a copyable text block:

```
Here are my inventory items with their current estimated values.
Please research and return updated current market values for each item.
Reply ONLY with lines in the format: Item Name | Value

MacBook Pro 14" | €1,200 (formula estimate)
BMW 3 Series 2021 | €18,500 (formula estimate)
Charizard Holo 1st Ed | €800 (cost, no estimate)
Funko Pop Batman | €15 (cost, no estimate)
```

### Tab 2 — Apply Values

- Paste area for the AI's response (same `Name | Value` format)
- **Apply** button: matches item names case-insensitively and bulk-updates `currentValue` via `PUT /api/inventory/:id`
- Lines with no matching item are listed as warnings — nothing is silently dropped or misassigned

---

## Finance & Export

| Surface | Before | After |
|---|---|---|
| Finance CostsTab YTD purchases | `cost × quantity` | unchanged — represents spend |
| Items page "Owned value" | `cost × quantity` | `computeValue × quantity` |
| Net worth / owned total | `cost × quantity` | `computeValue × quantity` |
| PDF export inventory table | Cost column only | Cost + Value columns, total uses value |
| Weekly review inventory list | cost per item | cost + current value per item |

---

## API Changes

- `GET /api/inventory` — response includes `currentValue`
- `POST /api/inventory` — accepts optional `currentValue`
- `PUT /api/inventory/:id` — accepts optional `currentValue`
- `GET /api/categories` — response includes `valueMethod` and `depreciationRate`
- `POST /api/categories` — accepts `valueMethod` and `depreciationRate`
- `PUT /api/categories/:id` — accepts `valueMethod` and `depreciationRate`

`computeValue` runs on the client side (not the API) since it only needs data already returned.

---

## Out of Scope

- Value history / charting over time
- External API lookups for market prices
- Per-item depreciation rates (category-level only)
