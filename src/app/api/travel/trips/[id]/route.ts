import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function serializeTrip(trip: {
  id: number; countryId: number; cities: string | null
  startDate: string | null; endDate: string | null
  actualCost: number | null; rating: number | null
  notes: string | null; bucketTripId: number | null; createdAt: Date
  country: { name: string }
  memories: { memory: { id: number; title: string; date: string } }[]
}) {
  const { country, cities, memories, ...rest } = trip
  return {
    ...rest,
    countryName: country.name,
    cities: cities ? JSON.parse(cities) as string[] : [],
    memories: memories.map(mt => ({
      id: mt.memory.id,
      title: mt.memory.title,
      date: mt.memory.date,
    })),
    createdAt: trip.createdAt.toISOString(),
  }
}

const MEMORIES_INCLUDE = {
  memories: {
    include: {
      memory: { select: { id: true, title: true, date: true } },
    },
  },
} as const

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { countryId, countryName, cities, startDate, endDate, actualCost, rating, notes } = await req.json()

  let resolvedCountryId: number | undefined = countryId ? Number(countryId) : undefined
  if (!resolvedCountryId && countryName?.trim()) {
    const country = await prisma.travelCountry.upsert({
      where: { name: countryName.trim() },
      update: {},
      create: { name: countryName.trim() },
    })
    resolvedCountryId = country.id
  }

  const trip = await prisma.travelTrip.update({
    where: { id },
    data: {
      ...(resolvedCountryId !== undefined ? { countryId: resolvedCountryId } : {}),
      cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      actualCost: actualCost != null ? Number(actualCost) : null,
      rating: rating != null ? Number(rating) : null,
      notes: notes ?? null,
    },
    include: { country: { select: { name: true } }, ...MEMORIES_INCLUDE },
  })
  return NextResponse.json(serializeTrip(trip))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.travelTrip.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
