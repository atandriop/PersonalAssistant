import { useState, useEffect } from 'react'

let countriesCache: string[] | null = null
let citiesCache: Record<string, string[]> | null = null

export function useCountries(): string[] {
  const [countries, setCountries] = useState<string[]>(countriesCache ?? [])
  useEffect(() => {
    if (countriesCache) { setCountries(countriesCache); return }
    fetch('/data/countries.json').then(r => r.json()).then((data: string[]) => {
      countriesCache = data
      setCountries(data)
    })
  }, [])
  return countries
}

export function useCities(country: string): string[] {
  const [cities, setCities] = useState<string[]>([])
  useEffect(() => {
    if (!country) { setCities([]); return }
    function load(data: Record<string, string[]>) { setCities(data[country] ?? []) }
    if (citiesCache) { load(citiesCache); return }
    fetch('/data/cities.json').then(r => r.json()).then((data: Record<string, string[]>) => {
      citiesCache = data
      load(data)
    })
  }, [country])
  return cities
}
