import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { name, notes } = await req.json()
  const country = await prisma.travelCountry.update({
    where: { id },
    data: { name: name.trim(), notes: notes ?? null },
    include: { trips: { select: { actualCost: true, startDate: true } } },
  })
  return NextResponse.json({
    id: country.id,
    name: country.name,
    notes: country.notes,
    createdAt: country.createdAt,
    tripCount: country.trips.length,
    totalSpend: country.trips.reduce((s, t) => s + (t.actualCost ?? 0), 0),
    firstVisit: country.trips
      .map(t => t.startDate)
      .filter((d): d is string => d !== null)
      .sort()[0] ?? null,
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.travelCountry.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
