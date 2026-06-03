import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, ring, category, notes } = await req.json()
  const id = Number(params.id)

  const existing = await prisma.techRadarItem.findUnique({ where: { id } })
  const ringChanged = existing && existing.ring !== ring

  const item = await prisma.techRadarItem.update({
    where: { id },
    data: {
      name,
      ring,
      category,
      notes: notes ?? null,
      ...(ringChanged ? {
        previousRing: existing.ring,
        ringChangedAt: new Date().toISOString().slice(0, 10),
      } : {}),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.techRadarItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
