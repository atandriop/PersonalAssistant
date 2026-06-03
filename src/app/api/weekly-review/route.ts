import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

  const [
    wishlistItems,
    inventoryItems,
    portfolioHoldings,
    snapshots,
    completedTasks,
    completedAppointments,
    newMemories,
  ] = await Promise.all([
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
    prisma.task.findMany({
      where: {
        done: true,
        dueDate: { gte: sevenDaysAgoStr },
      },
      select: { id: true, title: true, priority: true, dueDate: true, category: true },
      orderBy: { dueDate: 'desc' },
    }),
    prisma.appointment.findMany({
      where: {
        done: true,
        date: { gte: sevenDaysAgoStr },
      },
      select: { id: true, title: true, date: true, category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.memory.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, title: true, date: true, category: true },
      orderBy: { date: 'desc' },
    }),
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
    completedTasks,
    completedAppointments,
    newMemories,
    weekStart: sevenDaysAgo.toISOString(),
    weekEnd: new Date().toISOString(),
  })
}
