import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addInterval } from '@/lib/taskUtils'
import { route, parseId, badRequest, notFound } from '@/lib/apiUtils'

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid appointment id')
  const body = await req.json()
  const { title, date, time, location, category, notes, cost, recurring, recurringInterval, done } = body

  const existing = await prisma.appointment.findUnique({ where: { id } })
  if (!existing) return notFound('Appointment not found')

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      title,
      date,
      time: time ?? null,
      location: location ?? null,
      category,
      notes: notes ?? null,
      cost: cost != null ? Number(cost) : null,
      recurring: recurring ?? existing?.recurring ?? false,
      recurringInterval: recurringInterval !== undefined ? recurringInterval : (existing?.recurringInterval ?? null),
      done: done !== undefined ? done : existing?.done ?? false,
    },
  })

  // Only on the not-done -> done transition, and only when the interval is one
  // addInterval understands: 'quarterly'/'6months' used to fall through and
  // return the same date, making the "next" occurrence due today forever.
  if (done === true && existing.done === false && appointment.recurring && appointment.recurringInterval) {
    const nextDate = addInterval(appointment.date, appointment.recurringInterval)
    if (nextDate !== null) {
      await prisma.appointment.create({
        data: {
          title: appointment.title,
          date: nextDate,
          time: appointment.time,
          location: appointment.location,
          category: appointment.category,
          notes: appointment.notes,
          cost: appointment.cost,
          recurring: true,
          recurringInterval: appointment.recurringInterval,
        },
      })
    }
  }

  return NextResponse.json(appointment)
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid appointment id')
  await prisma.appointment.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
