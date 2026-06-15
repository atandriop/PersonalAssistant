# People → Companion & Gift Person Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show link badges on Person cards in PeoplePage when a matching name exists in Companions (travel buddies) or GiftPeople (gift planning). Matching is case-insensitive name comparison, client-side only.

**Architecture:** Pure frontend change to `PeoplePage.tsx`. Fetch `/api/companions` and `/api/gifts/people` alongside the existing `/api/people` SWR. Compute two Sets of lowercase names from each. For each Person card, check membership; show clickable badges linking to `/travel` and `/gifts` respectively. No schema changes.

**Data shapes:**
- `GET /api/companions` → `{ id: number; name: string }[]`
- `GET /api/gifts/people` → `{ id: number; name: string; budget: number | null; notes: string | null; ideas: unknown[] }[]`

**Tech Stack:** React, SWR, Tailwind CSS, Lucide React icons (Gift, Plane already available)

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/components/people/PeoplePage.tsx` |

---

### Task 1: Add companion and gift person link badges to person cards

**Files:**
- Modify: `src/components/people/PeoplePage.tsx`

- [ ] **Step 1: Add SWR fetches for companions and gift people**

At the top of `PeoplePage` (after the existing `useSWR` call for `/api/people`, around line 24):

```typescript
  const { data: companions = [] } = useSWR<{ id: number; name: string }[]>('/api/companions', fetcher)
  const { data: giftPeople = [] } = useSWR<{ id: number; name: string }[]>('/api/gifts/people', fetcher)
```

- [ ] **Step 2: Compute name-match Sets**

After the two SWR calls above, add:

```typescript
  const companionNames = new Set(companions.map(c => c.name.toLowerCase()))
  const giftNames = new Set(giftPeople.map(g => g.name.toLowerCase()))
```

- [ ] **Step 3: Add Gift and Plane icon imports**

Current import line (line 9):
```typescript
import { Plus, Pencil, Trash2, Cake, Phone, Mail, Calendar } from 'lucide-react'
```

Replace with:
```typescript
import { Plus, Pencil, Trash2, Cake, Phone, Mail, Calendar, Gift, Plane } from 'lucide-react'
```

- [ ] **Step 4: Compute match flags per card and add badges**

Inside the `filtered.map(p => { ... })` callback, after the existing `birthdayLabel` computation (around line 66), add:

```typescript
          const isCompanion = companionNames.has(p.name.toLowerCase())
          const isGiftPerson = giftNames.has(p.name.toLowerCase())
```

Then in the card's name+badges row (around line 74–85), after the existing `birthdayLabel` span, add:

```tsx
                  {isGiftPerson && (
                    <a
                      href="/gifts"
                      className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 flex items-center gap-1 hover:bg-pink-200 dark:hover:bg-pink-900/50"
                    >
                      <Gift size={10} /> Gift list
                    </a>
                  )}
                  {isCompanion && (
                    <a
                      href="/travel"
                      className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 flex items-center gap-1 hover:bg-sky-200 dark:hover:bg-sky-900/50"
                    >
                      <Plane size={10} /> Travel buddy
                    </a>
                  )}
```

The full badge row after the edit should look like:

```tsx
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                  {p.relationship && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATIONSHIP_COLOR[p.relationship] ?? RELATIONSHIP_COLOR.Other}`}>
                      {p.relationship}
                    </span>
                  )}
                  {birthdayLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 flex items-center gap-1">
                      <Cake size={10} /> {birthdayLabel}
                    </span>
                  )}
                  {isGiftPerson && (
                    <a
                      href="/gifts"
                      className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 flex items-center gap-1 hover:bg-pink-200 dark:hover:bg-pink-900/50"
                    >
                      <Gift size={10} /> Gift list
                    </a>
                  )}
                  {isCompanion && (
                    <a
                      href="/travel"
                      className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 flex items-center gap-1 hover:bg-sky-200 dark:hover:bg-sky-900/50"
                    >
                      <Plane size={10} /> Travel buddy
                    </a>
                  )}
                </div>
```

- [ ] **Step 5: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | grep -v "search/route\|WorldMap"
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/people/PeoplePage.tsx
git commit -m "feat: show gift list and travel buddy badges on person cards"
```
