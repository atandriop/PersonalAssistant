# UX Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cut the sidebar from 20 items to ~13 items in 5 labelled groups by merging Finance/Net Worth/Subscriptions, Wishlist/Inventory (side-by-side), Experiences (Travel + Bucket List + Memories + Timeline), Life (Habits + Goals), and Tasks+Appointments+Gifts.

**Architecture:** Client-side section/tab state managed via URL search params so deep-links work. Old routes (`/net-worth`, `/subscriptions`, `/bucket-list`, `/travel`, `/memories`, `/habits`, `/goals`) render the new hub component with the matching default tab — so existing bookmarks still work. No Next.js redirects needed.

**Tech Stack:** Next.js 14 App Router, `useSearchParams` + `useRouter` for tab state, SWR, Tailwind CSS, TypeScript strict.

---

### Task 1: Finance Hub

**Merge Net Worth + Subscriptions into Finance page with pill nav: Overview | Net Worth | Subscriptions**

**Files:**
- Modify: `src/components/finance/FinancePage.tsx`
- Modify: `src/app/net-worth/page.tsx`
- Modify: `src/app/subscriptions/page.tsx`

Plan:
1. In `FinancePage`, accept an optional `defaultSection` prop (string, default `'overview'`).
2. Add a `section` state initialised from `defaultSection`. Track it in the URL via `?section=...`.
3. Add pill nav bar: Overview | Net Worth | Subscriptions.
4. When `section === 'net-worth'`, render `NetWorthPage` inline (or copy the content).
5. When `section === 'subscriptions'`, render `SubscriptionsPage` inline.
6. Update `/net-worth/page.tsx` to render `<FinancePage defaultSection="net-worth" />`.
7. Update `/subscriptions/page.tsx` to render `<FinancePage defaultSection="subscriptions" />`.

Pill nav component (add inside FinancePage, before the main content):
```tsx
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'net-worth', label: 'Net Worth' },
  { id: 'subscriptions', label: 'Subscriptions' },
] as const

// Section pill nav
<div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
  {SECTIONS.map(s => (
    <button
      key={s.id}
      onClick={() => setSection(s.id)}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
        section === s.id
          ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {s.label}
    </button>
  ))}
</div>
```

The three section contents:
- `overview` → existing Finance JSX (portfolio breakdown, subscriptions list, wishlist)
- `net-worth` → embed `<NetWorthPageContent />` (extract into a component without the page wrapper)
- `subscriptions` → embed `<SubscriptionsPageContent />` (extract into a component)

To avoid circular imports, move the logic of `NetWorthPage` into an exported function component `NetWorthContent` at the top of `NetWorthPage.tsx`, and import it in `FinancePage.tsx`.

Similarly, move `SubscriptionsPage` core JSX into `SubscriptionsContent`.

---

### Task 2: Items Side-by-Side

**Create combined Wishlist + Inventory page with two-column layout per category**

**Files:**
- Create: `src/components/items/ItemsPage.tsx`
- Modify: `src/app/wishlist/page.tsx`
- Modify: `src/app/inventory/page.tsx`
- Keep: `src/components/wishlist/WishlistPage.tsx` (still used standalone from old route logic)
- Keep: `src/components/inventory/InventoryPage.tsx`

The new `ItemsPage`:
- Shared header: "Items" title, shared search input, shared category filter, Categories button, + Add Wishlist button, + Add Inventory button
- Summary bar: Inventory total | Wishlist total | items with upgrades
- Per-category sections: each category shows a two-column grid:
  - Left: Inventory items in that category
  - Right: Wishlist items in that category
  - If an inventory item has `upgradeTarget`, draw a visual link (→ arrow badge) to the matching wishlist item
- "Purchased — pending inventory" section below (from WishlistPage)

Layout per category:
```tsx
<div key={cat.id} className="mb-6">
  <div className="flex items-center gap-2 mb-2">
    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{cat.name}</span>
  </div>
  <div className="grid grid-cols-2 gap-4">
    {/* Inventory column */}
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Inventory ({invItems.length})</p>
      {invItems.length === 0
        ? <p className="text-xs text-gray-300 dark:text-gray-600 italic">None</p>
        : invItems.map(item => <InventoryItemCard key={item.id} item={item} ... />)
      }
    </div>
    {/* Wishlist column */}
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Wishlist ({wishItems.length})</p>
      {wishItems.length === 0
        ? <p className="text-xs text-gray-300 dark:text-gray-600 italic">None</p>
        : wishItems.map(item => <WishlistItemCard key={item.id} item={item} ... />)
      }
    </div>
  </div>
</div>
```

Upgrade visual: on inventory item cards, if `upgradeTarget` exists, show an amber badge with "→ {upgradeTarget.name}". On wishlist item cards, if `inventoryUpgrades.length > 0`, show a purple badge "Upgrade for: {name}".

Both `/wishlist/page.tsx` and `/inventory/page.tsx` should render `<ItemsPage />`.

---

### Task 3: Experiences Hub

**Merge Travel + Bucket List + Memories + Timeline into /experiences**

**Files:**
- Create: `src/components/experiences/ExperiencesPage.tsx`
- Create: `src/app/experiences/page.tsx`
- Modify: `src/app/travel/page.tsx`
- Modify: `src/app/bucket-list/page.tsx`
- Modify: `src/app/memories/page.tsx`
- Modify: `src/app/timeline/page.tsx`

