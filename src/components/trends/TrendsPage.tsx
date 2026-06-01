'use client'

import { useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Snapshot {
  id: number; date: string; wishlistTotal: number; portfolioTotal: number
}

const SVG_W = 600
const SVG_H = 180
const PAD_L = 50
const PAD_R = 16
const PAD_T = 16
const PAD_B = 24

function LineChart({ data, color }: { data: { x: number; y: number }[]; color: string }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Not enough data yet — visit again to build up history.
      </p>
    )
  }

  const minX = Math.min(...data.map(d => d.x))
  const maxX = Math.max(...data.map(d => d.x))
  const minY = Math.min(...data.map(d => d.y))
  const maxY = Math.max(...data.map(d => d.y))
  const rangeX = maxX - minX || 1
  const rangeY = (maxY - minY) * 1.1 || 1
  const adjustedMinY = minY - (maxY - minY) * 0.05

  const cW = SVG_W - PAD_L - PAD_R
  const cH = SVG_H - PAD_T - PAD_B

  const toSx = (x: number) => PAD_L + ((x - minX) / rangeX) * cW
  const toSy = (y: number) => PAD_T + cH - ((y - adjustedMinY) / rangeY) * cH

  const pts = data.map(d => ({ sx: toSx(d.x), sy: toSy(d.y), y: d.y, x: d.x }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].sx.toFixed(1)} ${(PAD_T + cH).toFixed(1)} L ${pts[0].sx.toFixed(1)} ${(PAD_T + cH).toFixed(1)} Z`

  const yTicks = [minY, (minY + maxY) / 2, maxY]
  const xLabels = [
    { sx: toSx(minX), label: new Date(minX).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) },
    { sx: toSx(maxX), label: new Date(maxX).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) },
  ]

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: SVG_H }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PAD_L} y1={toSy(tick).toFixed(1)}
            x2={SVG_W - PAD_R} y2={toSy(tick).toFixed(1)}
            stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4"
          />
          <text x={PAD_L - 4} y={toSy(tick) + 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">
            €{tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick.toFixed(0)}
          </text>
        </g>
      ))}
      {xLabels.map((l, i) => (
        <text key={i} x={l.sx} y={SVG_H - 4} textAnchor={i === 0 ? 'start' : 'end'} fontSize="9" fill="currentColor" opacity="0.5">
          {l.label}
        </text>
      ))}
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.sx.toFixed(1)} cy={p.sy.toFixed(1)} r="3" fill={color}>
          <title>€{p.y.toFixed(2)} · {new Date(p.x).toLocaleDateString()}</title>
        </circle>
      ))}
    </svg>
  )
}

export default function TrendsPage() {
  const { data: snapshots = [], mutate } = useSWR<Snapshot[]>('/api/snapshots', fetcher)

  useEffect(() => {
    const today = new Date().toDateString()
    if (sessionStorage.getItem('lastSnapshot') === today) return
    fetch('/api/snapshots', { method: 'POST' }).then(() => {
      sessionStorage.setItem('lastSnapshot', today)
      mutate()
    })
  }, [mutate])

  const sorted = [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const wishlistData = sorted.map(s => ({ x: new Date(s.date).getTime(), y: s.wishlistTotal }))
  const portfolioData = sorted.map(s => ({ x: new Date(s.date).getTime(), y: s.portfolioTotal }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Trends</h1>
      <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Wishlist Total Over Time</h2>
          <LineChart data={wishlistData} color="#3b82f6" />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Portfolio Value Over Time</h2>
          <LineChart data={portfolioData} color="#10b981" />
        </div>
        <p className="text-xs text-gray-400 text-center">
          {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} recorded.
          A new snapshot is taken once per session on this page.
        </p>
      </div>
    </div>
  )
}
