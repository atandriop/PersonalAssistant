import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, ring, category, notes } = await req.json()
  const item = await prisma.techRadarItem.update({
    where: { id: Number(params.id) },
    data: { name, ring, category, notes: notes ?? null },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.techRadarItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
