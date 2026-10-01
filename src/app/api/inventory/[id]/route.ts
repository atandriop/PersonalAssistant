import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound, parsePositiveInt, requireFields } from '@/lib/apiUtils'

const FULL_INCLUDE = {
  category: true,
  upgradeTarget: { select: { id: true, name: true, cost: true } },
} as const

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid inventory item id')
  const data = await req.json()

  const missing = requireFields(data, ['name', 'cost', 'categoryId'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)

  const cost = Number(data.cost)
  if (!Number.isFinite(cost)) return badRequest('cost must be a number')
  const categoryId = parseId(String(data.categoryId))
  if (categoryId === null) return badRequest('Invalid categoryId')

  const existing = await prisma.inventoryItem.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('Inventory item not found')

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: String(data.name).trim(),
      cost,
      currentValue: data.currentValue !== undefined && data.currentValue !== null && data.currentValue !== ''
        ? Number(data.currentValue)
        : null,
      quantity: parsePositiveInt(data.quantity, 1),
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      notes: data.notes ?? null,
      categoryId,
      upgradeTargetId: data.upgradeTargetId ? Number(data.upgradeTargetId) : null,
    },
    include: FULL_INCLUDE,
  })
  return NextResponse.json(item)
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid inventory item id')
  await prisma.inventoryItem.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
