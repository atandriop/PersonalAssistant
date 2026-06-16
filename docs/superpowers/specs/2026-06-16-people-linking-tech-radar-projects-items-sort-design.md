# Design: People Linking, Projects in Tech Radar, Items Sort Direction

**Date:** 2026-06-16

## Overview

Three independent features:
1. Link GiftPerson and Companion records to People entries via FK
2. Add `project` as a category in Tech Radar
3. Toggle sort direction (asc/desc) on Items page

---

## Feature 1: People Linking (FK + Click-through)

### Problem

`GiftPerson` (gifts module) and `Companion` (travel module) are independent name-string records. If someone like "Marialena" exists in both, there is no connection to her `Person` entry in the People module. The People page uses fragile name-matching to show gift/travel badges.

### Schema Changes

Add optional `personId` FK to both tables:

```prisma
model GiftPerson {
  ...
  personId  Int?
  person    Person? @relation("GiftPersonPerson", fields: [personId], references: [id], onDelete: SetNull)
}

model Companion {
  ...
  personId  Int?
  person    Person? @relation("CompanionPerson", fields: [personId], references: [id], onDelete: SetNull)
}

model Person {
  ...
  giftPeople  GiftPerson[] @relation("GiftPersonPerson")
  companions  Companion[]  @relation("CompanionPerson")
}
```

Requires one Prisma migration.

### Gifts Page Changes

Each gift person row gets a person-link control in the header row (next to Edit/Del buttons):
- **Linked**: Shows a small person icon (clickable) that navigates to `/people?highlight=<personId>`
- **Unlinked**: Shows a greyed person icon with tooltip "Link to People entry". Clicking opens a `<select>` or Combobox populated from `/api/people`, allowing the user to pick (or clear) the link. Saving sends a `PATCH /api/gifts/people/:id` with `{ personId }`.

### Travel Page Changes

Same pattern on the Companions section — each companion chip/card shows a link icon. Linked = navigates to people. Unlinked = dropdown to pick.

### People Page Changes

Switch the existing badge detection from name-matching to ID-matching. The `/api/people` response already fetches `companions` and `giftPeople` separately; update those API calls (or the People API itself) to return `personId` so matching uses ID instead of lowercased name comparison.

Alternatively: keep name-matching as fallback for unlinked records, add ID-match as primary. This handles both linked and unlinked companions in one pass.

### API Changes

- `PUT /api/gifts/people/:id` — already exists, add `personId` to accepted body
- `PUT /api/companions/:id` (may need creating) — accept `{ personId }`
- `/api/people` — no change needed if People page fetches companions/giftPeople separately

---

## Feature 2: Projects as Tech Radar Category

### Change

Add `'project'` to the `CATEGORIES` constant in [TechRadarPage.tsx](src/components/techradar/TechRadarPage.tsx):

```ts
const CATEGORIES = ['language', 'framework', 'tool', 'platform', 'project'] as const
```

Add color to `CAT_COLOR`:
```ts
project: '#8b5cf6',  // violet
```

No schema migration required — `category` is stored as a plain string.

### Semantics

Tech Radar project entries represent **initiatives being evaluated or pursued**, not task-based project management. Examples: a side-project idea in `assess`, an active side-project in `trial`, a shipped personal product in `adopt`. These are separate from the Projects page (which is task/milestone-oriented).

No auto-migration from the Projects page.

---

## Feature 3: Items Sort Direction Toggle

### Current Behavior

Wishlist sorts: `priority | name | cost` (buttons, single direction)
Inventory sorts: `name | cost` (buttons, single direction)

### New Behavior

Clicking the **active** sort button toggles direction between ascending and descending. Clicking an inactive sort button switches to that sort (always starts ascending).

Button label shows a `↑` or `↓` suffix when active: e.g. `Name ↑`, `Name ↓`.

### Sort Semantics

| Field    | Ascending        | Descending       |
|----------|------------------|------------------|
| priority | High → Med → Low | Low → Med → High |
| name     | A → Z            | Z → A            |
| cost     | Low → High       | High → Low       |

### State

```ts
const [sortWishDir, setSortWishDir] = useState<'asc' | 'desc'>('asc')
const [sortInvDir, setSortInvDir] = useState<'asc' | 'desc'>('asc')
```

Toggle logic: clicking active button flips direction; clicking new button sets field + resets direction to `'asc'`.

---

## Out of Scope

- Auto-creating People entries from Gift/Companion records
- Merging the Projects page into Tech Radar
- Sorting within the bulk editor
