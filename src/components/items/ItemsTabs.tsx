'use client'

import Link from 'next/link'

export default function ItemsTabs({ active }: { active: 'wishlist' | 'inventory' }) {
  function tab(href: string, label: string, isActive: boolean) {
    return (
      <Link
        key={href}
        href={href}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          isActive
            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        {label}
      </Link>
    )
  }
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
      {tab('/wishlist', 'Wishlist', active === 'wishlist')}
      {tab('/inventory', 'Inventory', active === 'inventory')}
    </div>
  )
}
