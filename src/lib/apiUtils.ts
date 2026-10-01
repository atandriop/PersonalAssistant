import { NextResponse } from 'next/server'

/**
 * Parse a route param id. Returns null for anything that is not a positive
 * integer — `Number(params.id)` alone yields NaN for '/api/goals/abc', which
 * reaches Prisma and throws an unhandled 500.
 */
export function parseId(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

/** Parse a count that must be >= 1, falling back when absent or unusable. */
export function parsePositiveInt(raw: unknown, fallback: number): number {
  if (raw === null || raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.trunc(n)
}

/** Parse a depreciation rate, which must sit in [0, 1]. Null if unusable. */
export function parseRate(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) return null
  return n
}

/** Names of the required fields absent from a request body. */
export function requireFields(body: unknown, fields: string[]): string[] {
  if (typeof body !== 'object' || body === null) return [...fields]
  const b = body as Record<string, unknown>
  return fields.filter(f => {
    const v = b[f]
    if (v === null || v === undefined) return true
    return typeof v === 'string' && v.trim() === ''
  })
}

/** Map a known Prisma error code to a client-meaningful status, else null. */
export function mapPrismaError(e: unknown): { status: number; error: string } | null {
  if (typeof e !== 'object' || e === null) return null
  const code = (e as { code?: unknown }).code
  if (typeof code !== 'string') return null

  if (code === 'P2025') return { status: 404, error: 'Not found' }
  if (code === 'P2002') {
    const target = (e as { meta?: { target?: unknown } }).meta?.target
    const fields = Array.isArray(target) ? target.join(', ') : null
    return { status: 409, error: fields ? `Already exists: ${fields}` : 'Already exists' }
  }
  if (code === 'P2003' || code === 'P2014') {
    return { status: 409, error: 'Still referenced by other records' }
  }
  return null
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export function notFound(error = 'Not found') {
  return NextResponse.json({ error }, { status: 404 })
}

export function conflict(error: string) {
  return NextResponse.json({ error }, { status: 409 })
}

type RouteHandler<P> = (req: Request, ctx: { params: P }) => Promise<Response>

/**
 * Wrap a route handler so a thrown Prisma error becomes a meaningful status and
 * a JSON {error} body instead of an unhandled rejection and an HTML 500 page.
 */
export function route<P = Record<string, string>>(handler: RouteHandler<P>): RouteHandler<P> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      const mapped = mapPrismaError(e)
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status })
      console.error(`${req.method} ${req.url} failed:`, e)
      const message = e instanceof Error ? e.message : 'Internal error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
