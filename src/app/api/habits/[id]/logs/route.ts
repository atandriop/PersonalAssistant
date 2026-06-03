import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const { searchParams } = new URL(req.url)
  const sinceParam = searchParams.get('since')

  const defaultSince = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const sinceStr = sinceParam ?? defaultSince

  const logs = await prisma.habitLog.findMany({
    where: { habitId, date: { gte: sinceStr } },
    select: { date: true, note: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(logs)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const habitId = Number(params.id)
  const today = new Date().toISOString().slice(0, 10)
  const body = await req.json().catch(() => ({}))
  const note: string | null = body.note?.trim() || null

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: 'deleted' })
  }
  await prisma.habitLog.create({ data: { habitId, date: today, note } })
  return NextResponse.json({ action: 'created' }, { status: 201 })
}
