'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Sun, CalendarCheck, CalendarDays, CheckSquare, GitFork, FileText,
  TrendingUp, ShoppingBag, Heart, Wrench, Compass, Search, Target, Settings, FolderKanban, Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavLink = { type: 'link'; href: string; label: string; icon: LucideIcon }
type NavSection = { type: 'section'; label: string }
type NavItem = NavLink | NavSection

const NAV: NavItem[] = [
  { type: 'section', label: 'Planning' },
  { type: 'link', href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'link', href: '/today', label: 'Today', icon: Sun },
  { type: 'link', href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { type: 'link', href: '/weekly-review', label: 'Weekly Review', icon: CalendarCheck },

  { type: 'section', label: 'Productivity' },
  { type: 'link', href: '/tasks', label: 'Tasks & Gifts', icon: CheckSquare },
  { type: 'link', href: '/projects', label: 'Projects', icon: FolderKanban },
  { type: 'link', href: '/decisions', label: 'Decisions', icon: GitFork },
  { type: 'link', href: '/documents', label: 'Documents', icon: FileText },

  { type: 'section', label: 'Money' },
  { type: 'link', href: '/finance', label: 'Finance', icon: TrendingUp },
  { type: 'link', href: '/wishlist', label: 'Items', icon: ShoppingBag },

  { type: 'section', label: 'Life' },
  { type: 'link', href: '/life', label: 'Life', icon: Heart },
  { type: 'link', href: '/people', label: 'People', icon: Users },
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
