import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetcher, errorMessage, mutateJson, HttpError } from './fetcher'

function response(body: string, init: { status?: number; statusText?: string } = {}): Response {
  return new Response(body, { status: init.status ?? 200, statusText: init.statusText ?? '' })
}

afterEach(() => { vi.unstubAllGlobals() })

describe('errorMessage', () => {
  it('extracts the server error field', async () => {
    expect(await errorMessage(response('{"error":"Category is still used by 3 items"}', { status: 409 })))
      .toBe('Category is still used by 3 items')
  })
  it('falls back to the status for an empty body', async () => {
    expect(await errorMessage(response('', { status: 500, statusText: 'Internal Server Error' })))
      .toBe('500 Internal Server Error')
  })
  it('does not surface an HTML error page as the message', async () => {
    const msg = await errorMessage(response('<!DOCTYPE html><h1>Server Error</h1>', { status: 500 }))
    expect(msg).not.toContain('<')
  })
  it('falls back to the status when JSON has no error field', async () => {
    expect(await errorMessage(response('{"ok":false}', { status: 400, statusText: 'Bad Request' })))
      .toBe('400 Bad Request')
  })
})

describe('fetcher', () => {
  it('returns parsed JSON for a 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('{"id":1}')))
    expect(await fetcher('/api/x')).toEqual({ id: 1 })
  })
  it('throws on a 500 instead of parsing an HTML error page as JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('<!DOCTYPE html><h1>Error</h1>', { status: 500 })))
    await expect(fetcher('/api/x')).rejects.toThrow(HttpError)
  })
  it('carries the status on the thrown error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('{"error":"Not found"}', { status: 404 })))
    await expect(fetcher('/api/x')).rejects.toMatchObject({ status: 404, message: 'Not found' })
  })
  it('throws on a 400 carrying a validation message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('{"error":"Missing required field: name"}', { status: 400 })))
    await expect(fetcher('/api/x')).rejects.toThrow('Missing required field: name')
  })
})

describe('mutateJson', () => {
  it('returns null for a 204 rather than failing to parse an empty body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    expect(await mutateJson('/api/x', { method: 'DELETE' })).toBeNull()
  })
  it('returns the created object for a 201', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('{"id":7}', { status: 201 })))
    expect(await mutateJson('/api/x', { method: 'POST', body: '{}' })).toEqual({ id: 7 })
  })
  it('throws on a 409 so a failed mutation cannot read as success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('{"error":"Already exists: date"}', { status: 409 })))
    await expect(mutateJson('/api/x', { method: 'POST', body: '{}' })).rejects.toThrow('Already exists: date')
  })
  it('sends a JSON content-type by default', async () => {
    const spy = vi.fn((url: string, init?: RequestInit) => {
      void url; void init
      return Promise.resolve(response('{}'))
    })
    vi.stubGlobal('fetch', spy)
    await mutateJson('/api/x', { method: 'POST', body: '{}' })
    expect(spy.mock.calls[0]?.[1]?.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })
})
