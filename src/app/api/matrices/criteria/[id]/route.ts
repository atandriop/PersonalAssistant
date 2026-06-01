import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, weight } = await req.json()
  const criterion = await prisma.matrixCriteria.update({
    where: { id: Number(params.id) },
    data: { name, weight: Number(weight) },
  })
  return NextResponse.json(criterion)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.matrixCriteria.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
