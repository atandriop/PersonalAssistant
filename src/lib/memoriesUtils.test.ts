import { describe, it, expect } from 'vitest'
import { serializeMemory } from './memoriesUtils'

type RawMemory = Parameters<typeof serializeMemory>[0]

const memory = (m: Partial<RawMemory> = {}): RawMemory => ({
  id: 1,
  title: 'Graduation',
  date: '2026-06-15',
  endDate: null,
  category: 'Education',
  location: 'Dublin',
  notes: null,
  tags: '',
  companions: null,
  company: null,
  createdAt: new Date('2026-06-16T08:30:00.000Z'),
  trips: [],
  ...m,
})

describe('serializeMemory', () => {
  it('passes scalar fields through unchanged', () => {
    const result = serializeMemory(memory({ endDate: '2026-06-17', notes: 'A good day', company: 'Acme' }))
    expect(result.id).toBe(1)
    expect(result.title).toBe('Graduation')
    expect(result.date).toBe('2026-06-15')
    expect(result.endDate).toBe('2026-06-17')
    expect(result.category).toBe('Education')
    expect(result.location).toBe('Dublin')
    expect(result.notes).toBe('A good day')
    expect(result.company).toBe('Acme')
  })

  it('serializes createdAt as an ISO string', () => {
    expect(serializeMemory(memory()).createdAt).toBe('2026-06-16T08:30:00.000Z')
  })

  describe('tags', () => {
    it('splits a comma-separated string', () => {
      expect(serializeMemory(memory({ tags: 'family,milestone' })).tags).toEqual(['family', 'milestone'])
    })
    it('trims whitespace around each tag', () => {
      expect(serializeMemory(memory({ tags: 'family, milestone , trip' })).tags)
        .toEqual(['family', 'milestone', 'trip'])
    })
    it('drops blank entries from double commas', () => {
      expect(serializeMemory(memory({ tags: 'family,,trip' })).tags).toEqual(['family', 'trip'])
    })
    it('returns an empty array for an empty tag string', () => {
      expect(serializeMemory(memory({ tags: '' })).tags).toEqual([])
    })
    it('returns an empty array for a string of only separators', () => {
      expect(serializeMemory(memory({ tags: ', ,' })).tags).toEqual([])
    })
  })

  describe('companions', () => {
    it('parses the stored JSON array', () => {
      expect(serializeMemory(memory({ companions: '["Alice","Bob"]' })).companions)
        .toEqual(['Alice', 'Bob'])
    })
    it('returns an empty array when companions is null', () => {
      expect(serializeMemory(memory({ companions: null })).companions).toEqual([])
    })
    it('returns an empty array for an empty companions string', () => {
      expect(serializeMemory(memory({ companions: '' })).companions).toEqual([])
    })
    it('parses a stored empty JSON array', () => {
      expect(serializeMemory(memory({ companions: '[]' })).companions).toEqual([])
    })
  })

  describe('trips', () => {
    it('returns an empty array when the memory is linked to no trips', () => {
      expect(serializeMemory(memory({ trips: [] })).trips).toEqual([])
    })
    it('flattens the country name onto each linked trip', () => {
      const result = serializeMemory(memory({
        trips: [
          { trip: { id: 7, startDate: '2026-05-01', country: { name: 'Japan' } } },
          { trip: { id: 8, startDate: null, country: { name: 'Peru' } } },
        ],
      }))
      expect(result.trips).toEqual([
        { id: 7, countryName: 'Japan', startDate: '2026-05-01' },
        { id: 8, countryName: 'Peru', startDate: null },
      ])
    })
  })

  it('does not leak the raw relation shape', () => {
    const result = serializeMemory(memory({
      trips: [{ trip: { id: 7, startDate: '2026-05-01', country: { name: 'Japan' } } }],
    }))
    expect(result.trips[0]).not.toHaveProperty('trip')
    expect(result.trips[0]).not.toHaveProperty('country')
  })
})
