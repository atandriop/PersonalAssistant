import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { addMonths, getTaskStatus, MaintenanceTask } from './maintenance'

const task = (t: Partial<MaintenanceTask>): MaintenanceTask => ({
  id: 1,
  description: 'Replace filter',
  intervalMonths: null,
  dueDate: null,
  lastDoneDate: null,
  createdAt: '2026-06-01T10:30:00.000Z',
  ...t,
})

describe('addMonths', () => {
  it('adds one month', () => {
    expect(addMonths('2026-05-10', 1)).toBe('2026-06-10')
  })
  it('returns the same date for 0 months', () => {
    expect(addMonths('2026-05-10', 0)).toBe('2026-05-10')
  })
  it('crosses a year boundary going forward', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })
  it('crosses a year boundary going backward', () => {
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
  })
  it('clamps Jan 31 to the last day of February', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('clamps to Feb 29 in a leap year', () => {
    expect(addMonths('2024-01-29', 1)).toBe('2024-02-29')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  })
  it('clamps a leap day to Feb 28 in the following non-leap year', () => {
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28')
  })
  it('keeps a leap day when landing on another leap year', () => {
    expect(addMonths('2024-02-29', 48)).toBe('2028-02-29')
  })
  it('clamps when adding more than 12 months', () => {
    expect(addMonths('2026-01-31', 13)).toBe('2027-02-28')
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28')
  })
  it('clamps when subtracting months', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(addMonths('2026-05-31', -3)).toBe('2026-02-28')
  })
  it('clamps 31-day months to 30-day months', () => {
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30')
    expect(addMonths('2026-08-31', 1)).toBe('2026-09-30')
  })
  it('adds a full year with 12 months', () => {
    expect(addMonths('2026-07-08', 12)).toBe('2027-07-08')
  })
})

describe('getTaskStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns none when the task has neither an interval nor a due date', () => {
    expect(getTaskStatus(task({}))).toEqual({ status: 'none', nextDue: null })
  })

  describe('interval-based tasks', () => {
    it('is overdue when the next interval date has passed', () => {
      expect(getTaskStatus(task({ intervalMonths: 3, lastDoneDate: '2026-01-15' })))
        .toEqual({ status: 'overdue', nextDue: '2026-04-15' })
    })
    it('is due-soon when the next interval date is today', () => {
      expect(getTaskStatus(task({ intervalMonths: 1, lastDoneDate: '2026-05-15' })))
        .toEqual({ status: 'due-soon', nextDue: '2026-06-15' })
    })
    it('is due-soon exactly 30 days out', () => {
      expect(getTaskStatus(task({ intervalMonths: 1, lastDoneDate: '2026-06-15' })))
        .toEqual({ status: 'due-soon', nextDue: '2026-07-15' })
    })
    it('is ok one day beyond the 30-day window', () => {
      expect(getTaskStatus(task({ intervalMonths: 1, lastDoneDate: '2026-06-16' })))
        .toEqual({ status: 'ok', nextDue: '2026-07-16' })
    })
    it('is ok when the next interval date is far out', () => {
      expect(getTaskStatus(task({ intervalMonths: 12, lastDoneDate: '2026-06-01' })))
        .toEqual({ status: 'ok', nextDue: '2027-06-01' })
    })
    it('falls back to createdAt when the task has never been done', () => {
      expect(getTaskStatus(task({ intervalMonths: 1, lastDoneDate: null })))
        .toEqual({ status: 'due-soon', nextDue: '2026-07-01' })
    })
    it('clamps the next interval date to the end of a short month', () => {
      expect(getTaskStatus(task({ intervalMonths: 1, lastDoneDate: '2026-01-31' })))
        .toEqual({ status: 'overdue', nextDue: '2026-02-28' })
    })
    it('treats an interval of 0 months as due on the last-done date', () => {
      expect(getTaskStatus(task({ intervalMonths: 0, lastDoneDate: '2026-06-15' })))
        .toEqual({ status: 'due-soon', nextDue: '2026-06-15' })
    })
    it('ignores dueDate when an interval is set', () => {
      expect(getTaskStatus(task({ intervalMonths: 1, lastDoneDate: '2026-05-15', dueDate: '2030-01-01' })))
        .toEqual({ status: 'due-soon', nextDue: '2026-06-15' })
    })
  })

  describe('one-off due-date tasks', () => {
    it('is overdue when the due date has passed', () => {
      expect(getTaskStatus(task({ dueDate: '2026-06-01' })))
        .toEqual({ status: 'overdue', nextDue: '2026-06-01' })
    })
    it('is due-soon when the due date is today', () => {
      expect(getTaskStatus(task({ dueDate: '2026-06-15' })))
        .toEqual({ status: 'due-soon', nextDue: '2026-06-15' })
    })
    it('is due-soon exactly 30 days out', () => {
      expect(getTaskStatus(task({ dueDate: '2026-07-15' })))
        .toEqual({ status: 'due-soon', nextDue: '2026-07-15' })
    })
    it('is ok one day beyond the 30-day window', () => {
      expect(getTaskStatus(task({ dueDate: '2026-07-16' })))
        .toEqual({ status: 'ok', nextDue: '2026-07-16' })
    })
    it('returns none once it has been done after the due date', () => {
      expect(getTaskStatus(task({ dueDate: '2026-06-01', lastDoneDate: '2026-06-02' })))
        .toEqual({ status: 'none', nextDue: null })
    })
    it('returns none when done exactly on the due date', () => {
      expect(getTaskStatus(task({ dueDate: '2026-06-01', lastDoneDate: '2026-06-01' })))
        .toEqual({ status: 'none', nextDue: null })
    })
    it('stays overdue when the last-done date predates the due date', () => {
      expect(getTaskStatus(task({ dueDate: '2026-06-01', lastDoneDate: '2026-05-31' })))
        .toEqual({ status: 'overdue', nextDue: '2026-06-01' })
    })
  })

  it('handles the 30-day window crossing a year boundary', () => {
    vi.setSystemTime(new Date('2026-12-20T12:00:00'))
    expect(getTaskStatus(task({ dueDate: '2027-01-10' })))
      .toEqual({ status: 'due-soon', nextDue: '2027-01-10' })
    expect(getTaskStatus(task({ dueDate: '2027-01-20' })))
      .toEqual({ status: 'ok', nextDue: '2027-01-20' })
  })

  it('handles the 30-day window crossing a DST transition', () => {
    // Europe DST starts on the last Sunday of March; +30 days must stay a
    // whole-day offset, not 30 days minus an hour.
    vi.setSystemTime(new Date('2026-03-20T12:00:00'))
    expect(getTaskStatus(task({ dueDate: '2026-04-19' })))
      .toEqual({ status: 'due-soon', nextDue: '2026-04-19' })
    expect(getTaskStatus(task({ dueDate: '2026-04-20' })))
      .toEqual({ status: 'ok', nextDue: '2026-04-20' })
  })
})
