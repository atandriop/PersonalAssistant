import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound, requireFields } from '@/lib/apiUtils'

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid country id')
  const body = await req.json()

  // POST guards this; PUT did not, so a body without `name` threw
  // "Cannot read properties of undefined (reading 'trim')" as a bare 500.
  const missing = requireFields(body, ['name'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)

  const existing = await prisma.travelCountry.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('Country not found')

  const country = await prisma.travelCountry.update({
    where: { id },
    data: { name: String(body.name).trim(), notes: body.notes ?? null },
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
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid country id')
  await prisma.travelCountry.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
