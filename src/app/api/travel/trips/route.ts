import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CostLineInput, TRIP_INCLUDE, resolveCostLines, serializeTrip } from '@/lib/travelUtils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const raw = await prisma.travelTrip.findMany({
    include: TRIP_INCLUDE,
  })
  raw.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0
    if (!a.startDate) return -1
    if (!b.startDate) return 1
    return b.startDate.localeCompare(a.startDate)
  })
  return NextResponse.json(raw.map(serializeTrip))
}

export async function POST(req: Request) {
  const { countryId, countryName, cities, startDate, endDate, actualCost, rating, notes, bucketTripId, costLines } = await req.json()

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

  let computedCost: number | null = actualCost != null ? Number(actualCost) : null
  let resolvedLines: { category: string; amount: number; label: string | null; memoryId: number | null }[] = []

  if (Array.isArray(costLines)) {
    resolvedLines = await resolveCostLines(costLines as CostLineInput[])
    computedCost = resolvedLines.length > 0
      ? resolvedLines.reduce((s, l) => s + l.amount, 0)
      : null
  }

  const trip = await prisma.travelTrip.create({
    data: {
      countryId: resolvedCountryId,
      cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      actualCost: computedCost,
      rating: rating != null ? Number(rating) : null,
      notes: notes ?? null,
      bucketTripId: bucketTripId ?? null,
      ...(resolvedLines.length > 0 && {
        costLines: { createMany: { data: resolvedLines } },
      }),
    },
    include: TRIP_INCLUDE,
  })

  return NextResponse.json(serializeTrip(trip), { status: 201 })
}
