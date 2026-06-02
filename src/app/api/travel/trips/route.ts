import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function serializeTrip(trip: {
  id: number; countryId: number; cities: string | null
  startDate: string | null; endDate: string | null
  actualCost: number | null; rating: number | null
  notes: string | null; bucketTripId: number | null; createdAt: Date
  country: { name: string }
}) {
  const { country, cities, ...rest } = trip
  return {
    ...rest,
    countryName: country.name,
    cities: cities ? JSON.parse(cities) as string[] : [],
  }
}

export async function GET() {
  const raw = await prisma.travelTrip.findMany({
    orderBy: { createdAt: 'desc' },
    include: { country: { select: { name: true } } },
  })
  // Drafts (no startDate) first, then most recent by startDate desc
  raw.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0
    if (!a.startDate) return -1
    if (!b.startDate) return 1
    return b.startDate.localeCompare(a.startDate)
  })
  return NextResponse.json(raw.map(serializeTrip))
}

export async function POST(req: Request) {
  const { countryId, countryName, cities, startDate, endDate, actualCost, rating, notes, bucketTripId } = await req.json()

  let resolvedCountryId: number | undefined = countryId ? Number(countryId) : undefined
  if (!resolvedCountryId && countryName?.trim()) {
    const country = await prisma.travelCountry.upsert({
      where: { name: countryName.trim() },
      update: {},
      create: { name: countryName.trim() },
    })
    resolvedCountryId = country.id
  }
  if (!resolvedCountryId) return NextResponse.json({ error: 'Missing country' }, { status: 400 })

  const trip = await prisma.travelTrip.create({
    data: {
      countryId: resolvedCountryId,
      cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      actualCost: actualCost != null ? Number(actualCost) : null,
      rating: rating != null ? Number(rating) : null,
      notes: notes ?? null,
      bucketTripId: bucketTripId ?? null,
    },
    include: { country: { select: { name: true } } },
  })
  return NextResponse.json(serializeTrip(trip), { status: 201 })
}
