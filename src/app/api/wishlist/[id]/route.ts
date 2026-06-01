import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const item = await prisma.wishlistItem.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name,
      url: data.url ?? null,
      cost: Number(data.cost),
      priority: data.priority,
      notes: data.notes ?? null,
      categoryId: Number(data.categoryId),
      purchased: data.purchased ?? undefined,
    },
    include: { category: true, inventoryUpgrades: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.wishlistItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
