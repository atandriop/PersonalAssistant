import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RawCostLine = { id: number; category: string; amount: number; label: string | null; memoryId: number | null }
type RawMemoryTrip = { memory: { id: number; title: string; date: string } }
type RawTrip = {
  id: number; countryId: number; cities: string | null
  startDate: string | null; endDate: string | null
  actualCost: number | null; rating: number | null
  notes: string | null; bucketTripId: number | null; createdAt: Date
  country: { name: string }
  memories: RawMemoryTrip[]
  costLines: RawCostLine[]
}

function serializeTrip(trip: RawTrip) {
  const { country, cities, memories, costLines, actualCost, ...rest } = trip
  const linesTotal = costLines.length > 0
    ? costLines.reduce((s, l) => s + l.amount, 0)
    : null
  return {
    ...rest,
    countryName: country.name,
    cities: cities ? JSON.parse(cities) as string[] : [],
    memories: memories.map(mt => ({
      id: mt.memory.id,
      title: mt.memory.title,
      date: mt.memory.date,
    })),
    costLines: costLines.map(l => ({
      id: l.id,
      category: l.category as 'hotel' | 'airfare' | 'food' | 'entertainment',
      amount: l.amount,
      label: l.label,
      memoryId: l.memoryId,
    })),
    actualCost: linesTotal ?? actualCost,
    createdAt: trip.createdAt.toISOString(),
  }
}

const TRIP_INCLUDE = {
  country: { select: { name: true } },
  memories: {
    include: {
      memory: { select: { id: true, title: true, date: true } },
    },
  },
  costLines: {
    select: { id: true, category: true, amount: true, label: true, memoryId: true },
    orderBy: { createdAt: 'asc' } as const,
  },
} as const

interface CostLineInput {
  category: string
  amount: number
  label?: string
  memoryId?: number | null
  newMemory?: { title: string; date: string; category: string; location?: string | null }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { countryId, countryName, cities, startDate, endDate, actualCost, rating, notes, costLines } = await req.json()

  let resolvedCountryId: number | undefined = countryId ? Number(countryId) : undefined
  if (!resolvedCountryId && countryName?.trim()) {
    const country = await prisma.travelCountry.upsert({
      where: { name: countryName.trim() },
      update: {},
      create: { name: countryName.trim() },
    })
    resolvedCountryId = country.id
  }

  let computedCost: number | null = actualCost != null ? Number(actualCost) : null

  // Step 1: resolve lines + create any new memories (outside tx — trip is unchanged if this fails)
  let resolvedLines: { category: string; amount: number; label: string | null; memoryId: number | null }[] = []
  if (Array.isArray(costLines)) {
    resolvedLines = await Promise.all((costLines as CostLineInput[]).map(async (line) => {
      let memId = line.memoryId ?? null
      if (line.newMemory && !memId) {
        const mem = await prisma.memory.create({
          data: {
            title: line.newMemory.title,
            date: line.newMemory.date,
            endDate: null,
            category: line.newMemory.category,
            location: line.newMemory.location ?? null,
            notes: null,
            tags: '',
          },
        })
        memId = mem.id
      }
      return { category: line.category, amount: line.amount, label: line.label ?? null, memoryId: memId }
    }))

    computedCost = resolvedLines.length > 0
      ? resolvedLines.reduce((s, l) => s + l.amount, 0)
      : null
  }

  // Steps 2-4: atomic — deleteMany + createMany + update must all succeed or all roll back
  const trip = await prisma.$transaction(async (tx) => {
    if (Array.isArray(costLines)) {
      await tx.tripCostLine.deleteMany({ where: { tripId: id } })
      if (resolvedLines.length > 0) {
        await tx.tripCostLine.createMany({
          data: resolvedLines.map(l => ({ tripId: id, ...l })),
        })
      }
    }
    return tx.travelTrip.update({
      where: { id },
      data: {
        ...(resolvedCountryId !== undefined ? { countryId: resolvedCountryId } : {}),
        cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        actualCost: computedCost,
        rating: rating != null ? Number(rating) : null,
        notes: notes ?? null,
      },
      include: TRIP_INCLUDE,
    })
  })
  return NextResponse.json(serializeTrip(trip))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.travelTrip.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
