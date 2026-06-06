import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TRIP_INCLUDE, serializeMemory } from '@/lib/memoriesUtils'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = ['Career', 'Education', 'Travel', 'Personal', 'Other']

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
