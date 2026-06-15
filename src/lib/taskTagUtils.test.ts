// src/lib/taskTagUtils.test.ts
import { describe, it, expect } from 'vitest'
import { parseTags, serializeTags } from './taskTagUtils'

describe('parseTags', () => {
  it('splits comma-separated string into trimmed array', () => {
    expect(parseTags('work, personal , home')).toEqual(['work', 'personal', 'home'])
  })
  it('returns empty array for empty string', () => {
    expect(parseTags('')).toEqual([])
  })
  it('filters out blank entries from double commas', () => {
    expect(parseTags('work,,home')).toEqual(['work', 'home'])
  })
})

describe('serializeTags', () => {
  it('joins array into comma-separated string', () => {
    expect(serializeTags(['work', 'home'])).toBe('work,home')
  })
  it('returns empty string for empty array', () => {
    expect(serializeTags([])).toBe('')
  })
})
