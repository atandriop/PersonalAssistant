'use client'

import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { useState } from 'react'

const GEO_URL = '/data/world-110m.json'

// ISO numeric → canonical name used for matching
const ISO_NUM_TO_NAME: Record<string, string> = {
  '004': 'Afghanistan', '008': 'Albania', '012': 'Algeria', '020': 'Andorra',
  '024': 'Angola', '032': 'Argentina', '036': 'Australia', '040': 'Austria',
  '031': 'Azerbaijan', '050': 'Bangladesh', '056': 'Belgium', '064': 'Bhutan',
  '068': 'Bolivia', '070': 'Bosnia and Herzegovina', '072': 'Botswana',
  '076': 'Brazil', '096': 'Brunei', '100': 'Bulgaria', '116': 'Cambodia',
  '120': 'Cameroon', '124': 'Canada', '144': 'Sri Lanka', '152': 'Chile',
  '156': 'China', '170': 'Colombia', '178': 'Congo', '191': 'Croatia',
  '192': 'Cuba', '196': 'Cyprus', '203': 'Czech Republic', '208': 'Denmark',
  '214': 'Dominican Republic', '218': 'Ecuador', '818': 'Egypt', '231': 'Ethiopia',
  '246': 'Finland', '250': 'France', '268': 'Georgia', '276': 'Germany',
  '288': 'Ghana', '300': 'Greece', '320': 'Guatemala', '324': 'Guinea',
  '332': 'Haiti', '356': 'India', '360': 'Indonesia', '364': 'Iran',
  '368': 'Iraq', '372': 'Ireland', '376': 'Israel', '380': 'Italy',
  '388': 'Jamaica', '392': 'Japan', '400': 'Jordan', '398': 'Kazakhstan',
  '404': 'Kenya', '408': 'North Korea', '410': 'South Korea', '414': 'Kuwait',
  '417': 'Kyrgyzstan', '418': 'Laos', '422': 'Lebanon', '434': 'Libya',
  '440': 'Lithuania', '428': 'Latvia', '233': 'Estonia', '442': 'Luxembourg',
  '450': 'Madagascar', '458': 'Malaysia', '466': 'Mali', '470': 'Malta',
  '484': 'Mexico', '496': 'Mongolia', '499': 'Montenegro', '504': 'Morocco',
  '508': 'Mozambique', '104': 'Myanmar', '524': 'Nepal', '528': 'Netherlands',
  '554': 'New Zealand', '562': 'Niger', '566': 'Nigeria', '578': 'Norway',
  '512': 'Oman', '586': 'Pakistan', '591': 'Panama', '604': 'Peru',
  '608': 'Philippines', '616': 'Poland', '620': 'Portugal', '634': 'Qatar',
  '642': 'Romania', '643': 'Russia', '646': 'Rwanda', '682': 'Saudi Arabia',
  '686': 'Senegal', '688': 'Serbia', '694': 'Sierra Leone', '703': 'Slovakia',
  '705': 'Slovenia', '706': 'Somalia', '710': 'South Africa', '724': 'Spain',
  '729': 'Sudan', '752': 'Sweden', '756': 'Switzerland', '760': 'Syria',
  '762': 'Tajikistan', '158': 'Taiwan', '764': 'Thailand', '788': 'Tunisia',
  '792': 'Turkey', '795': 'Turkmenistan', '800': 'Uganda', '804': 'Ukraine',
  '784': 'United Arab Emirates', '826': 'United Kingdom',
  '840': 'United States of America', '858': 'Uruguay', '860': 'Uzbekistan',
  '862': 'Venezuela', '704': 'Vietnam', '887': 'Yemen', '716': 'Zimbabwe',
  '051': 'Armenia', '112': 'Belarus', '498': 'Moldova', '807': 'North Macedonia',
  '834': 'Tanzania',
}

// Reverse lookup: canonical name (lowercase) → ISO numeric
const NAME_TO_ISO_NUM: Record<string, string> = {}
for (const [num, name] of Object.entries(ISO_NUM_TO_NAME)) {
  NAME_TO_ISO_NUM[name.toLowerCase()] = num
}

// Map user-stored country names (from countries.json) to canonical names in ISO_NUM_TO_NAME
function normalise(name: string): string {
  const s = name.toLowerCase().replace(/^the\s+/, '')
  // Short aliases
  if (s === 'usa' || s === 'us' || s === 'united states') return 'united states of america'
  if (s === 'uk' || s === 'great britain' || s === 'britain' ||
      s.startsWith('united kingdom of great britain')) return 'united kingdom'
  if (s === 'czechia') return 'czech republic'
  if (s === 'uae') return 'united arab emirates'
  if (s === 'south korea' || s === 'republic of korea') return 'south korea'
  if (s === 'north korea' || s === "democratic people's republic of korea") return 'north korea'
  // Long official names from UN/countries.json → canonical ISO names
  if (s === 'islamic republic of iran') return 'iran'
  if (s === 'syrian arab republic') return 'syria'
  if (s === 'russian federation') return 'russia'
  if (s === 'viet nam') return 'vietnam'
  if (s === 'republic of moldova') return 'moldova'
  if (s === "lao people's democratic republic") return 'laos'
  if (s === 'united republic of tanzania') return 'tanzania'
  if (s === 'venezuela (bolivarian republic of)' || s === 'bolivarian republic of venezuela') return 'venezuela'
  if (s === 'plurinational state of bolivia') return 'bolivia'
  if (s === 'state of palestine' || s === 'palestine') return 'palestine'
  if (s === 'republic of north macedonia' || s === 'north macedonia') return 'north macedonia'
  if (s === 'congo, the democratic republic of' || s === 'democratic republic of the congo' || s === 'drc') return 'congo'
  if (s === "côte d'ivoire" || s === 'ivory coast') return 'ivory coast'
  if (s === 'myanmar (burma)' || s === 'burma') return 'myanmar'
  if (s === 'brunei darussalam') return 'brunei'
  return s
}

export default function WorldMap({ visitedCountries }: { visitedCountries: string[] }) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 })

  const visitedSet = new Set(
    visitedCountries.map(c => NAME_TO_ISO_NUM[normalise(c)]).filter(Boolean)
  )

  return (
    <div className="relative bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {tooltip && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900/80 text-white text-xs rounded-full pointer-events-none z-10">
          {tooltip}
        </div>
      )}
      <div className="absolute bottom-2 right-2 flex gap-1 z-10">
        <button
          onClick={() => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
          className="w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >+</button>
        <button
          onClick={() => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))}
          className="w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >−</button>
        <button
          onClick={() => setPosition({ coordinates: [0, 20], zoom: 1 })}
          className="w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Reset view"
        >↺</button>
      </div>
      <ComposableMap
        projection="geoNaturalEarth1"
        style={{ width: '100%', height: 'auto' }}
        viewBox="0 0 800 450"
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={({ zoom, coordinates }) => setPosition({ zoom, coordinates })}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const isoNum = String(geo.id).padStart(3, '0')
                const name = ISO_NUM_TO_NAME[isoNum] ?? null
                const visited = visitedSet.has(isoNum)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => name && setTooltip(name)}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: {
                        fill: visited ? '#3b82f6' : '#d1d5db',
                        stroke: '#fff',
                        strokeWidth: 0.3,
                        outline: 'none',
                      },
                      hover: {
                        fill: visited ? '#2563eb' : '#9ca3af',
                        stroke: '#fff',
                        strokeWidth: 0.3,
                        outline: 'none',
                      },
                      pressed: { outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  )
}
