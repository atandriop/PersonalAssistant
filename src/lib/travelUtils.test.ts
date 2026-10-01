import { describe, it, expect } from 'vitest'
import { serializeTrip, RawTrip } from './travelUtils'

const trip = (t: Partial<RawTrip> = {}): RawTrip => ({
  id: 1,
  countryId: 2,
  cities: null,
  companions: null,
  company: null,
  startDate: '2026-05-01',
  endDate: '2026-05-08',
  actualCost: null,
  rating: 4,
  notes: null,
  bucketTripId: null,
  createdAt: new Date('2026-04-01T09:00:00.000Z'),
  country: { name: 'Japan' },
  memories: [],
  costLines: [],
  ...t,
})

const line = (id: number, category: string, amount: number) =>
  ({ id, category, amount, label: null, memoryId: null })

describe('serializeTrip', () => {
  it('passes scalar fields through unchanged', () => {
    const result = serializeTrip(trip({ company: 'Acme', notes: 'Cherry blossoms', bucketTripId: 9 }))
    expect(result.id).toBe(1)
    expect(result.countryId).toBe(2)
    expect(result.startDate).toBe('2026-05-01')
    expect(result.endDate).toBe('2026-05-08')
    expect(result.rating).toBe(4)
    expect(result.company).toBe('Acme')
    expect(result.notes).toBe('Cherry blossoms')
    expect(result.bucketTripId).toBe(9)
  })

  it('flattens the country relation to countryName and drops country', () => {
    const result = serializeTrip(trip())
    expect(result.countryName).toBe('Japan')
    expect(result).not.toHaveProperty('country')
  })

  it('serializes createdAt as an ISO string', () => {
    expect(serializeTrip(trip()).createdAt).toBe('2026-04-01T09:00:00.000Z')
  })

  it('handles a trip with no dates', () => {
    const result = serializeTrip(trip({ startDate: null, endDate: null }))
    expect(result.startDate).toBeNull()
    expect(result.endDate).toBeNull()
  })

  describe('cities and companions', () => {
    it('parses the stored JSON arrays', () => {
      const result = serializeTrip(trip({ cities: '["Tokyo","Kyoto"]', companions: '["Alice"]' }))
      expect(result.cities).toEqual(['Tokyo', 'Kyoto'])
      expect(result.companions).toEqual(['Alice'])
    })
    it('returns empty arrays when both are null', () => {
      const result = serializeTrip(trip({ cities: null, companions: null }))
      expect(result.cities).toEqual([])
      expect(result.companions).toEqual([])
    })
    it('returns empty arrays for empty strings', () => {
      const result = serializeTrip(trip({ cities: '', companions: '' }))
      expect(result.cities).toEqual([])
      expect(result.companions).toEqual([])
    })
    it('parses stored empty JSON arrays', () => {
      const result = serializeTrip(trip({ cities: '[]', companions: '[]' }))
      expect(result.cities).toEqual([])
      expect(result.companions).toEqual([])
    })
  })

  describe('actualCost', () => {
    it('falls back to the stored actualCost when there are no cost lines', () => {
      expect(serializeTrip(trip({ actualCost: 1500, costLines: [] })).actualCost).toBe(1500)
    })
    it('is null when there are neither cost lines nor a stored cost', () => {
      expect(serializeTrip(trip({ actualCost: null, costLines: [] })).actualCost).toBeNull()
    })
    it('sums the cost lines', () => {
      const result = serializeTrip(trip({
        costLines: [line(1, 'hotel', 600), line(2, 'airfare', 850.5), line(3, 'food', 200)],
      }))
      expect(result.actualCost).toBeCloseTo(1650.5)
    })
    it('prefers the cost-line total over the stored actualCost', () => {
      const result = serializeTrip(trip({ actualCost: 9999, costLines: [line(1, 'hotel', 600)] }))
      expect(result.actualCost).toBe(600)
    })
    it('keeps a zero total rather than falling back to the stored cost', () => {
      const result = serializeTrip(trip({ actualCost: 9999, costLines: [line(1, 'hotel', 0)] }))
      expect(result.actualCost).toBe(0)
    })
    it('handles a negative line (a refund)', () => {
      const result = serializeTrip(trip({
        costLines: [line(1, 'hotel', 600), line(2, 'hotel', -100)],
      }))
      expect(result.actualCost).toBe(500)
    })
  })

  describe('cost lines', () => {
    it('returns an empty array when there are none', () => {
      expect(serializeTrip(trip({ costLines: [] })).costLines).toEqual([])
    })
    it('keeps the lines in the order given, with labels and memory links', () => {
      const result = serializeTrip(trip({
        costLines: [
          { id: 1, category: 'airfare', amount: 850, label: 'Return flight', memoryId: 42 },
          { id: 2, category: 'hotel', amount: 600, label: null, memoryId: null },
        ],
      }))
      expect(result.costLines).toEqual([
        { id: 1, category: 'airfare', amount: 850, label: 'Return flight', memoryId: 42 },
        { id: 2, category: 'hotel', amount: 600, label: null, memoryId: null },
      ])
    })
  })

  describe('memories', () => {
    it('returns an empty array when the trip has none', () => {
      expect(serializeTrip(trip({ memories: [] })).memories).toEqual([])
    })
    it('flattens the join rows to plain memories', () => {
      const result = serializeTrip(trip({
        memories: [
          { memory: { id: 11, title: 'Shibuya crossing', date: '2026-05-02' } },
          { memory: { id: 12, title: 'Fushimi Inari', date: '2026-05-05' } },
        ],
      }))
      expect(result.memories).toEqual([
        { id: 11, title: 'Shibuya crossing', date: '2026-05-02' },
        { id: 12, title: 'Fushimi Inari', date: '2026-05-05' },
      ])
      expect(result.memories[0]).not.toHaveProperty('memory')
    })
  })
})
