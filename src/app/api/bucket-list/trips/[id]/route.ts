import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { destination, cities, budget, targetYear, notes, done } = await req.json()
  const updateData: {
    destination: string
    cities: string | null
    budget: number | null
    targetYear: number | null
    notes: string | null
    done: boolean
    linkedToTravel?: boolean
  } = {
    destination,
    cities: cities && cities.length > 0 ? JSON.stringify(cities) : null,
    budget: budget != null ? Number(budget) : null,
    targetYear: targetYear != null ? Number(targetYear) : null,
    notes: notes ?? null,
    done: done ?? false,
  }
  if (done === true) updateData.linkedToTravel = true
  const trip = await prisma.bucketTrip.update({ where: { id }, data: updateData })

  // Auto-import to Travel when marking done (only once per bucket trip)
  if (done === true) {
    const existing = await prisma.travelTrip.findFirst({ where: { bucketTripId: id } })
    if (!existing) {
      const country = await prisma.travelCountry.upsert({
        where: { name: destination },
        update: {},
        create: { name: destination },
      })
      await prisma.travelTrip.create({
        data: {
          countryId: country.id,
          cities: trip.cities,
          bucketTripId: id,
        },
      })
    }
  }

  return NextResponse.json(
    { ...trip, cities: trip.cities ? JSON.parse(trip.cities) as string[] : [] }
  )
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.bucketTrip.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
