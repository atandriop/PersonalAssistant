import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { todayLocal, addDays } from '@/lib/dateUtils'
import { route, badRequest } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

/**
 * Logs for several habits in one query, grouped by habitId.
 *
 * Replaces an N+1 over HTTP: every habit row fetched /api/habits/[id]/logs
 * separately, so H habits meant H requests and H Prisma queries, each pulling 84
 * days of logs, with the page re-rendering as each one landed at a different
 * time. The @@unique([habitId, date]) index already serves this shape.
 *
 * ?habitIds=1,2,3 (required), ?since=YYYY-MM-DD (defaults to 84 days ago).
 */
export const GET = route(async (req: Request) => {
  const { searchParams } = new URL(req.url)

  const raw = searchParams.get('habitIds')
  if (!raw) return badRequest('habitIds required')

  const habitIds = raw.split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n > 0)
  if (habitIds.length === 0) return badRequest('habitIds must contain at least one positive integer')

  const since = searchParams.get('since') ?? addDays(todayLocal(), -84)

  const logs = await prisma.habitLog.findMany({
    where: { habitId: { in: habitIds }, date: { gte: since } },
    select: { habitId: true, date: true, note: true },
    orderBy: { date: 'desc' },
  })

  // Every requested id gets a key, so callers need not distinguish "no logs"
  // from "not fetched".
  const grouped: Record<number, { date: string; note: string | null }[]> = {}
  for (const id of habitIds) grouped[id] = []
  for (const l of logs) grouped[l.habitId].push({ date: l.date, note: l.note })

  return NextResponse.json(grouped)
})
