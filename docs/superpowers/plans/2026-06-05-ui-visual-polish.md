# UI Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add icons to the sidebar and apply color-coded visual accents to the Today page and Dashboard widgets.

**Architecture:** Three independent file changes. Sidebar gets lucide-react icons and a new active state. TodayPage replaces its plain `SectionHeader` with a `ColoredSectionHeader` and adds colored left borders per card. DashboardPage's `WidgetCard` gains optional `icon` and `accentColor` props used by every widget call site.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, lucide-react (new dependency)

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add `lucide-react` |
| `src/components/Sidebar.tsx` | Add icons to `NavLink` type and render, new active state |
| `src/components/today/TodayPage.tsx` | New `ColoredSectionHeader`, colored left borders on all cards |
| `src/components/dashboard/DashboardPage.tsx` | `WidgetCard` gains `icon` + `accentColor` props, all widget sites updated |

---

## Task 1: Install lucide-react

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd /home/than/PersonalAssistant && npm install lucide-react
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify it's in package.json**

```bash
grep lucide package.json
```

Expected: `"lucide-react": "^X.X.X"` in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add lucide-react"
```

---

## Task 2: Sidebar — Icons + New Active State

**Files:**
- Modify: `src/components/Sidebar.tsx`

**What changes:**
- `NavLink` type gains an `icon: LucideIcon` field
- Every link in the `NAV` array gets its icon
- The render loop shows `<Icon>` before the label
- Active state changes from a light tint to solid blue fill + colored left border

- [ ] **Step 1: Replace the full contents of `src/components/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Sun, CalendarCheck, CheckSquare, GitFork, FileText,
  TrendingUp, ShoppingBag, Heart, Wrench, Compass, Search, Target, Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavLink = { type: 'link'; href: string; label: string; icon: LucideIcon }
type NavSection = { type: 'section'; label: string }
type NavItem = NavLink | NavSection

