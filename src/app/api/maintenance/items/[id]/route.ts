import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, notes } = await req.json()
  const item = await prisma.homeItem.update({
    where: { id: Number(params.id) },
    data: { name, notes: notes ?? null },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.homeItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
