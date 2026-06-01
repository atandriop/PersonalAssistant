'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SystemStats {
  totalMem: number; freeMem: number; usedMem: number
  uptimeSeconds: number; nodeVersion: string; platform: string
}

interface Config { port: number }

function formatBytes(b: number): string {
  const gb = b / (1024 ** 3)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(b / (1024 ** 2)).toFixed(0)} MB`
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function SystemPage() {
  const { data: stats } = useSWR<SystemStats>('/api/system', fetcher, { refreshInterval: 10000 })
  const { data: config, mutate: mutateConfig } = useSWR<Config>('/api/config', fetcher)
  const [portInput, setPortInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shutting, setShutting] = useState(false)

  const memPct = stats ? Math.round((stats.usedMem / stats.totalMem) * 100) : 0

  async function saveConfig() {
    const port = Number(portInput || config?.port)
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port }),
    })
    await mutateConfig()
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function restart() {
    if (!confirm('Restart the server?')) return
    await fetch('/api/system/restart', { method: 'POST' })
  }

  async function shutdown() {
    if (!confirm('Shut down the server? You will need to start it manually.')) return
    setShutting(true)
    await fetch('/api/system/shutdown', { method: 'POST' })
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System</h1>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">System Info</h2>
        {!stats ? <p className="text-sm text-gray-400">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Stat label="Total RAM" value={formatBytes(stats.totalMem)} />
              <Stat label="Used RAM" value={`${formatBytes(stats.usedMem)} (${memPct}%)`} />
              <Stat label="Free RAM" value={formatBytes(stats.freeMem)} />
              <Stat label="Uptime" value={formatUptime(stats.uptimeSeconds)} />
              <Stat label="Node" value={stats.nodeVersion} />
              <Stat label="Platform" value={stats.platform} />
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${memPct}%` }} />
            </div>
          </>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Configuration</h2>
        {!config ? <p className="text-sm text-gray-400">Loading…</p> : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">Port</label>
              <input
                type="number"
                value={portInput !== '' ? portInput : config.port}
                onChange={e => setPortInput(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-32 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              <p className="text-xs text-gray-400">The port the app runs on. Restart required for changes to take effect.</p>
            </div>
            <button
              onClick={saveConfig} disabled={saving}
              className="w-fit bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Server Controls</h2>
        {shutting ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Server is shutting down…</p>
        ) : (
          <div className="flex gap-3">
            <button onClick={restart} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
              Restart
            </button>
            <button onClick={shutdown} className="px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              Shutdown
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
