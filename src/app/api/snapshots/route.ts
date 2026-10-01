import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { todayLocal } from '@/lib/dateUtils'
import { holdingValue } from '@/lib/netWorthUtils'
import { route } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const snapshots = await prisma.snapshot.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(snapshots)
})

export const POST = route(async () => {
  const [wishlistItems, holdings] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { purchased: false }, select: { cost: true } }),
    prisma.portfolioHolding.findMany(),
  ])

  const wishlistTotal = wishlistItems.reduce((s, i) => s + i.cost, 0)
  const portfolioTotal = holdings.reduce((s, h) => s + holdingValue(h), 0)

  // upsert on the local calendar day, like the sibling net-worth snapshot route.
  // create() here meant every new tab on the same day inserted another row —
  // 14 rows existed for 2026-08-13 — each a duplicate point in two charts.
  const snapshot = await prisma.snapshot.upsert({
    where: { date: todayLocal() },
    update: { wishlistTotal, portfolioTotal },
    create: { date: todayLocal(), wishlistTotal, portfolioTotal },
  })
  return NextResponse.json(snapshot, { status: 201 })
})
