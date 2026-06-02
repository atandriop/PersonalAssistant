'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/', label: 'Dashboard', active: true },
  { href: '/wishlist', label: 'Wishlist', active: true },
  { href: '/inventory', label: 'Inventory', active: true },
  { href: '/matrices', label: 'Matrices', active: true },
  { href: '/portfolio', label: 'Portfolio', active: true },
  { href: '/net-worth', label: 'Net Worth', active: true },
  { href: '/weekly-review', label: 'Weekly Review', active: true },
  { href: '/subscriptions', label: 'Subscriptions', active: true },
  { href: '/habits', label: 'Habits', active: true },
  { href: '/goals', label: 'Goals', active: true },
  { href: '/maintenance', label: 'Maintenance', active: true },
  { href: '/gifts', label: 'Gifts', active: true },
  { href: '/tech-radar', label: 'Tech Radar', active: true },
  { href: '/system', label: 'System', active: true },
]

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
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {NAV.map(({ href, label, active }) =>
          active ? (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {label}
            </Link>
          ) : (
            <span
              key={href}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed flex items-center justify-between"
            >
              {label}
              <span className="text-xs text-gray-300 dark:text-gray-600">soon</span>
            </span>
          )
        )}
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
