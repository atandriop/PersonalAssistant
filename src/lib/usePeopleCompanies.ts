import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCompanions() {
  const { data, mutate } = useSWR<{ id: number; name: string }[]>('/api/companions', fetcher)
  const names = (data ?? []).map(c => c.name)

  async function ensureCompanion(name: string) {
    if (names.includes(name)) return
    await fetch('/api/companions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    mutate()
  }

  return { names, ensureCompanion }
}

export function useCompanies() {
  const { data, mutate } = useSWR<{ id: number; name: string }[]>('/api/companies', fetcher)
  const names = (data ?? []).map(c => c.name)

  async function ensureCompany(name: string) {
    if (names.includes(name)) return
    await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    mutate()
  }

  return { names, ensureCompany }
}
