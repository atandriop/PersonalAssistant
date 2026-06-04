import { createRequire } from 'module'
import { writeFileSync, mkdirSync } from 'fs'

const require = createRequire(import.meta.url)
const citiesData = require('cities.json')
const iso = require('iso-3166-1')

// Build country code -> name map
const codeMap = {}
iso.all().forEach(c => { codeMap[c.alpha2] = c.country })

// Group cities by country name
const byCountry = {}
for (const city of citiesData) {
  const countryName = codeMap[city.country]
  if (!countryName) continue
  if (!byCountry[countryName]) byCountry[countryName] = []
  byCountry[countryName].push(city.name)
}

const countries = Object.keys(byCountry).sort()

// Sample up to 50 cities evenly across the sorted alphabet to ensure spread
const MAX_PER_COUNTRY = 50
const citiesOut = {}
for (const country of countries) {
  const sorted = [...new Set(byCountry[country])].sort()
  if (sorted.length <= MAX_PER_COUNTRY) {
    citiesOut[country] = sorted
  } else {
    const step = sorted.length / MAX_PER_COUNTRY
    citiesOut[country] = Array.from({ length: MAX_PER_COUNTRY }, (_, i) => sorted[Math.round(i * step)])
  }
}

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/countries.json', JSON.stringify(countries, null, 2))
writeFileSync('public/data/cities.json', JSON.stringify(citiesOut, null, 2))

const total = Object.values(citiesOut).flat().length
console.log(`Done: ${countries.length} countries, ${total} cities`)