`ExperiencesPage` receives an optional `defaultTab` prop (`'travel' | 'bucket-list' | 'memories' | 'timeline'`, default `'travel'`).

Tab bar using URL params (`?tab=...`):
```tsx
const TABS = [
  { id: 'travel', label: 'Travel' },
  { id: 'bucket-list', label: 'Bucket List' },
  { id: 'memories', label: 'Memories' },
  { id: 'timeline', label: 'Timeline' },
] as const
```

Each tab renders the existing page component (import TravelPage, BucketListPage, MemoriesPage, TimelinePage directly and render them inside the tab content area). Remove the `<h1>` from each sub-page since ExperiencesPage has the header.

Actually, keep the h1 inside each sub-page since they have their own layout. The tab switcher just replaces the page-level navigation.

Old page files:
```typescript
// src/app/travel/page.tsx
import ExperiencesPage from '@/components/experiences/ExperiencesPage'
export default function Page() { return <ExperiencesPage defaultTab="travel" /> }
```

New route:
```typescript
// src/app/experiences/page.tsx
import ExperiencesPage from '@/components/experiences/ExperiencesPage'
export default function Page() { return <ExperiencesPage /> }
```

---

### Task 4: Life Hub

**Merge Habits + Goals into /life with Goals | Habits pill tabs**

**Files:**
- Create: `src/components/life/LifePage.tsx`
- Create: `src/app/life/page.tsx`
- Modify: `src/app/habits/page.tsx`
- Modify: `src/app/goals/page.tsx`

`LifePage` receives optional `defaultTab: 'goals' | 'habits'` (default `'goals'`).

Pill tab nav (same style as Finance hub). Each tab renders the existing GoalsPage / HabitsPage component.

Old page files render `<LifePage defaultTab="habits" />` or `<LifePage defaultTab="goals" />`.

---

### Task 5: Tasks with Appointments Inline + Gifts Tab

**Replace task tab navigation: Tasks content is primary, Appointments is a section below, Gifts is a third tab**

**Files:**
- Modify: `src/components/tasks/TasksPage.tsx`
- Keep: `src/components/tasks/TasksTab.tsx`
- Keep: `src/components/tasks/AppointmentsTab.tsx`
- Keep: `src/components/gifts/GiftsPage.tsx`

New TasksPage structure:
- Remove `useSearchParams` tab navigation
- Render `<TasksTab />` directly as the main content (it manages its own tasks)
- Below tasks, add a collapsible "Appointments" section rendered inline (AppointmentsTab content without the wrapper)
- Add a third tab "Gifts" that shows GiftsPage content

Actually, given that Gifts has a complex UI (people → ideas), it works better as a tab than as an inline section. Here's the revised structure:

Top-level tabs: Tasks | Gifts  
No separate Appointments tab — instead, AppointmentsTab becomes a section within the Tasks tab (below the tasks list).

```tsx
// In TasksPage
const [tab, setTab] = useState<'tasks' | 'gifts'>('tasks')

// Tab bar
<div className="flex gap-1 mb-6">
  {['tasks', 'gifts'].map(t => (
    <button key={t} onClick={() => setTab(t as 'tasks' | 'gifts')} className={tabCls(t === tab)}>
      {t.charAt(0).toUpperCase() + t.slice(1)}
    </button>
  ))}
</div>

{tab === 'tasks' && (
  <>
    <TasksTab />
    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Appointments</h2>
      <AppointmentsTab />
    </div>
  </>
)}
{tab === 'gifts' && <GiftsPage />}
```

---

### Task 6: Sidebar Restructure

**Update sidebar with section headers and new nav entries**

**Files:**
- Modify: `src/components/Sidebar.tsx`

New NAV structure with section labels:

```typescript
type NavItem =
  | { type: 'link'; href: string; label: string }
  | { type: 'section'; label: string }

const NAV: NavItem[] = [
  { type: 'section', label: 'PLANNING' },
  { type: 'link', href: '/', label: 'Dashboard' },
  { type: 'link', href: '/weekly-review', label: 'Weekly Review' },

  { type: 'section', label: 'PRODUCTIVITY' },
  { type: 'link', href: '/tasks', label: 'Tasks & Gifts' },
  { type: 'link', href: '/decisions', label: 'Decisions' },
  { type: 'link', href: '/documents', label: 'Documents' },

  { type: 'section', label: 'MONEY' },
  { type: 'link', href: '/finance', label: 'Finance' },
  { type: 'link', href: '/wishlist', label: 'Items' },

  { type: 'section', label: 'LIFE' },
  { type: 'link', href: '/life', label: 'Life' },
  { type: 'link', href: '/maintenance', label: 'Maintenance' },

  { type: 'section', label: 'EXPLORE' },
  { type: 'link', href: '/experiences', label: 'Experiences' },

  { type: 'section', label: 'TOOLS' },
  { type: 'link', href: '/search', label: 'Search' },
  { type: 'link', href: '/tech-radar', label: 'Tech Radar' },
  { type: 'link', href: '/system', label: 'System' },
]
```

Section headers render as muted uppercase labels with a top margin:
```tsx
<p className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
  {item.label}
</p>
```

Also update the active-link detection: a link is active if `pathname === href || pathname.startsWith(href + '/')` (except `/` which is exact match only).

---

### Final Verification

```bash
npx tsc --noEmit
```

All pages should render their content in the correct hub. Old routes still work (bookmarks not broken).
