import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const trips = await prisma.bucketTrip.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(
    trips.map(t => ({ ...t, cities: t.cities ? JSON.parse(t.cities) as string[] : [] }))
  )
}

export async function POST(req: Request) {
  const { destination, cities, budget, targetYear, notes } = await req.json()
  if (!destination) {
    return NextResponse.json({ error: 'Missing destination' }, { status: 400 })
  }
  const trip = await prisma.bucketTrip.create({
    data: {
      destination,
      cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
      budget: budget != null ? Number(budget) : null,
      targetYear: targetYear != null ? Number(targetYear) : null,
      notes: notes ?? null,
    },
  })
  return NextResponse.json(
    { ...trip, cities: trip.cities ? JSON.parse(trip.cities) as string[] : [] },
    { status: 201 }
  )
}
