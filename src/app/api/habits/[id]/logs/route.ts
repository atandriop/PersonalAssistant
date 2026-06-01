import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const since = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000)
  const sinceStr = since.toISOString().slice(0, 10)
  const logs = await prisma.habitLog.findMany({
    where: { habitId, date: { gte: sinceStr } },
    select: { date: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(logs.map(l => l.date))
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const today = new Date().toISOString().slice(0, 10)
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: 'deleted' })
  }
  await prisma.habitLog.create({ data: { habitId, date: today } })
  return NextResponse.json({ action: 'created' }, { status: 201 })
}