const NAV: NavItem[] = [
  { type: 'section', label: 'Planning' },
  { type: 'link', href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'link', href: '/today', label: 'Today', icon: Sun },
  { type: 'link', href: '/weekly-review', label: 'Weekly Review', icon: CalendarCheck },

  { type: 'section', label: 'Productivity' },
  { type: 'link', href: '/tasks', label: 'Tasks & Gifts', icon: CheckSquare },
  { type: 'link', href: '/decisions', label: 'Decisions', icon: GitFork },
  { type: 'link', href: '/documents', label: 'Documents', icon: FileText },

  { type: 'section', label: 'Money' },
  { type: 'link', href: '/finance', label: 'Finance', icon: TrendingUp },
  { type: 'link', href: '/wishlist', label: 'Items', icon: ShoppingBag },

  { type: 'section', label: 'Life' },
  { type: 'link', href: '/life', label: 'Life', icon: Heart },
  { type: 'link', href: '/maintenance', label: 'Maintenance', icon: Wrench },

  { type: 'section', label: 'Explore' },
  { type: 'link', href: '/experiences', label: 'Experiences', icon: Compass },

  { type: 'section', label: 'Tools' },
  { type: 'link', href: '/search', label: 'Search', icon: Search },
  { type: 'link', href: '/tech-radar', label: 'Tech Radar', icon: Target },
  { type: 'link', href: '/system', label: 'System', icon: Settings },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar() {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored !== 'light') {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <span className="font-bold text-gray-900 dark:text-white text-lg">Homebase</span>
      </div>
      <nav className="flex-1 py-2 flex flex-col overflow-y-auto px-2">
        {NAV.map((item, i) => {
          if (item.type === 'section') {
            return (
              <p key={i} className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                {item.label}
              </p>
            )
          }
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              style={active ? { borderLeft: '3px solid #60a5fa', paddingLeft: '9px' } : undefined}
              className={`py-2 pr-3 rounded-md text-sm font-medium transition-colors flex items-center gap-2.5 ${
                active
                  ? 'bg-blue-700 dark:bg-blue-700 text-white'
                  : 'pl-3 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Icon
                size={15}
                className={active ? 'text-white shrink-0' : 'text-gray-500 dark:text-gray-500 shrink-0'}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleDark}
          className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-left"
        >
          {dark ? '☀ Light mode' : '☾ Dark mode'}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add icons to sidebar, solid blue active state with left border"
```

---

## Task 3: Today Page — ColoredSectionHeader + Colored Card Borders

**Files:**
- Modify: `src/components/today/TodayPage.tsx`

**What changes:**
- Old `SectionHeader` component removed
- New `ColoredSectionHeader` added: renders a small lucide icon + colored title
- Each of the 6 section card `div`s gains a colored left border via inline style

Color map:
| Section | Color hex |
|---------|-----------|
| Habits | `#f59e0b` |
| Overdue | `#ef4444` |
| Today's Appointments | `#3b82f6` |
| Upcoming Renewals | `#f97316` |
| Pending Gifts | `#a855f7` |
| Due Today | `#6366f1` |

- [ ] **Step 1: Add imports at the top of `src/components/today/TodayPage.tsx`**

Replace the existing import block (lines 1–5):

```tsx
'use client'

import { type ReactNode } from 'react'
import useSWR from 'swr'
import type { Task, Appointment } from '@/types'
import { Activity, AlertCircle, Calendar, RefreshCw, Gift, CheckSquare } from 'lucide-react'
```

- [ ] **Step 2: Replace the `SectionHeader` component with `ColoredSectionHeader`**

Remove this (lines 25–31):

```tsx
function SectionHeader({ title, count, color }: { title: string; count?: number; color?: string }) {
  return (
    <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${color ?? 'text-gray-500 dark:text-gray-400'}`}>
      {title}{count !== undefined ? ` (${count})` : ''}
    </h2>
  )
}
```

Add this in its place:

```tsx
function ColoredSectionHeader({ icon, color, title, count }: {
  icon: ReactNode
  color: string
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {title}{count !== undefined ? ` — ${count}` : ''}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Update the Habits card**

Find the Habits card div (starts with `<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">` that wraps the `SectionHeader title="Habits"`) and replace it:

Change the opening div:
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
  style={{ borderLeft: '3px solid #f59e0b' }}>
```

Change the `SectionHeader` inside it:
```tsx
<ColoredSectionHeader
  icon={<Activity size={13} strokeWidth={2.5} color="#f59e0b" />}
  color="#f59e0b"
  title="Habits"
  count={habits.length > 0 ? doneCount : undefined}
/>
```

- [ ] **Step 4: Update the Upcoming Renewals card**

Change the opening div:
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
  style={{ borderLeft: '3px solid #f97316' }}>
```

Change the `SectionHeader` inside it:
```tsx
<ColoredSectionHeader
  icon={<RefreshCw size={13} strokeWidth={2.5} color="#f97316" />}
  color="#f97316"
  title="Upcoming Renewals"
  count={upcomingRenewals.length}
/>
```

- [ ] **Step 5: Update the Pending Gifts card**

Change the opening div:
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
  style={{ borderLeft: '3px solid #a855f7' }}>
```

Change the `SectionHeader` inside it:
```tsx
<ColoredSectionHeader
  icon={<Gift size={13} strokeWidth={2.5} color="#a855f7" />}
  color="#a855f7"
  title="Pending Gifts"
  count={pendingGiftPeople.length}
/>
```

- [ ] **Step 6: Update the Today's Appointments card**

The existing card already has a blue border — change it to use the inline style approach for consistency:

Change the opening div from:
```tsx
<div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
```
To:
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
  style={{ borderLeft: '3px solid #3b82f6' }}>
```

Change the `SectionHeader` inside it:
```tsx
<ColoredSectionHeader
  icon={<Calendar size={13} strokeWidth={2.5} color="#3b82f6" />}
  color="#3b82f6"
  title="Today's Appointments"
  count={todayAppts.length}
/>
```

- [ ] **Step 7: Update the Overdue card**

Change the opening div from:
```tsx
<div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
```
To:
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
  style={{ borderLeft: '3px solid #ef4444' }}>
```

Change the `SectionHeader` inside it:
```tsx
<ColoredSectionHeader
  icon={<AlertCircle size={13} strokeWidth={2.5} color="#ef4444" />}
  color="#ef4444"
  title="Overdue"
  count={overdueTasks.length}
/>
```

- [ ] **Step 8: Update the Due Today card**

Change the opening div:
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4"
  style={{ borderLeft: '3px solid #6366f1' }}>
```

Change the `SectionHeader` inside it:
```tsx
<ColoredSectionHeader
  icon={<CheckSquare size={13} strokeWidth={2.5} color="#6366f1" />}
  color="#6366f1"
  title="Due Today"
  count={todayTasks.length}
/>
```

- [ ] **Step 9: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/today/TodayPage.tsx
git commit -m "feat: color-coded section cards with icons in Today page"
```

---

## Task 4: Dashboard — WidgetCard with Icon + AccentColor Props

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

**What changes:**
- `WidgetCard` gains optional `icon: React.ReactNode` and `accentColor: string` props
- Title renders in `accentColor` (overrides gray default) with the icon inline
- A `maintenanceAccentColor` variable derives the right color from `worstMaintenance`
- Every `<WidgetCard>` call site passes the appropriate icon and hex color

Icon + color assignments:

| Widget | Icon | Color |
|--------|------|-------|
| Habits Today | `Activity` | `#f59e0b` |
| Maintenance | `Wrench` | dynamic (see below) |
| Goals | `Target` | `#10b981` |
| Gifts | `Gift` | `#a855f7` |
| Upcoming Appointments | `Calendar` | `#3b82f6` |
| Overdue Tasks | `AlertCircle` | `#ef4444` |
| On This Day | `Clock` | `#f43f5e` |
| Subscriptions Renewing | `RefreshCw` | `#f97316` |
| Travel | `Compass` | `#14b8a6` |
| Memories | `Heart` | `#8b5cf6` |
| Bucket List | `Map` | `#0ea5e9` |
| Expiring Documents | `FileWarning` | `#eab308` |

Maintenance accent color logic:
```tsx
const maintenanceAccentColor =
  worstMaintenance === 'overdue' ? '#f87171'
  : worstMaintenance === 'due-soon' ? '#fbbf24'
  : '#34d399'
```

- [ ] **Step 1: Add lucide-react imports to `DashboardPage.tsx`**

At the top of the file, after the existing imports, add:

```tsx
import {
  Activity, Wrench, Target, Gift, Calendar, AlertCircle,
  Clock, RefreshCw, Compass, Heart, Map, FileWarning,
} from 'lucide-react'
```

- [ ] **Step 2: Update the `WidgetCard` component**

Replace the existing `WidgetCard` function (lines 120–137):

```tsx
function WidgetCard({ title, icon, accentColor, borderStyle, action, children }: {
  title: string
  icon?: React.ReactNode
  accentColor?: string
  borderStyle?: React.CSSProperties
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border rounded-xl p-4" style={borderStyle ?? {}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <h3
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: accentColor ?? undefined }}
          >
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Add `maintenanceAccentColor` variable**

After the existing `maintenanceBorder` declaration (around line 213), add:

```tsx
const maintenanceAccentColor =
  worstMaintenance === 'overdue' ? '#f87171'
  : worstMaintenance === 'due-soon' ? '#fbbf24'
  : '#34d399'
```

- [ ] **Step 4: Update all `WidgetCard` call sites**

Find each `<WidgetCard title="...">` in the JSX (inside the `grid` div) and add `icon` and `accentColor` props:

**Habits Today:**
```tsx
<WidgetCard
  title="Habits Today"
  icon={<Activity size={13} strokeWidth={2.5} color="#f59e0b" />}
  accentColor="#f59e0b"
>
```

**Maintenance:**
```tsx
<WidgetCard
  title="Maintenance"
  icon={<Wrench size={13} strokeWidth={2.5} color={maintenanceAccentColor} />}
  accentColor={maintenanceAccentColor}
  borderStyle={maintenanceBorder}
>
```

**Goals:**
```tsx
<WidgetCard
  title="Goals"
  icon={<Target size={13} strokeWidth={2.5} color="#10b981" />}
  accentColor="#10b981"
>
```

**Gifts:**
```tsx
<WidgetCard
  title="Gifts"
  icon={<Gift size={13} strokeWidth={2.5} color="#a855f7" />}
  accentColor="#a855f7"
  action={<button onClick={() => setShowAddPerson(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add person</button>}
>
```

**Upcoming Appointments:**
```tsx
<WidgetCard
  title="Upcoming Appointments"
  icon={<Calendar size={13} strokeWidth={2.5} color="#3b82f6" />}
  accentColor="#3b82f6"
  action={<button onClick={() => setShowAddAppt(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add</button>}
>
```

**Overdue Tasks** (keep existing dynamic `borderStyle` — it turns the full card border red when tasks exist):
```tsx
<WidgetCard
  title="Overdue Tasks"
  icon={<AlertCircle size={13} strokeWidth={2.5} color="#ef4444" />}
  accentColor="#ef4444"
  borderStyle={overdueTasks.length > 0 ? { borderColor: '#f87171' } : {}}
>
```

**On This Day:**
```tsx
<WidgetCard
  title="On This Day"
  icon={<Clock size={13} strokeWidth={2.5} color="#f43f5e" />}
  accentColor="#f43f5e"
>
```

**Subscriptions Renewing:**
```tsx
<WidgetCard
  title="Subscriptions Renewing"
  icon={<RefreshCw size={13} strokeWidth={2.5} color="#f97316" />}
  accentColor="#f97316"
>
```

**Travel:**
```tsx
<WidgetCard
  title="Travel"
  icon={<Compass size={13} strokeWidth={2.5} color="#14b8a6" />}
  accentColor="#14b8a6"
  action={<button onClick={() => setShowAddTrip(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Add trip</button>}
>
```

**Memories:**
```tsx
<WidgetCard
  title="Memories"
  icon={<Heart size={13} strokeWidth={2.5} color="#8b5cf6" />}
  accentColor="#8b5cf6"
>
```

**Bucket List:**
```tsx
<WidgetCard
  title="Bucket List"
  icon={<Map size={13} strokeWidth={2.5} color="#0ea5e9" />}
  accentColor="#0ea5e9"
>
```

**Expiring Documents:**
```tsx
<WidgetCard
  title="Expiring Documents"
  icon={<FileWarning size={13} strokeWidth={2.5} color="#eab308" />}
  accentColor="#eab308"
>
```

- [ ] **Step 5: Type-check**

```bash
cd /home/than/PersonalAssistant && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: colored icon + accent title per widget in Dashboard"
```

---

## Verification

After all tasks are committed:

- [ ] Start the dev server: `npm run dev`
- [ ] Open the app and navigate to each changed page:
  - Sidebar: every link has an icon; active link is solid blue with a left border
  - Today page (`/today`): each section card has a colored left border and a colored icon + title
  - Dashboard (`/`): each widget title is colored with a matching icon; Maintenance icon/title color changes based on status
