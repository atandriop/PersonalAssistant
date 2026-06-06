import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TRIP_INCLUDE, serializeMemory } from '@/lib/memoriesUtils'

const VALID_CATEGORIES = ['Career', 'Education', 'Travel', 'Personal', 'Other']

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { title, date, endDate, category, location, notes, tripIds, tags } = await req.json()
  if (!title?.trim() || !date) {
    return NextResponse.json({ error: 'title and date are required' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.memoryTrip.deleteMany({ where: { memoryId: id } })
    await tx.memory.update({
      where: { id },
      data: {
        title: title.trim(),
        date,
        endDate: endDate ?? null,
        category,
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        tags: Array.isArray(tags) ? tags.filter(Boolean).join(',') : '',
      },
    })
    if (Array.isArray(tripIds) && tripIds.length > 0) {
      await tx.memoryTrip.createMany({
        data: (tripIds as number[]).map(tripId => ({ memoryId: id, tripId })),
      })
    }
    return tx.memory.findUniqueOrThrow({
      where: { id },
      include: { trips: TRIP_INCLUDE },
    })
  })
  return NextResponse.json(serializeMemory(updated))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  await prisma.memory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
