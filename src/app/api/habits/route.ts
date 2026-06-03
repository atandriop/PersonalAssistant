import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const archived = searchParams.get('archived') === 'true'
  const includeToday = searchParams.get('includeToday') === 'true'

  const habits = await prisma.habit.findMany({
    where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
    include: {
      goalLinks: {
        include: {
          goal: { select: { id: true, title: true, timePeriod: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!includeToday) return NextResponse.json(habits)

  const today = new Date().toISOString().slice(0, 10)
  const todayLogs = await prisma.habitLog.findMany({
    where: { date: today, habitId: { in: habits.map(h => h.id) } },
    select: { habitId: true },
  })
  const doneTodaySet = new Set(todayLogs.map(l => l.habitId))

  return NextResponse.json(habits.map(h => ({ ...h, doneToday: doneTodaySet.has(h.id) })))
}

export async function POST(req: Request) {
  const { name, color } = await req.json()
  const habit = await prisma.habit.create({ data: { name, color } })
  return NextResponse.json(habit, { status: 201 })
}
