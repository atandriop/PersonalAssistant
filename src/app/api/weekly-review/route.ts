import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [wishlistItems, inventoryItems, portfolioHoldings, snapshots] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryItem.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.portfolioHolding.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.snapshot.findMany({ orderBy: { date: 'desc' }, take: 50 }),
  ])

  const latestSnapshot = snapshots[0] ?? null
  const oldSnapshot = snapshots.find(s => new Date(s.date) <= sevenDaysAgo) ?? null
  const portfolioDelta =
    latestSnapshot && oldSnapshot
      ? latestSnapshot.portfolioTotal - oldSnapshot.portfolioTotal
      : null

  return NextResponse.json({
    wishlistItems,
    inventoryItems,
    portfolioHoldings,
    portfolioDelta,
    weekStart: sevenDaysAgo.toISOString(),
    weekEnd: new Date().toISOString(),
  })
}
