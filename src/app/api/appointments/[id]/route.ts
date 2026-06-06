import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addInterval } from '@/lib/taskUtils'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const { title, date, time, location, category, notes, cost, recurring, recurringInterval, done } = body

  const existing = await prisma.appointment.findUnique({ where: { id } })

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

  if (done === true && appointment.recurring && appointment.recurringInterval) {
    const nextDate = addInterval(appointment.date, appointment.recurringInterval)
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

  return NextResponse.json(appointment)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.appointment.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
