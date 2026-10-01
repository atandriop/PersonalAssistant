import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound, conflict, parseRate, requireFields } from '@/lib/apiUtils'

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid category id')
  const body = await req.json()
  const missing = requireFields(body, ['name'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)

  const { name, color, valueMethod, depreciationRate } = body
  const rate = parseRate(depreciationRate)
  if (depreciationRate !== undefined && depreciationRate !== null && depreciationRate !== '' && rate === null) {
    return badRequest('depreciationRate must be a number between 0 and 1')
  }

  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('Category not found')

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: String(name).trim(),
      color,
      valueMethod: valueMethod ?? 'cost',
      depreciationRate: rate,
    },
  })
  return NextResponse.json(category)
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid category id')

  // The FK is ON DELETE RESTRICT, so deleting a category still in use threw a
  // bare 500 that the client ignored, leaving the category visibly undeleted.
  const [inventoryCount, wishlistCount] = await Promise.all([
    prisma.inventoryItem.count({ where: { categoryId: id } }),
    prisma.wishlistItem.count({ where: { categoryId: id } }),
  ])
  const inUse = inventoryCount + wishlistCount
  if (inUse > 0) {
    return conflict(`Category is still used by ${inUse} item${inUse === 1 ? '' : 's'}`)
  }

  await prisma.category.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
