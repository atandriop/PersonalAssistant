import { prisma } from '@/lib/prisma'

export type RawCostLine = { id: number; category: string; amount: number; label: string | null; memoryId: number | null }
export type RawMemoryTrip = { memory: { id: number; title: string; date: string } }
export type RawTrip = {
  id: number; countryId: number; cities: string | null; companions: string | null; company: string | null
  startDate: string | null; endDate: string | null
  actualCost: number | null; rating: number | null
  notes: string | null; bucketTripId: number | null; createdAt: Date
  country: { name: string }
  memories: RawMemoryTrip[]
  costLines: RawCostLine[]
}

export interface CostLineInput {
  category: string
  amount: number
  label?: string
  memoryId?: number | null
  newMemory?: { title: string; date: string; category: string; location?: string | null }
}

export function serializeTrip(trip: RawTrip) {
  const { country, cities, companions, memories, costLines, actualCost, ...rest } = trip
  const linesTotal = costLines.length > 0
    ? costLines.reduce((s, l) => s + l.amount, 0)
    : null
  return {
    ...rest,
    countryName: country.name,
    cities: cities ? JSON.parse(cities) as string[] : [],
    companions: companions ? JSON.parse(companions) as string[] : [],
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

export const TRIP_INCLUDE = {
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

export async function resolveCostLines(costLines: CostLineInput[]) {
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
