import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { todayLocal } from '@/lib/dateUtils'
import { computeNetWorth } from '@/lib/netWorthTotals'
import { route } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const snapshots = await prisma.netWorthSnapshot.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(snapshots)
})

export const POST = route(async () => {
  const today = todayLocal()

  const [holdings, entries, subscriptions] = await Promise.all([
    prisma.portfolioHolding.findMany(),
    prisma.netWorthEntry.findMany(),
    prisma.subscription.findMany({ where: { active: true } }),
  ])

  // Shared formula: the inline version here counted neither `type: 'asset'`
  // entries nor annualised subscriptions, so this chart could never line up
  // with the Net Worth tile that did.
  const { total } = computeNetWorth({ holdings, entries, subscriptions })

  const snapshot = await prisma.netWorthSnapshot.upsert({
    where: { date: today },
    update: { total },
    create: { date: today, total },
  })
  return NextResponse.json(snapshot, { status: 201 })
})
