import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.inventoryItem.findMany({
    include: { category: true, upgradeTarget: { select: { id: true, name: true, cost: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { name, cost, quantity, purchaseDate, notes, categoryId, upgradeTargetId, currentValue } = await req.json()
  const item = await prisma.inventoryItem.create({
    data: {
      name,
      cost: Number(cost),
      currentValue: currentValue !== undefined && currentValue !== null ? Number(currentValue) : null,
      quantity: Number(quantity ?? 1),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      notes: notes ?? null,
      categoryId: Number(categoryId),
      upgradeTargetId: upgradeTargetId ? Number(upgradeTargetId) : null,
    },
    include: { category: true, upgradeTarget: { select: { id: true, name: true, cost: true } } },
  })
  return NextResponse.json(item, { status: 201 })
}
