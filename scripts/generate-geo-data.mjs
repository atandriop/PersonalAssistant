import { createRequire } from 'module'
import { writeFileSync, mkdirSync } from 'fs'
import iso from 'iso-3166-1'

const require = createRequire(import.meta.url)
const citiesData = require('cities.json')
const countryCodes = iso.all()

// Build countries list with mapping from country code to name
const countryCodeMap = {}
countryCodes.forEach(c => {
  countryCodeMap[c.alpha2] = c.country
})

const countrySet = new Set()
const citiesByCountry = {}

for (const city of citiesData) {
  const countryCode = city.country
  const countryName = countryCodeMap[countryCode]

  if (!countryName) continue

  countrySet.add(countryName)
  if (!citiesByCountry[countryName]) citiesByCountry[countryName] = []
  citiesByCountry[countryName].push({ name: city.name })
}

const countries = [...countrySet].sort()

// Keep top 15 cities per country (sorted alphabetically)
const citiesOut = {}
for (const country of countries) {
  citiesOut[country] = (citiesByCountry[country] ?? [])
    .slice(0, 15)
    .map(c => c.name)
    .sort()
}

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/countries.json', JSON.stringify(countries, null, 2))
writeFileSync('public/data/cities.json', JSON.stringify(citiesOut, null, 2))

console.log(`Done: ${countries.length} countries, ${Object.values(citiesOut).flat().length} cities`)
