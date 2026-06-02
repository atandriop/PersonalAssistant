import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const snapshots = await prisma.netWorthSnapshot.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(snapshots)
}

export async function POST() {
  const today = new Date().toISOString().slice(0, 10)

  const [holdings, entries] = await Promise.all([
    prisma.portfolioHolding.findMany(),
    prisma.netWorthEntry.findMany(),
  ])

  const portfolioValue = holdings.reduce((sum, h) => {
    if (h.quantity != null && h.currentPrice != null) return sum + h.quantity * h.currentPrice
    if (h.balance != null) return sum + h.balance
    return sum
  }, 0)

  const assetTotal = entries.filter(e => e.type === 'asset').reduce((s, e) => s + e.value, 0)
  const liabilityTotal = entries.filter(e => e.type === 'liability').reduce((s, e) => s + e.value, 0)
  const total = portfolioValue + assetTotal - liabilityTotal

  const snapshot = await prisma.netWorthSnapshot.upsert({
    where: { date: today },
    update: { total },
    create: { date: today, total },
  })
  return NextResponse.json(snapshot, { status: 201 })
}
