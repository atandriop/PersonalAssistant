import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, badRequest, requireFields } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ renewalDate: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(subscriptions)
})

export const POST = route(async (req: Request) => {
  const body = await req.json()
  const missing = requireFields(body, ['name', 'cost', 'period'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)

  const cost = Number(body.cost)
  if (!Number.isFinite(cost)) return badRequest('cost must be a number')

  const subscription = await prisma.subscription.create({
    data: {
      name: String(body.name).trim(),
      cost,
      period: body.period,
      // Stored verbatim as YYYY-MM-DD, like every other date in the schema.
      renewalDate: body.renewalDate || null,
      url: body.url ?? null,
      notes: body.notes ?? null,
      active: body.active ?? true,
      category: body.category ?? 'Other',
    },
  })
  return NextResponse.json(subscription, { status: 201 })
})
