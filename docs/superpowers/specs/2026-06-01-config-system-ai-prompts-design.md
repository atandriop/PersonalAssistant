# Config, System Page, AI Prompts & Weekly Review — Design Spec

**Date:** 2026-06-01
**Status:** Approved

---

## Overview

Four additions to the personal assistant app:

1. **Config system** — a `config.json` file at the project root, readable and writable via the UI
2. **System page** — system stats, config editor, and server restart/shutdown controls
3. **AI Prompt generators** — "Generate AI Prompt" buttons on Matrices, Wishlist, and Portfolio pages, each opening a preview modal
4. **Weekly Review page** — auto-populated weekly data summary + freetext notes + AI prompt generator

---

## Sidebar

Two new entries added to the NAV array in `Sidebar.tsx`:

```
Wishlist | Inventory | Matrices | Portfolio | Trends | Weekly Review | System
```

Both set to `active: true`. No disabled entries remain.

---

## Config System

### `config.json` (project root)

Initial content:

```json
{
  "port": 3000
}
```

Extensible — new keys can be added here as the app grows.

### `src/lib/config.ts`

Server-side only. Two exported functions:

- `readConfig(): Config` — synchronous `fs.readFileSync` + `JSON.parse`
- `writeConfig(partial: Partial<Config>): Config` — deep merge with current config, `fs.writeFileSync`, returns merged result

`Config` type:

```ts
interface Config {
  port: number
}
```

### API routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/config` | Returns full config object |
| PUT | `/api/config` | Accepts partial update, merges, writes back, returns new config |

No schema validation beyond TypeScript types — the UI controls input types.

---

## System Page

**Route:** `/system`
**Files:** `src/components/system/SystemPage.tsx`, `src/app/system/page.tsx`

### Three panels

**1. System Info**

`GET /api/system` returns:

```ts
{
  totalMem: number       // os.totalmem() in bytes
  freeMem: number        // os.freemem() in bytes
  usedMem: number        // totalMem - freeMem
  uptimeSeconds: number  // os.uptime()
  nodeVersion: string    // process.version
  platform: string       // process.platform
}
```

Displayed as a stat grid. SWR `refreshInterval: 10000` (auto-refresh every 10s).

**2. Config Editor**

Fetches `GET /api/config`. Each config key rendered as a labelled row:

| Field | Label | Description shown in UI |
|---|---|---|
| `port` | Port | The port the app runs on. Restart required for changes to take effect. |

Inputs are editable inline. A single **Save** button sends `PUT /api/config`. Port field shows a small note: *"Restart required for port changes to take effect."*

**3. Server Controls**

Two buttons:

- **Restart** — `confirm("Restart the server?")` → `POST /api/system/restart` → runs `systemctl --user restart personal-assistant` via `child_process.exec`
- **Shutdown** — `confirm("Shut down the server? You will need to start it manually.")` → `POST /api/system/shutdown` → runs `systemctl --user stop personal-assistant`

After clicking Shutdown, the UI shows "Server is shutting down…" since the HTTP response may not return.

### API routes

| Method | Path | Action |
|---|---|---|
| GET | `/api/system` | Returns system stats from `os` + `process` |
| POST | `/api/system/restart` | `exec('systemctl --user restart personal-assistant')` |
| POST | `/api/system/shutdown` | `exec('systemctl --user stop personal-assistant')` |

---

## AI Prompt Features

### Shared component: `src/components/ui/PromptModal.tsx`

Props: `{ title: string; prompt: string; onClose: () => void }`

Renders:
- Title bar with close button (same pattern as existing `Modal.tsx`)
- Read-only `<textarea>` showing the formatted prompt (full width, ~10 rows)
- **Copy to clipboard** button — copies `prompt` text, shows "Copied!" confirmation for 2 seconds
- Close button

### 1. Decision Matrix AI Brief

**Location:** `MatricesPage.tsx` — button appears when a matrix is selected, next to the Delete button in the matrix selector row.

**Button label:** "AI Brief"

**Prompt format:**

```
I'm evaluating options using a weighted decision matrix.

Criteria and weights:
[criterion name] — [weight]%
...

Options with scores (0–10 per criterion):
[option name]: [criterion] = [score], [criterion] = [score], ...
...

Weighted results (higher is better, max 10):
1. [option] — [score]
2. [option] — [score]
...

Please analyse my scoring. Identify potential biases, flag criteria that may be under/over-weighted relative to their importance, and suggest whether the top-ranked option is clearly the right choice or if the decision is too close to call.
```

