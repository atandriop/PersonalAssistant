'use client'

import { useState } from 'react'

const COLLECTION_TYPES = ['Cards', 'Funko Pop', 'Lego', 'Figures', 'Books'] as const

interface CollectibleItem {
  id: number
  name: string
  collectionType: string
  quantity: number
  purchasePrice: number | null
  currentValue: number | null
  condition: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
}

export default function CollectibleForm({ initial, defaultType, onSave, onCancel }: {
  initial?: CollectibleItem
  defaultType?: string
  onSave: () => void
  onCancel: () => void
}) {
  const [collectionType, setCollectionType] = useState(initial?.collectionType ?? defaultType ?? 'Cards')
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '1')
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice?.toString() ?? '')
  const [currentValue, setCurrentValue] = useState(initial?.currentValue?.toString() ?? '')
  const [condition, setCondition] = useState(initial?.condition ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const m = (initial?.metadata ?? {}) as Record<string, unknown>

  // Cards
  const [cardSet, setCardSet] = useState((m.set as string) ?? '')
  const [cardRarity, setCardRarity] = useState((m.rarity as string) ?? '')
  const [cardGrade, setCardGrade] = useState((m.grade as string) ?? '')
  const [cardGradingCompany, setCardGradingCompany] = useState((m.gradingCompany as string) ?? 'None')
  const [cardLanguage, setCardLanguage] = useState((m.language as string) ?? '')

  // Funko Pop
  const [funkoNumber, setFunkoNumber] = useState((m.number as string) ?? '')
  const [funkoSeries, setFunkoSeries] = useState((m.series as string) ?? '')
  const [funkoExclusive, setFunkoExclusive] = useState((m.exclusive as string) ?? 'None')
  const [funkoVaulted, setFunkoVaulted] = useState((m.vaulted as boolean) ?? false)
  const [funkoBoxCondition, setFunkoBoxCondition] = useState((m.boxCondition as string) ?? '')

  // Lego
  const [legoSetNumber, setLegoSetNumber] = useState((m.setNumber as string) ?? '')
  const [legoTheme, setLegoTheme] = useState((m.theme as string) ?? '')
  const [legoYear, setLegoYear] = useState(m.year != null ? String(m.year) : '')
  const [legoSealed, setLegoSealed] = useState((m.sealed as boolean) ?? false)
  const [legoPieceCount, setLegoPieceCount] = useState(m.pieceCount != null ? String(m.pieceCount) : '')
  const [legoMinifigCount, setLegoMinifigCount] = useState(m.minifigureCount != null ? String(m.minifigureCount) : '')

  // Figures
  const [figFranchise, setFigFranchise] = useState((m.franchise as string) ?? '')
  const [figBrand, setFigBrand] = useState((m.brand as string) ?? '')
  const [figScale, setFigScale] = useState((m.scale as string) ?? '')
  const [figSealed, setFigSealed] = useState((m.sealed as boolean) ?? false)

  // Books
  const [bookSeries, setBookSeries] = useState((m.series as string) ?? '')
  const [bookVolume, setBookVolume] = useState((m.volumeNumber as string) ?? '')
  const [bookAuthor, setBookAuthor] = useState((m.author as string) ?? '')
  const [bookPublisher, setBookPublisher] = useState((m.publisher as string) ?? '')
  const [bookLanguage, setBookLanguage] = useState((m.language as string) ?? '')

  function buildMetadata(): Record<string, unknown> {
    switch (collectionType) {
      case 'Cards':
        return {
          set: cardSet || null,
          rarity: cardRarity || null,
          grade: cardGrade || null,
          gradingCompany: cardGradingCompany !== 'None' ? cardGradingCompany : null,
          language: cardLanguage || null,
        }
      case 'Funko Pop':
        return {
          number: funkoNumber || null,
          series: funkoSeries || null,
          exclusive: funkoExclusive !== 'None' ? funkoExclusive : null,
          vaulted: funkoVaulted,
          boxCondition: funkoBoxCondition || null,
        }
      case 'Lego':
        return {
          setNumber: legoSetNumber || null,
          theme: legoTheme || null,
          year: legoYear ? Number(legoYear) : null,
          sealed: legoSealed,
          pieceCount: legoPieceCount ? Number(legoPieceCount) : null,
          minifigureCount: legoMinifigCount ? Number(legoMinifigCount) : null,
        }
      case 'Figures':
        return {
          franchise: figFranchise || null,
          brand: figBrand || null,
          scale: figScale || null,
          sealed: figSealed,
        }
      case 'Books':
        return {
          series: bookSeries || null,
          volumeNumber: bookVolume || null,
          author: bookAuthor || null,
          publisher: bookPublisher || null,
          language: bookLanguage || null,
        }
      default:
        return {}
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name,
      collectionType,
      quantity: Number(quantity) || 1,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      currentValue: currentValue ? Number(currentValue) : null,
      condition: condition || null,
      notes: notes || null,
      metadata: buildMetadata(),
    }
    if (initial?.id) {
      await fetch(`/api/collectibles/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/collectibles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    onSave()
  }

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white'
  const chk = 'flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer'

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Collection type</label>
        <select disabled={!!initial?.id} value={collectionType} onChange={e => setCollectionType(e.target.value)} className={inp}>
          {COLLECTION_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={inp} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className={inp} />
        <select value={condition} onChange={e => setCondition(e.target.value)} className={inp}>
          <option value="">Condition…</option>
          {['Mint', 'Near Mint', 'Good', 'Fair', 'Poor'].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="Purchase price (€)" className={inp} />
        <input type="number" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="Current value (€)" className={inp} />
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={`${inp} resize-none`} />

      {collectionType === 'Cards' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Card details</p>
          <input value={cardSet} onChange={e => setCardSet(e.target.value)} placeholder="Set name (e.g. Base Set)" className={inp} />
          <select value={cardRarity} onChange={e => setCardRarity(e.target.value)} className={inp}>
            <option value="">Rarity…</option>
            {['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare', 'Secret Rare', 'Promo'].map(r => <option key={r}>{r}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={cardGrade} onChange={e => setCardGrade(e.target.value)} placeholder="Grade (e.g. PSA 9)" className={inp} />
            <select value={cardGradingCompany} onChange={e => setCardGradingCompany(e.target.value)} className={inp}>
              {['None', 'PSA', 'BGS', 'CGC'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <input value={cardLanguage} onChange={e => setCardLanguage(e.target.value)} placeholder="Language (e.g. EN, JP)" className={inp} />
        </div>
      )}

      {collectionType === 'Funko Pop' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Funko Pop details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={funkoNumber} onChange={e => setFunkoNumber(e.target.value)} placeholder="#Number" className={inp} />
            <input value={funkoSeries} onChange={e => setFunkoSeries(e.target.value)} placeholder="Series / Franchise" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={funkoExclusive} onChange={e => setFunkoExclusive(e.target.value)} className={inp}>
              {['None', 'Amazon', 'GameStop', 'Target', 'Hot Topic', 'BoxLunch', 'SDCC', 'Other'].map(x => <option key={x}>{x}</option>)}
            </select>
            <select value={funkoBoxCondition} onChange={e => setFunkoBoxCondition(e.target.value)} className={inp}>
              <option value="">Box condition…</option>
              {['Mint', 'Good', 'Damaged'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <label className={chk}>
            <input type="checkbox" checked={funkoVaulted} onChange={e => setFunkoVaulted(e.target.checked)} className="accent-blue-500" />
            Vaulted
          </label>
        </div>
      )}

      {collectionType === 'Lego' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lego details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={legoSetNumber} onChange={e => setLegoSetNumber(e.target.value)} placeholder="Set number (e.g. 75192)" className={inp} />
            <input value={legoTheme} onChange={e => setLegoTheme(e.target.value)} placeholder="Theme (e.g. Star Wars)" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={legoYear} onChange={e => setLegoYear(e.target.value)} placeholder="Year" className={inp} />
            <input type="number" value={legoPieceCount} onChange={e => setLegoPieceCount(e.target.value)} placeholder="Pieces" className={inp} />
            <input type="number" value={legoMinifigCount} onChange={e => setLegoMinifigCount(e.target.value)} placeholder="Minifigs" className={inp} />
          </div>
          <label className={chk}>
            <input type="checkbox" checked={legoSealed} onChange={e => setLegoSealed(e.target.checked)} className="accent-blue-500" />
            Sealed / Unopened
          </label>
        </div>
      )}

      {collectionType === 'Figures' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Figure details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={figFranchise} onChange={e => setFigFranchise(e.target.value)} placeholder="Franchise (e.g. Dragon Ball Z)" className={inp} />
            <input value={figBrand} onChange={e => setFigBrand(e.target.value)} placeholder="Brand (e.g. Bandai)" className={inp} />
          </div>
          <input value={figScale} onChange={e => setFigScale(e.target.value)} placeholder="Scale (e.g. 1:12)" className={inp} />
          <label className={chk}>
            <input type="checkbox" checked={figSealed} onChange={e => setFigSealed(e.target.checked)} className="accent-blue-500" />
            Sealed / In box
          </label>
        </div>
      )}

      {collectionType === 'Books' && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Book / Manga / Comic details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={bookSeries} onChange={e => setBookSeries(e.target.value)} placeholder="Series (e.g. One Piece)" className={inp} />
            <input value={bookVolume} onChange={e => setBookVolume(e.target.value)} placeholder="Vol. / Issue #" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} placeholder="Author / Artist" className={inp} />
            <input value={bookPublisher} onChange={e => setBookPublisher(e.target.value)} placeholder="Publisher" className={inp} />
          </div>
          <input value={bookLanguage} onChange={e => setBookLanguage(e.target.value)} placeholder="Language (e.g. EN, JP)" className={inp} />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
          {initial?.id ? 'Save changes' : 'Add item'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-gray-300">
          Cancel
        </button>
      </div>
    </form>
  )
}
