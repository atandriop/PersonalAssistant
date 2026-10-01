import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound } from '@/lib/apiUtils'

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid trip id')
  const { destination, cities, budget, targetYear, notes, done } = await req.json()

  const current = await prisma.bucketTrip.findUnique({ where: { id } })
  if (!current) return notFound('Trip not found')

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
    // Must not default to false: a PUT that only edits the destination would
    // otherwise un-complete a finished trip.
    done: done !== undefined ? done : current.done,
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
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid trip id')
  await prisma.bucketTrip.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
