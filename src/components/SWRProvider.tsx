'use client'

import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/fetcher'

/**
 * App-wide SWR defaults.
 *
 * There was no SWRConfig anywhere, so every hook ran with SWR's defaults:
 * revalidateOnFocus: true and dedupingInterval: 2000. The dashboard alone mounts
 * 18 keys (43 SQL queries, ~100KB of JSON), and that whole set re-fired on every
 * window refocus — every alt-tab back to the browser. This is a single-user local
 * app, so the data cannot change behind your back while the tab is blurred;
 * revalidating on an explicit mutate or reconnect is enough.
 */
export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        dedupingInterval: 30_000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}
