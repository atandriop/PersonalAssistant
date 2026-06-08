import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const item = await prisma.inventoryItem.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name,
      cost: Number(data.cost),
      currentValue: data.currentValue !== undefined && data.currentValue !== null && data.currentValue !== ''
        ? Number(data.currentValue)
        : null,
      quantity: Number(data.quantity ?? 1),
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      notes: data.notes ?? null,
      categoryId: Number(data.categoryId),
      upgradeTargetId: data.upgradeTargetId ? Number(data.upgradeTargetId) : null,
    },
    include: { category: true, upgradeTarget: { select: { id: true, name: true, cost: true } } },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.inventoryItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
