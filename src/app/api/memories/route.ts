import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = ['Career', 'Education', 'Travel', 'Personal', 'Other']

const TRIP_INCLUDE = {
  include: {
    trip: {
      select: {
        id: true,
        startDate: true,
        country: { select: { name: true } },
      },
    },
  },
} as const

function serializeMemory(m: {
  id: number; title: string; date: string; endDate: string | null
  category: string; location: string | null; notes: string | null
  tags: string
  createdAt: Date
  trips: { trip: { id: number; startDate: string | null; country: { name: string } } }[]
}) {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    endDate: m.endDate,
    category: m.category,
    location: m.location,
    notes: m.notes,
    tags: m.tags ? m.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdAt: m.createdAt.toISOString(),
    trips: m.trips.map(mt => ({
      id: mt.trip.id,
      countryName: mt.trip.country.name,
      startDate: mt.trip.startDate,
    })),
  }
}

export async function GET() {
  const raw = await prisma.memory.findMany({
    orderBy: { date: 'desc' },
    include: { trips: TRIP_INCLUDE },
  })
  return NextResponse.json(raw.map(serializeMemory))
}

export async function POST(req: Request) {
  const { title, date, endDate, category, location, notes, tripIds, tags } = await req.json()
  if (!title?.trim() || !date) {
    return NextResponse.json({ error: 'title and date are required' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const memory = await prisma.memory.create({
    data: {
      title: title.trim(),
      date,
      endDate: endDate ?? null,
      category,
      location: location?.trim() || null,
      notes: notes?.trim() || null,
      tags: Array.isArray(tags) ? tags.filter(Boolean).join(',') : '',
      trips: Array.isArray(tripIds) && tripIds.length > 0
        ? { create: (tripIds as number[]).map(tripId => ({ tripId })) }
        : undefined,
    },
    include: { trips: TRIP_INCLUDE },
  })
  return NextResponse.json(serializeMemory(memory), { status: 201 })
}
