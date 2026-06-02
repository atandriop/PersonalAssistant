# Gift Planner — Design Spec

## Overview

A gift planner organised by person. Each person has a list of gift ideas, an optional budget, and a purchased toggle per idea. Budget tracking shows committed spend (purchased ideas) vs. the person's budget.

## Data Model

```
GiftPerson
  id        Int        @id @default(autoincrement())
  name      String
  budget    Float?
  notes     String?
  ideas     GiftIdea[]
  createdAt DateTime   @default(now())

GiftIdea
  id            Int        @id @default(autoincrement())
  giftPersonId  Int
  giftPerson    GiftPerson @relation(fields: [giftPersonId], references: [id], onDelete: Cascade)
  title         String
  occasion      String?    -- free text: "Birthday", "Christmas", etc.
  estimatedCost Float?
  purchased     Boolean    @default(false)
  notes         String?
  createdAt     DateTime   @default(now())
```

## Budget Calculation

- **Committed spend** = sum of `estimatedCost` for purchased ideas (where `purchased = true`)
- **Budget bar** = committed spend / person's budget (hidden if no budget set)

## Pages & Navigation

### `/gifts` — Main page

**Top bar:** "Gifts" heading + "+ Add person" button.

**Grid of person cards** (2 columns on desktop):
- Each card shows: person name, budget bar (if budget set), `X purchased / Y total` count
- Clicking a card expands it in-place
- Edit/Delete buttons on the card header (stop propagation)

**Expanded card content:**
- List of gift ideas, each row:
  - Toggle button: ○ (unpurchased) → ✓ green (purchased); clicking toggles `purchased` via PUT
  - Title (strikethrough if purchased)
  - Occasion badge (blue pill) if set
  - Estimated cost if set
  - Edit/Delete on hover
- Empty state: "No ideas yet."
- "+ Add idea" button at the bottom of the expanded list

### Modals

- **Add/edit person**: name (required), budget (number, optional), notes
- **Add/edit idea**: title (required), occasion (free text, optional), estimated cost (number, optional), notes

### Sidebar

Add "Gifts" entry after Maintenance in the NAV array.

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/gifts/people` | List all people with their ideas |
| POST | `/api/gifts/people` | Create person |
| PUT | `/api/gifts/people/[id]` | Update person |
| DELETE | `/api/gifts/people/[id]` | Delete person (cascades ideas) |
| POST | `/api/gifts/people/[id]/ideas` | Create idea |
| PUT | `/api/gifts/ideas/[id]` | Update idea (including purchased toggle) |
| DELETE | `/api/gifts/ideas/[id]` | Delete idea |

## Out of Scope

- Occasion-based reminders or calendar integration
- Shared lists or multi-user access
- Purchase links or price tracking
