import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

async function resolveCostLines(costLines: CostLineInput[]) {
  return Promise.all(costLines.map(async (line) => {
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
}

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
