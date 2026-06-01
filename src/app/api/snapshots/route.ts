import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const snapshots = await prisma.snapshot.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(snapshots)
}

export async function POST() {
  const [wishlistItems, holdings] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { purchased: false } }),
    prisma.portfolioHolding.findMany(),
  ])

  const wishlistTotal = wishlistItems.reduce((s, i) => s + i.cost, 0)
  const portfolioTotal = holdings.reduce((s, h) => {
    if (h.type === 'savings') return s + (h.balance ?? 0)
    return s + (h.currentPrice ?? 0) * (h.quantity ?? 0)
  }, 0)

  const snapshot = await prisma.snapshot.create({
    data: { wishlistTotal, portfolioTotal },
  })
  return NextResponse.json(snapshot, { status: 201 })
}
