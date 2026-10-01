import { describe, it, expect } from 'vitest'
import { parseId, parsePositiveInt, parseRate, requireFields, mapPrismaError } from './apiUtils'

describe('parseId', () => {
  it('parses a positive integer string', () => {
    expect(parseId('5')).toBe(5)
  })
  it('parses a large id', () => {
    expect(parseId('999999')).toBe(999999)
  })
  it('rejects a non-numeric string rather than yielding NaN', () => {
    // Number('abc') is NaN, which Prisma rejects with an unhandled 500.
    expect(parseId('abc')).toBeNull()
  })
  it('rejects an empty string', () => {
    expect(parseId('')).toBeNull()
  })
  it('rejects undefined', () => {
    expect(parseId(undefined)).toBeNull()
  })
  it('rejects a trailing-garbage id', () => {
    expect(parseId('5abc')).toBeNull()
  })
  it('rejects a fractional id', () => {
    expect(parseId('1.5')).toBeNull()
  })
  it('rejects zero and negatives, which no autoincrement row uses', () => {
    expect(parseId('0')).toBeNull()
    expect(parseId('-1')).toBeNull()
  })
  it('rejects whitespace', () => {
    expect(parseId('  ')).toBeNull()
  })
})

describe('parsePositiveInt', () => {
  it('parses a numeric string', () => {
    expect(parsePositiveInt('3', 1)).toBe(3)
  })
  it('parses a number', () => {
    expect(parsePositiveInt(7, 1)).toBe(7)
  })
  it('falls back for an empty string rather than yielding 0', () => {
    // Number('') is 0, so clearing a quantity input zeroed the row's value.
    expect(parsePositiveInt('', 1)).toBe(1)
  })
  it('falls back for null and undefined', () => {
    expect(parsePositiveInt(null, 1)).toBe(1)
    expect(parsePositiveInt(undefined, 1)).toBe(1)
  })
  it('falls back for zero and negatives', () => {
    expect(parsePositiveInt(0, 1)).toBe(1)
    expect(parsePositiveInt(-4, 1)).toBe(1)
  })
  it('falls back for a non-numeric string', () => {
    expect(parsePositiveInt('many', 1)).toBe(1)
  })
  it('truncates a fractional quantity', () => {
    expect(parsePositiveInt(2.7, 1)).toBe(2)
  })
  it('honours a non-1 fallback', () => {
    expect(parsePositiveInt('', 5)).toBe(5)
  })
})

describe('parseRate', () => {
  it('parses a rate inside the unit interval', () => {
    expect(parseRate('0.3')).toBeCloseTo(0.3)
  })
  it('accepts the boundaries', () => {
    expect(parseRate(0)).toBe(0)
    expect(parseRate(1)).toBe(1)
  })
  it('rejects a rate above 1, which makes depreciation NaN', () => {
    expect(parseRate(1.5)).toBeNull()
  })
  it('rejects a negative rate', () => {
    expect(parseRate(-0.2)).toBeNull()
  })
  it('rejects a non-numeric value', () => {
    expect(parseRate('half')).toBeNull()
    expect(parseRate('')).toBeNull()
  })
  it('returns null for null and undefined so the column stays null', () => {
    expect(parseRate(null)).toBeNull()
    expect(parseRate(undefined)).toBeNull()
  })
})

describe('requireFields', () => {
  it('returns no missing fields when all are present', () => {
    expect(requireFields({ name: 'x', cost: 1 }, ['name', 'cost'])).toEqual([])
  })
  it('names an absent field', () => {
    expect(requireFields({ cost: 1 }, ['name', 'cost'])).toEqual(['name'])
  })
  it('names every absent field in order', () => {
    expect(requireFields({}, ['name', 'cost'])).toEqual(['name', 'cost'])
  })
  it('treats null and undefined as missing', () => {
    expect(requireFields({ name: null, cost: undefined }, ['name', 'cost'])).toEqual(['name', 'cost'])
  })
  it('treats an empty or whitespace-only string as missing', () => {
    expect(requireFields({ name: '', cost: 1 }, ['name', 'cost'])).toEqual(['name'])
    expect(requireFields({ name: '   ', cost: 1 }, ['name', 'cost'])).toEqual(['name'])
  })
  it('accepts zero and false as present values', () => {
    expect(requireFields({ cost: 0, active: false }, ['cost', 'active'])).toEqual([])
  })
  it('treats a non-object body as missing everything', () => {
    expect(requireFields(null, ['name'])).toEqual(['name'])
    expect(requireFields('nope', ['name'])).toEqual(['name'])
  })
})

describe('mapPrismaError', () => {
  it('maps a missing-record error to 404', () => {
    expect(mapPrismaError({ code: 'P2025' })).toEqual({ status: 404, error: 'Not found' })
  })
  it('maps a unique-constraint error to 409', () => {
    expect(mapPrismaError({ code: 'P2002' })?.status).toBe(409)
  })
  it('names the conflicting field in a unique-constraint message', () => {
    expect(mapPrismaError({ code: 'P2002', meta: { target: ['date'] } })?.error).toContain('date')
  })
  it('maps a foreign-key constraint failure to 409', () => {
    expect(mapPrismaError({ code: 'P2003' })?.status).toBe(409)
    expect(mapPrismaError({ code: 'P2014' })?.status).toBe(409)
  })
  it('returns null for an unrecognised Prisma code so it surfaces as a 500', () => {
    expect(mapPrismaError({ code: 'P9999' })).toBeNull()
  })
  it('returns null for a plain error', () => {
    expect(mapPrismaError(new Error('boom'))).toBeNull()
    expect(mapPrismaError(null)).toBeNull()
  })
})
