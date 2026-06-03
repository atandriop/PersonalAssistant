'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type NavLink = { type: 'link'; href: string; label: string }
type NavSection = { type: 'section'; label: string }
type NavItem = NavLink | NavSection

const NAV: NavItem[] = [
  { type: 'section', label: 'Planning' },
  { type: 'link', href: '/', label: 'Dashboard' },
  { type: 'link', href: '/today', label: 'Today' },
  { type: 'link', href: '/weekly-review', label: 'Weekly Review' },

  { type: 'section', label: 'Productivity' },
  { type: 'link', href: '/tasks', label: 'Tasks & Gifts' },
  { type: 'link', href: '/decisions', label: 'Decisions' },
  { type: 'link', href: '/documents', label: 'Documents' },

  { type: 'section', label: 'Money' },
  { type: 'link', href: '/finance', label: 'Finance' },
  { type: 'link', href: '/wishlist', label: 'Items' },

  { type: 'section', label: 'Life' },
  { type: 'link', href: '/life', label: 'Life' },
  { type: 'link', href: '/maintenance', label: 'Maintenance' },

  { type: 'section', label: 'Explore' },
  { type: 'link', href: '/experiences', label: 'Experiences' },

  { type: 'section', label: 'Tools' },
  { type: 'link', href: '/search', label: 'Search' },
  { type: 'link', href: '/tech-radar', label: 'Tech Radar' },
  { type: 'link', href: '/system', label: 'System' },
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
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
