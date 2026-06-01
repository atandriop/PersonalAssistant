import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.wishlistItem.findMany({
    include: { category: true, inventoryUpgrades: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { name, url, cost, priority, notes, categoryId } = await req.json()
  const item = await prisma.wishlistItem.create({
    data: { name, url, cost: Number(cost), priority, notes, categoryId: Number(categoryId) },
    include: { category: true, inventoryUpgrades: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item, { status: 201 })
}
