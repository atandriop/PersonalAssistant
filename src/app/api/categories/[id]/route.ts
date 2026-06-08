import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, color, valueMethod, depreciationRate } = await req.json()
  const category = await prisma.category.update({
    where: { id: Number(params.id) },
    data: {
      name,
      color,
      valueMethod: valueMethod ?? 'cost',
      depreciationRate: depreciationRate !== undefined && depreciationRate !== null
        ? Number(depreciationRate)
        : null,
    },
  })
  return NextResponse.json(category)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.category.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
