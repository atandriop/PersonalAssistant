import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, collectionType, quantity, purchasePrice, currentValue, condition, notes, metadata } = await req.json()
  const item = await prisma.collectibleItem.update({
    where: { id: Number(params.id) },
    data: {
      name,
      collectionType,
      quantity: Number(quantity ?? 1),
      purchasePrice: purchasePrice != null ? Number(purchasePrice) : null,
      currentValue: currentValue != null ? Number(currentValue) : null,
      condition: condition ?? null,
      notes: notes ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
  return NextResponse.json({ ...item, metadata: item.metadata ? JSON.parse(item.metadata) : null })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.collectibleItem.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
