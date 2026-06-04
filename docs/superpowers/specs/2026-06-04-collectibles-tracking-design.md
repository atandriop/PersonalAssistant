# Collectibles Tracking — Design Spec

## Goal

Add a Collectibles tab to the existing Items page so the user can track five collection types (Cards, Funko Pops, Lego, Figures, Books/Manga/Comics) with type-specific metadata fields, purchase price, and current estimated market value.

---

## Decisions Made

| Question | Decision |
|---|---|
| Location | Third tab in ItemsPage alongside Inventory and Wishlist |
| Architecture | New `CollectibleItem` model with JSON `metadata` for type-specific fields. `collectionType` stored as display string ("Cards", "Funko Pop", "Lego", "Figures", "Books") |
| Type-specific fields | Yes — each type shows its own form fields |
| Value tracking | Both purchase price and current estimated market value |
| Tab layout | Collapsible accordion sections per collection type |

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/components/items/CollectiblesTab.tsx` | Tab content — stats bar + 5 collapsible sections |
| `src/components/items/CollectibleForm.tsx` | Add/edit modal form with type-specific field blocks |
| `src/app/api/collectibles/route.ts` | GET all collectibles, POST create |
| `src/app/api/collectibles/[id]/route.ts` | PUT update, DELETE |

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `CollectibleItem` model |
| `src/components/items/ItemsPage.tsx` | Add "Collectibles" as third tab |

---

## Data Model

```prisma
model CollectibleItem {
  id             Int      @id @default(autoincrement())
  name           String
  collectionType String   // "Cards" | "Funko Pop" | "Lego" | "Figures" | "Books"
  quantity       Int      @default(1)
  purchasePrice  Float?
  currentValue   Float?
  condition      String?  // "Mint" | "Near Mint" | "Good" | "Fair" | "Poor"
  notes          String?
  metadata       Json?
  createdAt      DateTime @default(now())
}
```

### Type-specific metadata fields

**Cards**
```json
{
  "set": "Base Set",
  "rarity": "Holo Rare",
  "grade": "PSA 9",
  "gradingCompany": "PSA",
  "language": "EN"
}
```
Rarity options: Common, Uncommon, Rare, Holo Rare, Ultra Rare, Secret Rare, Promo
Grading company options: PSA, BGS, CGC (grade is a free-text string, e.g. "PSA 9", "BGS 9.5")

**Funko Pop**
```json
{
  "number": "03",
  "series": "Marvel",
  "exclusive": "GameStop",
  "vaulted": false,
  "boxCondition": "Mint"
}
```
Exclusive options: None, Amazon, GameStop, Target, Hot Topic, BoxLunch, SDCC, Other
Box condition options: Mint, Good, Damaged

**Lego**
```json
{
  "setNumber": "75192",
  "theme": "Star Wars",
  "year": 2017,
  "sealed": true,
  "pieceCount": 7541,
  "minifigureCount": 25
}
```

**Figures**
```json
{
  "franchise": "Dragon Ball Z",
  "brand": "Bandai",
  "scale": "1:12",
  "sealed": true
}
```

**Books / Manga / Comics**
```json
{
  "series": "One Piece",
  "volumeNumber": "1",
  "author": "Eiichiro Oda",
  "publisher": "Shueisha",
  "language": "EN"
}
```

---

## API

### `GET /api/collectibles`
Returns all collectible items ordered by `collectionType`, then `name`.

### `POST /api/collectibles`
Body: `{ name, collectionType, quantity, purchasePrice, currentValue, condition, notes, metadata }`
Returns: created item (201).

### `PUT /api/collectibles/[id]`
Body: any subset of the fields above.
Returns: updated item.

### `DELETE /api/collectibles/[id]`
Returns: 204.

---

## UI: CollectiblesTab

### Stats bar
Displayed at the top of the tab:
- **X items** — total count across all types
- **Paid €X** — sum of `purchasePrice` across all items (× quantity)
- **Value €X** — sum of `currentValue` where set, falling back to `purchasePrice` where not, × quantity

### Collapsible sections
Five sections in fixed order: 🃏 Cards · 👾 Funko Pops · 🧱 Lego · 🎭 Figures · 📚 Books

Each section header shows:
- Type emoji + name
- Item count in that type
- "+ Add" button (opens `CollectibleForm` with type pre-selected)
- Expand/collapse toggle

Sections with zero items start collapsed. Sections with items start expanded.

### Item rows
Each row shows:
- **Name** (truncated if long)
- **Type-specific summary** — the 1–2 most identifying metadata fields:
  - Cards: `set · grade` (e.g. "Base Set · PSA 9")
  - Funko Pop: `#number · exclusive` (e.g. "#03 · GameStop")
  - Lego: `setNumber · sealed/opened` (e.g. "75192 · Sealed")
  - Figures: `franchise · brand` (e.g. "DBZ · Bandai")
  - Books: `series · vol. N` (e.g. "One Piece · Vol. 1")
- **Quantity** (shown as "×N", hidden if 1)
- **Current value** (shown in green if set; purchase price in gray if not)
- **Edit** button → opens `CollectibleForm` pre-filled
- **Delete** button → confirm dialog, then DELETE

---

## UI: CollectibleForm

A modal form. Fields in order:

1. **Collection type** — dropdown (Cards / Funko Pop / Lego / Figures / Books). Disabled when editing.
2. **Name** — required text input
3. **Quantity** — number input, default 1
4. **Purchase price (€)** — optional number input
5. **Current value (€)** — optional number input
6. **Condition** — dropdown (Mint / Near Mint / Good / Fair / Poor), optional
7. **Notes** — optional textarea

Then a **type-specific block** rendered based on selected type:

**Cards block:** Set name, Rarity (dropdown), Grade (text, e.g. "PSA 9"), Grading company (PSA / BGS / CGC / None), Language

**Funko Pop block:** Number (#), Series, Exclusive (dropdown), Vaulted (checkbox), Box condition (dropdown)

**Lego block:** Set number, Theme, Year, Sealed (checkbox), Piece count, Minifigure count

**Figures block:** Franchise, Brand, Scale, Sealed (checkbox)

**Books block:** Series, Volume/Issue number, Author, Publisher, Language

---

## ItemsPage changes

The existing tab state (`'inventory' | 'wishlist'`) is extended to `'inventory' | 'wishlist' | 'collectibles'`. A third tab button "Collectibles" is added to the tab bar. When active, `<CollectiblesTab />` is rendered in place of the inventory/wishlist content.

---

## Out of scope

- Dashboard widget for collectibles
- AI prompt generation for collectibles
- Image upload per item
- Collection value history / tracking over time
- Import from external databases (Pokémon TCG API, Brickset, etc.)
