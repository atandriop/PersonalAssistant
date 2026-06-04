'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export const SUBSCRIPTION_CATEGORIES = [
  'Software & Services',
  'Utilities',
  'Groceries & Food',
  'Insurance',
  'Other',
] as const

interface Subscription {
  id: number; name: string; cost: number; period: string; category: string
  renewalDate?: string | null; url?: string | null; notes?: string | null; active: boolean
}

const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

function monthlyEquiv(cost: number, period: string): number {
  return period === 'yearly' ? cost / 12 : cost
}

function daysUntil(renewalDate: string | null | undefined): number | null {
  if (!renewalDate) return null
  return Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000)
}

interface FormProps { initial?: Subscription; onSave: () => void; onCancel: () => void }

function SubscriptionForm({ initial, onSave, onCancel }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '')
  const [period, setPeriod] = useState(initial?.period ?? 'monthly')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [renewalDate, setRenewalDate] = useState(initial?.renewalDate ? initial.renewalDate.slice(0, 10) : '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [active, setActive] = useState(initial?.active ?? true)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name, cost: Number(cost), period, category, renewalDate: renewalDate || null, url: url || null, notes: notes || null, active }
    if (initial?.id) {
      await fetch(`/api/subscriptions/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Netflix)" className={field} />
      <div className="flex gap-2">
        <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className={field} />
        <select value={period} onChange={e => setPeriod(e.target.value)} className={field}>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <select value={category} onChange={e => setCategory(e.target.value)} className={field}>
        {SUBSCRIPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className={field} />
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" className={field} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={field} />
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add subscription'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}

export default function SubscriptionsPage() {
  const { data: all = [], mutate } = useSWR<Subscription[]>('/api/subscriptions', fetcher)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [showActive, setShowActive] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)

  const active = all.filter(s => s.active)
  const items = showActive ? active : all
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyEquiv(s.cost, s.period), 0)
  const annualTotal = active.reduce((sum, s) => sum + (s.period === 'yearly' ? s.cost : s.cost * 12), 0)
  const soonCount = active.filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d >= 0 && d <= 14 }).length

  function buildPrompt(): string {
    const lines = active.map(s => {
      const mo = monthlyEquiv(s.cost, s.period)
      const suffix = s.period === 'yearly' ? ` — €${mo.toFixed(2)}/mo equivalent` : ''
      return `- ${s.name} [${s.category}]: €${s.cost.toFixed(2)}/${s.period}${suffix}`
    }).join('\n')
    return `Here are my active subscriptions:\n${lines}\n\nTotal monthly spend: €${monthlyTotal.toFixed(2)}\nTotal annual spend: €${annualTotal.toFixed(2)}\n\nIdentify any likely redundancies, suggest cuts, and flag anything that seems overpriced for what it provides.`
  }

  async function del(id: number) {
    if (!confirm('Delete this subscription?')) return
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
    mutate()
  }

  // Group items by category, preserving SUBSCRIPTION_CATEGORIES order
  const grouped = SUBSCRIPTION_CATEGORIES.map(cat => ({
    category: cat,
    items: items.filter(s => (s.category ?? 'Other') === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPrompt(true)} disabled={active.length === 0}
            className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            AI Prompt
          </button>
          <button onClick={() => setShowAdd(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Add
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <span className="text-base font-semibold text-gray-700 dark:text-gray-300">Monthly: €{monthlyTotal.toFixed(2)}</span>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Annual: €{annualTotal.toFixed(2)}</span>
        <Badge color="#6b7280">{active.length} active</Badge>
        {soonCount > 0 && <Badge color="#f59e0b">{soonCount} renewing soon</Badge>}
      </div>

      <div className="flex gap-2 mb-4">
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => setShowActive(v)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${showActive === v ? 'bg-blue-600 text-white border-blue-600' : 'dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {v ? 'Active' : 'All'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {grouped.map(({ category, items: groupItems }) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{category}</h3>
            <div className="flex flex-col gap-2">
              {groupItems.map(s => {
                const days = daysUntil(s.renewalDate)
                const soon = days !== null && days >= 0 && days <= 14
                const mo = monthlyEquiv(s.cost, s.period)
                return (
                  <div key={s.id} className={`bg-white dark:bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${soon ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'} ${!s.active ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                        {soon && days !== null && <Badge color="#f59e0b">Renewing in {days}d</Badge>}
                        {!s.active && <Badge color="#6b7280">Inactive</Badge>}
                      </div>
                      {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{s.url}</a>}
                      {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                      {s.renewalDate && <p className="text-xs text-gray-400">Renews {new Date(s.renewalDate).toLocaleDateString()}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">€{s.cost.toFixed(2)}/{s.period === 'monthly' ? 'mo' : 'yr'}</p>
                      {s.period === 'yearly' && <p className="text-xs text-gray-400">€{mo.toFixed(2)}/mo</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditing(s)} className="text-xs px-2 py-1 border rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                      <button onClick={() => del(s.id)} className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded-md hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Del</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No subscriptions yet. Add one to get started.</p>
      )}

      {showAdd && <Modal title="Add subscription" onClose={() => setShowAdd(false)}><SubscriptionForm onSave={() => { setShowAdd(false); mutate() }} onCancel={() => setShowAdd(false)} /></Modal>}
      {editing && <Modal title="Edit subscription" onClose={() => setEditing(null)}><SubscriptionForm initial={editing} onSave={() => { setEditing(null); mutate() }} onCancel={() => setEditing(null)} /></Modal>}
      {showPrompt && <PromptModal title="Subscriptions AI Prompt" prompt={buildPrompt()} onClose={() => setShowPrompt(false)} />}
    </div>
  )
}
