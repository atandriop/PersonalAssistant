import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound } from '@/lib/apiUtils'

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid subscription id')
  const data = await req.json()

  const existing = await prisma.subscription.findUnique({ where: { id } })
  if (!existing) return notFound('Subscription not found')

  const cost = data.cost !== undefined ? Number(data.cost) : existing.cost
  if (!Number.isFinite(cost)) return badRequest('cost must be a number')

  const subscription = await prisma.subscription.update({
    where: { id },
    data: {
      name: data.name !== undefined ? String(data.name).trim() : existing.name,
      cost,
      period: data.period !== undefined ? data.period : existing.period,
      // Stored verbatim as YYYY-MM-DD, like every other date in the schema.
      renewalDate: data.renewalDate !== undefined ? (data.renewalDate || null) : existing.renewalDate,
      url: data.url !== undefined ? (data.url ?? null) : existing.url,
      notes: data.notes !== undefined ? (data.notes ?? null) : existing.notes,
      active: data.active !== undefined ? data.active : existing.active,
      category: data.category ?? existing.category,
    },
  })
  return NextResponse.json(subscription)
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid subscription id')
  await prisma.subscription.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
