import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    createdAt: m.createdAt.toISOString(),
    trips: m.trips.map(mt => ({
      id: mt.trip.id,
      countryName: mt.trip.country.name,
      startDate: mt.trip.startDate,
    })),
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { title, date, endDate, category, location, notes, tripIds } = await req.json()
  if (!title?.trim() || !date) {
    return NextResponse.json({ error: 'title and date are required' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  // Sync junction rows: delete all existing, then create the new set
  await prisma.memoryTrip.deleteMany({ where: { memoryId: id } })
  await prisma.memory.update({
    where: { id },
    data: {
      title: title.trim(),
      date,
      endDate: endDate ?? null,
      category,
      location: location?.trim() || null,
      notes: notes?.trim() || null,
    },
  })
  if (Array.isArray(tripIds) && tripIds.length > 0) {
    await prisma.memoryTrip.createMany({
      data: (tripIds as number[]).map(tripId => ({ memoryId: id, tripId })),
    })
  }

  const updated = await prisma.memory.findUniqueOrThrow({
    where: { id },
    include: { trips: TRIP_INCLUDE },
  })
  return NextResponse.json(serializeMemory(updated))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  await prisma.memory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
