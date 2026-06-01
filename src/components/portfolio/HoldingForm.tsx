'use client'

import { useState } from 'react'

interface Holding {
  id?: number; name: string; type: string
  quantity?: number | null; buyPrice?: number | null; currentPrice?: number | null
  balance?: number | null; interestRate?: number | null; notes?: string | null
}

interface Props {
  initial?: Holding
  onSave: () => void
  onCancel: () => void
}

export default function HoldingForm({ initial, onSave, onCancel }: Props) {
  const [type, setType] = useState(initial?.type ?? 'stock')
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '')
  const [buyPrice, setBuyPrice] = useState(initial?.buyPrice?.toString() ?? '')
  const [currentPrice, setCurrentPrice] = useState(initial?.currentPrice?.toString() ?? '')
  const [balance, setBalance] = useState(initial?.balance?.toString() ?? '')
  const [interestRate, setInterestRate] = useState(initial?.interestRate?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const isSavings = type === 'savings'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name, type,
      quantity: isSavings ? null : Number(quantity),
      buyPrice: isSavings ? null : Number(buyPrice),
      currentPrice: isSavings ? null : Number(currentPrice),
      balance: isSavings ? Number(balance) : null,
      interestRate: isSavings ? (interestRate ? Number(interestRate) : null) : null,
      notes: notes || null,
    }
    if (initial?.id) {
      await fetch(`/api/portfolio/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    onSave()
  }

  const field = 'border rounded-lg px-3 py-2 text-sm w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={field} />
      <select value={type} onChange={e => setType(e.target.value)} className={field}>
        <option value="stock">Stock</option>
        <option value="crypto">Crypto</option>
        <option value="savings">Savings</option>
        <option value="other">Other</option>
      </select>
      {isSavings ? (
        <>
          <input required type="number" min="0" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="Current balance" className={field} />
          <input type="number" min="0" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="Annual interest rate % (optional)" className={field} />
        </>
      ) : (
        <>
          <input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={field} />
          <input required type="number" min="0" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="Buy price per unit" className={field} />
          <input required type="number" min="0" step="0.01" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="Current price per unit" className={field} />
        </>
      )}
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={field} />
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add holding'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">Cancel</button>
      </div>
    </form>
  )
}
