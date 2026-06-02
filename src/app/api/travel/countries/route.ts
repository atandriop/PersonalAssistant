import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function computeStats(trips: { actualCost: number | null; startDate: string | null }[]) {
  return {
    tripCount: trips.length,
    totalSpend: trips.reduce((s, t) => s + (t.actualCost ?? 0), 0),
    firstVisit: trips
      .map(t => t.startDate)
      .filter((d): d is string => d !== null)
      .sort()[0] ?? null,
  }
}

export async function GET() {
  const countries = await prisma.travelCountry.findMany({
    orderBy: { name: 'asc' },
    include: { trips: { select: { actualCost: true, startDate: true } } },
  })
  return NextResponse.json(
    countries.map(c => ({
      id: c.id,
      name: c.name,
      notes: c.notes,
      createdAt: c.createdAt,
      ...computeStats(c.trips),
    }))
  )
}

export async function POST(req: Request) {
  const { name, notes } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  const country = await prisma.travelCountry.create({
    data: { name: name.trim(), notes: notes ?? null },
  })
  return NextResponse.json(
    { ...country, tripCount: 0, totalSpend: 0, firstVisit: null },
    { status: 201 }
  )
}