Uses the matrix data already loaded in SWR state (`criteria`, `options`, `scores`).

### 2. Wishlist Priority Prompt

**Location:** `WishlistPage.tsx` — button in the header row, next to "Categories" and "+ Add item".

**Button label:** "AI Prompt"

**Prompt format:**

```
Here is my current wishlist (unpurchased items only), grouped by priority:

HIGH PRIORITY:
- [name] — €[cost]
...

MEDIUM PRIORITY:
- [name] — €[cost]
...

LOW PRIORITY:
- [name] — €[cost]
...

Total wishlist value: €[total]

Given typical budget constraints, suggest a sensible purchase order. Flag any items that seem overpriced relative to their priority, and identify any obvious quick wins (low cost, high priority).
```

Uses the active (unpurchased) wishlist items already in SWR state.

### 3. Portfolio Health Check Prompt

**Location:** `PortfolioPage.tsx` — button in the header row, next to "+ Add holding".

**Button label:** "AI Prompt"

**Prompt format:**

```
Here is my current investment portfolio:

[TYPE — name]: value €[X], [P&L: +/−€Y] (for non-savings)
[TYPE — name]: balance €[X], [interest rate Z%] (for savings)
...

Summary:
- Total portfolio value: €[X]
- Total P&L (non-savings): [+/−]€[Y] ([%])
- Breakdown by type: stocks €[X], crypto €[X], savings €[X], other €[X]

Please analyse this portfolio. Identify concentration risk, comment on the balance between asset types, flag any significant unrealised losses, and suggest 2-3 rebalancing considerations.
```

Uses holdings already in SWR state.

---

## Weekly Review Page

**Route:** `/weekly-review`
**Files:** `src/components/weeklyreview/WeeklyReviewPage.tsx`, `src/app/weekly-review/page.tsx`

### Layout

Two-column layout on wider screens, stacked on narrow:
- **Left/top:** auto-populated weekly data
- **Right/bottom:** freetext notes area

### Auto-populated data

`GET /api/weekly-review` queries the last 7 days (from `new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`):

| Data | Source |
|---|---|
| Wishlist items added | `WishlistItem.createdAt >= 7daysAgo` |
| Inventory items added | `InventoryItem.createdAt >= 7daysAgo` |
| Portfolio holdings added | `PortfolioHolding.createdAt >= 7daysAgo` |
| Snapshot delta | Latest snapshot vs snapshot from ~7 days ago (if available) |

Displayed as compact labelled sections with item lists and totals.

### Notes

A `<textarea>` persisted in `localStorage` with key `weekly-review-notes-[YYYY-WW]` (ISO week). Notes auto-clear at the start of a new week. Placeholder: *"What happened this week? What's on your mind?"*

### AI Prompt

Button: **"Generate Weekly Prompt"** — opens `PromptModal` with:

```
Weekly review — week of [date range]

WISHLIST ([N] items added, €[total]):
- [name] — €[cost], [priority]
...

INVENTORY ([N] items added):
- [name] — €[cost]
...

PORTFOLIO ([N] holdings added/updated):
- [name] ([type]): €[value] [P&L if applicable]
...

PORTFOLIO DELTA: [+/−€X] vs 7 days ago (if available)

MY NOTES:
[freetext notes content]

Please identify patterns in this week's activity, flag anything I should follow up on, and suggest 2-3 priorities for next week.
```

---

## File Map

| File | Action |
|---|---|
| `config.json` | Create — project root |
| `src/lib/config.ts` | Create — readConfig / writeConfig |
| `src/app/api/config/route.ts` | Create — GET, PUT |
| `src/app/api/system/route.ts` | Create — GET stats |
| `src/app/api/system/restart/route.ts` | Create — POST restart |
| `src/app/api/system/shutdown/route.ts` | Create — POST shutdown |
| `src/app/api/weekly-review/route.ts` | Create — GET weekly data |
| `src/components/system/SystemPage.tsx` | Create |
| `src/app/system/page.tsx` | Create |
| `src/components/weeklyreview/WeeklyReviewPage.tsx` | Create |
| `src/app/weekly-review/page.tsx` | Create |
| `src/components/ui/PromptModal.tsx` | Create |
| `src/components/Sidebar.tsx` | Modify — add Weekly Review + System |
| `src/components/matrices/MatricesPage.tsx` | Modify — add AI Brief button |
| `src/components/wishlist/WishlistPage.tsx` | Modify — add AI Prompt button |
| `src/components/portfolio/PortfolioPage.tsx` | Modify — add AI Prompt button |
