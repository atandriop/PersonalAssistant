import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CostLineInput, TRIP_INCLUDE, resolveCostLines, serializeTrip } from '@/lib/travelUtils'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { countryId, countryName, cities, companions, company, startDate, endDate, actualCost, rating, notes, costLines } = await req.json()

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
    resolvedLines = await resolveCostLines(costLines as CostLineInput[])

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
        companions: companions && companions.length > 0 ? JSON.stringify(companions) : null,
        company: company?.trim() || null,
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
