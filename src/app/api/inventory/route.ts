import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, badRequest, parseId, parsePositiveInt, requireFields } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

const FULL_INCLUDE = {
  category: true,
  upgradeTarget: { select: { id: true, name: true, cost: true } },
} as const

/** Just the fields dashboard/finance widgets reduce over. */
const SUMMARY_SELECT = {
  id: true, cost: true, currentValue: true, quantity: true,
  purchaseDate: true, categoryId: true,
} as const

export const GET = route(async (req: Request) => {
  // ?fields=summary avoids shipping ~107KB of rows (with the full category
  // object duplicated onto each) to callers that read a handful of fields.
  const summary = new URL(req.url).searchParams.get('fields') === 'summary'
  const items = summary
    ? await prisma.inventoryItem.findMany({ select: SUMMARY_SELECT, orderBy: { createdAt: 'desc' } })
    : await prisma.inventoryItem.findMany({ include: FULL_INCLUDE, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(items)
})

export const POST = route(async (req: Request) => {
  const body = await req.json()
  const missing = requireFields(body, ['name', 'cost', 'categoryId'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)

  const cost = Number(body.cost)
  if (!Number.isFinite(cost)) return badRequest('cost must be a number')
  const categoryId = parseId(String(body.categoryId))
  if (categoryId === null) return badRequest('Invalid categoryId')

  const item = await prisma.inventoryItem.create({
    data: {
      name: String(body.name).trim(),
      cost,
      currentValue: body.currentValue !== undefined && body.currentValue !== null && body.currentValue !== ''
        ? Number(body.currentValue)
        : null,
      // Number('') is 0, so clearing the quantity input zeroed the row's
      // contribution to every cost and value total.
      quantity: parsePositiveInt(body.quantity, 1),
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      notes: body.notes ?? null,
      categoryId,
      upgradeTargetId: body.upgradeTargetId ? Number(body.upgradeTargetId) : null,
    },
    include: FULL_INCLUDE,
  })
  return NextResponse.json(item, { status: 201 })
})
