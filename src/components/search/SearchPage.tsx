'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SearchResults {
  tasks: { id: number; title: string; priority: string; dueDate: string | null; category: string | null }[]
  memories: { id: number; title: string; date: string; category: string; location: string | null }[]
  documents: { id: number; name: string; category: string; expiryDate: string | null }[]
  habits: { id: number; name: string; color: string }[]
  bucketTrips: { id: number; destination: string; done: boolean; targetYear: number | null }[]
  bucketExperiences: { id: number; title: string; category: string; done: boolean }[]
  goals: { id: number; title: string; timePeriod: string; areaName: string }[]
  appointments: { id: number; title: string; date: string; category: string; location: string | null }[]
  subscriptions: { id: number; name: string; cost: number; period: string; active: boolean }[]
  wishlistItems: { id: number; name: string; cost: number; priority: string; purchased: boolean }[]
  inventoryItems: { id: number; name: string; cost: number }[]
  travelTrips: { id: number; countryName: string; cities: string | null; startDate: string | null }[]
  maintenanceItems: { id: number; name: string }[]
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {title} ({count})
      </h3>
      <div className="flex flex-col gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function ResultRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{label}</span>
      {sub && <span className="text-xs text-gray-400 shrink-0 ml-3">{sub}</span>}
    </Link>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data, isLoading } = useSWR<SearchResults>(
    debouncedQuery.length >= 2 ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher
  )

  const totalResults = data
    ? data.tasks.length + data.memories.length + data.documents.length +
      data.habits.length + data.bucketTrips.length + data.bucketExperiences.length +
      data.goals.length + data.appointments.length + data.subscriptions.length +
      data.wishlistItems.length + data.inventoryItems.length +
      data.travelTrips.length + data.maintenanceItems.length
    : 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Search</h1>

      <div className="mb-6">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search everything…"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-gray-400">Type at least 2 characters…</p>
      )}

      {isLoading && <p className="text-sm text-gray-400">Searching…</p>}

      {data && !isLoading && (
        <>
          {totalResults === 0 && (
            <p className="text-sm text-gray-400">No results for &ldquo;{debouncedQuery}&rdquo;</p>
          )}

          <Section title="Tasks" count={data.tasks.length}>
            {data.tasks.map(t => (
              <ResultRow key={t.id} href="/tasks" label={t.title} sub={t.dueDate ?? t.priority} />
            ))}
          </Section>

          <Section title="Goals" count={data.goals.length}>
            {data.goals.map(g => (
              <ResultRow key={g.id} href="/goals" label={g.title} sub={`${g.areaName} · ${g.timePeriod}`} />
            ))}
          </Section>

          <Section title="Appointments" count={data.appointments.length}>
            {data.appointments.map(a => (
              <ResultRow key={a.id} href="/tasks" label={a.title} sub={`${a.category} · ${a.date}`} />
            ))}
          </Section>

          <Section title="Memories" count={data.memories.length}>
            {data.memories.map(m => (
              <ResultRow key={m.id} href="/memories" label={m.title} sub={`${m.category} · ${m.date}`} />
            ))}
          </Section>

          <Section title="Documents" count={data.documents.length}>
            {data.documents.map(d => (
              <ResultRow key={d.id} href="/documents" label={d.name} sub={d.category} />
            ))}
          </Section>

          <Section title="Habits" count={data.habits.length}>
            {data.habits.map(h => (
              <ResultRow key={h.id} href="/habits" label={h.name} />
            ))}
          </Section>

          <Section title="Subscriptions" count={data.subscriptions.length}>
            {data.subscriptions.map(s => (
              <ResultRow key={s.id} href="/finance" label={s.name} sub={`€${s.cost}/${s.period}${s.active ? '' : ' · inactive'}`} />
            ))}
          </Section>

          <Section title="Wishlist" count={data.wishlistItems.length}>
            {data.wishlistItems.map(w => (
              <ResultRow key={w.id} href="/items" label={w.name} sub={`€${w.cost}${w.purchased ? ' · bought' : ''}`} />
            ))}
          </Section>

          <Section title="Inventory" count={data.inventoryItems.length}>
            {data.inventoryItems.map(i => (
              <ResultRow key={i.id} href="/items" label={i.name} sub={`€${i.cost}`} />
            ))}
          </Section>

          <Section title="Travel" count={data.travelTrips.length}>
            {data.travelTrips.map(t => (
              <ResultRow key={t.id} href="/travel" label={t.countryName} sub={t.cities ?? t.startDate ?? undefined} />
            ))}
          </Section>

          <Section title="Maintenance" count={data.maintenanceItems.length}>
            {data.maintenanceItems.map(m => (
              <ResultRow key={m.id} href="/maintenance" label={m.name} />
            ))}
          </Section>

          <Section title="Bucket List" count={data.bucketTrips.length + data.bucketExperiences.length}>
            {data.bucketTrips.map(t => (
              <ResultRow key={`trip-${t.id}`} href="/bucket-list" label={t.destination} sub={t.targetYear?.toString() ?? (t.done ? 'Done' : undefined)} />
            ))}
            {data.bucketExperiences.map(e => (
              <ResultRow key={`exp-${e.id}`} href="/bucket-list" label={e.title} sub={e.category} />
            ))}
          </Section>
        </>
      )}
    </div>
  )
}
