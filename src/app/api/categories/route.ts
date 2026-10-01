import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, badRequest, parseRate, requireFields } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(categories)
})

export const POST = route(async (req: Request) => {
  const body = await req.json()
  const missing = requireFields(body, ['name'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)

  const { name, color, valueMethod, depreciationRate } = body
  // A rate outside [0, 1] makes the depreciation curve NaN and poisons every
  // inventory total. CategoryManager's min/max attributes never fire because
  // its save button is not inside a <form>, so validate here.
  const rate = parseRate(depreciationRate)
  if (depreciationRate !== undefined && depreciationRate !== null && depreciationRate !== '' && rate === null) {
    return badRequest('depreciationRate must be a number between 0 and 1')
  }

  const category = await prisma.category.create({
    data: {
      name: String(name).trim(),
      color,
      valueMethod: valueMethod ?? 'cost',
      depreciationRate: rate,
    },
  })
  return NextResponse.json(category, { status: 201 })
})
