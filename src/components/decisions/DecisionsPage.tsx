'use client'

import { useState } from 'react'
import useSWR from 'swr'
import PromptModal from '@/components/ui/PromptModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface MatrixSummary { id: number; name: string; description?: string }
interface Criterion { id: number; name: string; weight: number }
interface Option { id: number; name: string }
interface Score { id: number; score: number; optionId: number; criteriaId: number }
interface Matrix extends MatrixSummary {
  criteria: Criterion[]
  options: Option[]
  scores: Score[]
}

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  if (editing) {
    return (
      <input
        autoFocus value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { onSave(v); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(v); setEditing(false) } }}
        className="border rounded px-1 py-0.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white w-full min-w-0"
      />
    )
  }
  return (
    <button onClick={() => { setV(value); setEditing(true) }} className="text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300 truncate">
      {value}
    </button>
  )
}

export default function DecisionsPage() {
  const { data: decisions = [], mutate: mutateList } = useSWR<MatrixSummary[]>('/api/matrices', fetcher)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [showXvsY, setShowXvsY] = useState(false)

  const { data: matrix, mutate: mutateMatrix } = useSWR<Matrix>(
    selectedId ? `/api/matrices/${selectedId}` : null,
    fetcher
  )

  async function createDecision() {
    if (!newName.trim()) return
    const res = await fetch('/api/matrices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc || null }),
    })
    const m = await res.json()
    setSelectedId(m.id)
    setNewName(''); setNewDesc(''); setShowCreate(false)
    mutateList()
  }

  async function deleteDecision() {
    if (!selectedId || !confirm('Delete this decision matrix and all its data?')) return
    await fetch(`/api/matrices/${selectedId}`, { method: 'DELETE' })
    setSelectedId(null)
    mutateList()
  }

  async function addCriterion() {
    if (!selectedId) return
    await fetch(`/api/matrices/${selectedId}/criteria`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New criterion', weight: 0 }),
    })
    mutateMatrix()
  }

  async function updateCriterion(id: number, name: string, weight: number) {
    await fetch(`/api/matrices/criteria/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, weight }),
    })
    mutateMatrix()
  }

  async function deleteCriterion(id: number) {
    await fetch(`/api/matrices/criteria/${id}`, { method: 'DELETE' })
    mutateMatrix()
  }

  async function addOption() {
    if (!selectedId) return
    await fetch(`/api/matrices/${selectedId}/options`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New option' }),
    })
    mutateMatrix()
  }

  async function updateOption(id: number, name: string) {
    await fetch(`/api/matrices/options/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    mutateMatrix()
  }

  async function deleteOption(id: number) {
    await fetch(`/api/matrices/options/${id}`, { method: 'DELETE' })
    mutateMatrix()
  }

  async function updateScore(criteriaId: number, optionId: number, score: number) {
    await fetch('/api/matrices/scores', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteriaId, optionId, score }),
    })
    mutateMatrix()
  }

  const criteria = matrix?.criteria ?? []
  const options = matrix?.options ?? []
  const scores = matrix?.scores ?? []
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightWarning = criteria.length > 0 && Math.abs(totalWeight - 100) > 0.01

  function getScore(criteriaId: number, optionId: number) {
    return scores.find(s => s.criteriaId === criteriaId && s.optionId === optionId)?.score ?? 0
  }

  function getWeightedScore(optionId: number) {
    return criteria.reduce((total, c) => total + getScore(c.id, optionId) * c.weight / 100, 0)
  }

  function buildPrompt(): string {
    if (!matrix || !criteria.length || !options.length) return ''
    const criteriaLines = criteria.map(c => `- ${c.name} — ${c.weight}%`).join('\n')
    const optionLines = options.map(opt => {
      const scoreList = criteria.map(c => `${c.name} = ${getScore(c.id, opt.id)}`).join(', ')
      return `- ${opt.name}: ${scoreList}`
    }).join('\n')
    const resultLines = [...options]
      .sort((a, b) => getWeightedScore(b.id) - getWeightedScore(a.id))
      .map((opt, i) => `${i + 1}. ${opt.name} — ${getWeightedScore(opt.id).toFixed(2)}`)
      .join('\n')
    return `I'm evaluating options using a weighted decision matrix.

Decision: ${matrix.name}${matrix.description ? `\nContext: ${matrix.description}` : ''}

Criteria and weights:
${criteriaLines}

Options with scores (0–10 per criterion):
${optionLines}

Weighted results (higher is better, max 10):
${resultLines}

Please analyse my scoring. Identify potential biases, flag criteria that may be under/over-weighted relative to their importance, and suggest whether the top-ranked option is clearly the right choice or if the decision is too close to call.`
  }

  function buildXvsYPrompt(): string {
    if (!matrix || options.length < 2) return ''
    const ranked = [...options].sort((a, b) => getWeightedScore(b.id) - getWeightedScore(a.id))
    const top = ranked[0]
    const second = ranked[1]
    const topScore = getWeightedScore(top.id).toFixed(2)
    const secondScore = getWeightedScore(second.id).toFixed(2)

    const topStrengths = criteria
      .filter(c => getScore(c.id, top.id) > getScore(c.id, second.id))
      .map(c => `${c.name} (${getScore(c.id, top.id)} vs ${getScore(c.id, second.id)})`)
    const secondStrengths = criteria
      .filter(c => getScore(c.id, second.id) > getScore(c.id, top.id))
      .map(c => `${c.name} (${getScore(c.id, second.id)} vs ${getScore(c.id, top.id)})`)

    const context = matrix.description ? `\nContext: ${matrix.description}` : ''

    return `I'm trying to decide: ${matrix.name}${context}

My weighted scoring puts two options close to each other:
- ${top.name}: ${topScore}/10
- ${second.name}: ${secondScore}/10

Where ${top.name} scores higher: ${topStrengths.join(', ') || 'none'}
Where ${second.name} scores higher: ${secondStrengths.join(', ') || 'none'}

The criteria I weighted most: ${[...criteria].sort((a, b) => b.weight - a.weight).slice(0, 3).map(c => `${c.name} (${c.weight}%)`).join(', ')}

Please help me think through this ${top.name} vs ${second.name} decision. What does my scoring reveal about my priorities? Are there any non-quantifiable factors I might be overlooking? Which would you recommend and why?`
  }

  const maxWS = Math.max(...options.map(o => getWeightedScore(o.id)), 0.001)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Decisions</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New decision
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Decision name" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          <div className="flex gap-2">
            <button onClick={createDecision} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <select
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select a decision…</option>
            {decisions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {selectedId && (
            <button onClick={deleteDecision} className="text-sm text-red-500 hover:underline">Delete</button>
          )}
          {selectedId && matrix && criteria.length > 0 && options.length > 0 && (
            <button
              onClick={() => setShowPrompt(true)}
              className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Detailed Analysis
            </button>
          )}
          {selectedId && matrix && criteria.length > 0 && options.length >= 2 && (
            <button
              onClick={() => setShowXvsY(true)}
              className="text-sm px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              X vs Y
            </button>
          )}
        </div>
      )}

      {decisions.length === 0 && !showCreate && (
        <p className="text-sm text-gray-400 text-center py-12">No decisions yet. Create one to get started.</p>
      )}

      {matrix && (
        <div>
          {weightWarning && (
            <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-300">
              Weights sum to {totalWeight.toFixed(1)}% — they should sum to 100%.
            </div>
          )}

          <div className="overflow-x-auto mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wide">
                    Criterion
                  </th>
                  {options.map(opt => (
                    <th key={opt.id} className="px-4 py-3 text-center min-w-[120px]">
                      <InlineEdit value={opt.name} onSave={v => updateOption(opt.id, v)} />
                      <button onClick={() => deleteOption(opt.id)} className="block mx-auto mt-0.5 text-xs text-red-400 hover:text-red-600">✕</button>
                    </th>
                  ))}
                  <th className="px-4 py-3">
                    <button onClick={addOption} className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap">+ Option</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {criteria.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <InlineEdit value={c.name} onSave={v => updateCriterion(c.id, v, c.weight)} />
                        <input
                          type="number" min="0" max="100" step="1"
                          defaultValue={c.weight}
                          onBlur={e => updateCriterion(c.id, c.name, Number(e.target.value))}
                          className="w-14 border rounded px-1 py-0.5 text-xs text-center dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        />
                        <span className="text-xs text-gray-400">%</span>
                        <button onClick={() => deleteCriterion(c.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                      </div>
                    </td>
                    {options.map(opt => (
                      <td key={opt.id} className="px-4 py-3 text-center">
                        <input
                          type="number" min="0" max="10" step="1"
                          defaultValue={getScore(c.id, opt.id)}
                          onBlur={e => updateScore(c.id, opt.id, Math.max(0, Math.min(10, Number(e.target.value))))}
                          className="w-14 border rounded px-2 py-1 text-center text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
                {options.length > 0 && criteria.length > 0 && (
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Weighted Score
                    </td>
                    {options.map(opt => {
                      const ws = getWeightedScore(opt.id)
                      return (
                        <td key={opt.id} className="px-4 py-3 text-center">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">{ws.toFixed(2)}</div>
                          <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(ws / 10) * 100}%` }} />
                          </div>
                        </td>
                      )
                    })}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
              <button onClick={addCriterion} className="text-xs text-blue-500 hover:text-blue-700">+ Add criterion</button>
            </div>
          </div>

          {options.length > 0 && criteria.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Results (sorted by score)</h3>
              {(() => {
                const sorted = [...options].sort((a, b) => getWeightedScore(b.id) - getWeightedScore(a.id))
                const winner = sorted[0]
                const winnerScore = getWeightedScore(winner.id)
                const runnerUp = sorted[1]
                const gap = runnerUp ? winnerScore - getWeightedScore(runnerUp.id) : 99
                return (
                  <>
                    <div className="mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Recommended</span>
                        <p className="text-sm font-bold text-green-900 dark:text-green-200 mt-0.5">{winner.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-green-700 dark:text-green-400">{winnerScore.toFixed(2)}</span>
                        {gap < 0.5 && runnerUp && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Close call — gap only {gap.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {sorted.map((opt, rank) => {
                        const ws = getWeightedScore(opt.id)
                        const isWinner = rank === 0
                        return (
                          <div key={opt.id} className="flex items-center gap-3">
                            <span className={`text-sm w-32 truncate shrink-0 ${isWinner ? 'font-semibold text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {isWinner && '★ '}{opt.name}
                            </span>
                            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${isWinner ? 'bg-green-500' : 'bg-blue-400'}`}
                                style={{ width: `${(ws / maxWS) * 100}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold w-12 text-right shrink-0 ${isWinner ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                              {ws.toFixed(2)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {showPrompt && (
        <PromptModal
          title="Decision Matrix — Detailed Analysis"
          prompt={buildPrompt()}
          onClose={() => setShowPrompt(false)}
        />
      )}
      {showXvsY && (
        <PromptModal
          title={`Decision — X vs Y`}
          prompt={buildXvsYPrompt()}
          onClose={() => setShowXvsY(false)}
        />
      )}
    </div>
  )
}
