import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, badRequest, parseId, requireFields } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

const FULL_INCLUDE = {
  category: true,
  inventoryUpgrades: { select: { id: true, name: true } },
} as const

/** Just the fields the dashboard and finance widgets reduce over. */
const SUMMARY_SELECT = {
  id: true, cost: true, priority: true, purchased: true, categoryId: true,
} as const

export const GET = route(async (req: Request) => {
  // ?fields=summary avoids shipping ~59KB of rows (with the full category object
  // duplicated onto each) to callers that read three or four fields.
  const summary = new URL(req.url).searchParams.get('fields') === 'summary'
  const items = summary
    ? await prisma.wishlistItem.findMany({ select: SUMMARY_SELECT, orderBy: { createdAt: 'desc' } })
    : await prisma.wishlistItem.findMany({ include: FULL_INCLUDE, orderBy: { createdAt: 'desc' } })
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

  const item = await prisma.wishlistItem.create({
    data: {
      name: String(body.name).trim(),
      url: body.url ?? null,
      cost,
      priority: body.priority ?? 'Medium',
      notes: body.notes ?? null,
      categoryId,
    },
    include: FULL_INCLUDE,
  })
  return NextResponse.json(item, { status: 201 })
})
