'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { exportPdf } from '@/lib/exportPdf'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SystemStats {
  totalMem: number; freeMem: number; usedMem: number
  uptimeSeconds: number; nodeVersion: string; platform: string
  dbSize: number
}

interface Config { port: number }

interface BackupFile {
  name: string
  size: number
  createdAt: string
}

interface LogsData {
  lines: string[]
}

function formatBytes(b: number): string {
  const gb = b / (1024 ** 3)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(b / (1024 ** 2)).toFixed(0)} MB`
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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
  const { data: backups = [], mutate: mutateBackups } = useSWR<BackupFile[]>('/api/system/backup', fetcher)
  const { data: logsData, mutate: mutateLogs } = useSWR<LogsData>('/api/system/logs', fetcher)

  const [portInput, setPortInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shutting, setShutting] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [clearingBackups, setClearingBackups] = useState(false)
  const [clearingLogs, setClearingLogs] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  function downloadUrl(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function exportJson() {
    downloadUrl('/api/export?format=json', `homebase-export-${new Date().toISOString().slice(0, 10)}.json`)
  }

  function exportCsv() {
    downloadUrl('/api/export?format=csv', `homebase-tasks-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      await exportPdf()
    } finally {
      setExportingPdf(false)
    }
  }

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

  async function createBackup() {
    setBackingUp(true)
    await fetch('/api/system/backup', { method: 'POST' })
    await mutateBackups()
    await mutateLogs()
    setBackingUp(false)
  }

  async function cleanBackups() {
    if (!confirm(`Delete all ${backups.length} backup(s)? This cannot be undone.`)) return
    setClearingBackups(true)
    await fetch('/api/system/backup', { method: 'DELETE' })
    await mutateBackups()
    await mutateLogs()
    setClearingBackups(false)
  }

  async function clearLogs() {
    if (!confirm('Clear all logs?')) return
    setClearingLogs(true)
    await fetch('/api/system/logs', { method: 'DELETE' })
    await mutateLogs()
    setClearingLogs(false)
  }

  const logLines = logsData?.lines ?? []

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System</h1>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">System Info</h2>
        {!stats ? <p className="text-sm text-gray-400">Loading…</p> : (
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Database" value={formatBytes(stats.dbSize)} />
            <Stat label="Uptime" value={formatUptime(stats.uptimeSeconds)} />
            <Stat label="Node" value={stats.nodeVersion} />
            <Stat label="Platform" value={stats.platform} />
          </div>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Backups</h2>
          <div className="flex gap-2">
            {backups.length > 0 && (
              <button
                onClick={cleanBackups}
                disabled={clearingBackups}
                className="text-xs px-2.5 py-1 text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                {clearingBackups ? 'Cleaning…' : 'Clean All'}
              </button>
            )}
            <button
              onClick={createBackup}
              disabled={backingUp}
              className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {backingUp ? 'Backing up…' : '+ Create Backup'}
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <p className="text-sm text-gray-400">No backups yet. Create one to snapshot the database.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {backups.map(b => (
              <div key={b.name} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-mono text-xs">{b.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{formatBytes(b.size)}</span>
                  <span className="text-xs text-gray-400">{formatDate(b.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Activity Log</h2>
          {logLines.length > 0 && (
            <button
              onClick={clearLogs}
              disabled={clearingLogs}
              className="text-xs px-2.5 py-1 text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              {clearingLogs ? 'Clearing…' : 'Clear Logs'}
            </button>
          )}
        </div>

        {logLines.length === 0 ? (
          <p className="text-sm text-gray-400">No activity logged yet.</p>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-64 overflow-y-auto">
            {logLines.map((line, i) => (
              <p key={i} className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-5">{line}</p>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Export</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Download your data in different formats.</p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={exportJson}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={exportCsv}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            Export CSV (tasks)
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            {exportingPdf ? 'Building PDF…' : 'Export PDF'}
          </button>
        </div>
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
