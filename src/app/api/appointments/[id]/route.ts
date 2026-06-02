import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, date, time, location, category, notes, cost, recurring, recurringInterval, done } = await req.json()
  const appointment = await prisma.appointment.update({
    where: { id: Number(params.id) },
    data: {
      title,
      date,
      time: time ?? null,
      location: location ?? null,
      category,
      notes: notes ?? null,
      cost: cost != null ? Number(cost) : null,
      recurring: recurring ?? false,
      recurringInterval: recurringInterval ?? null,
      done: done ?? false,
    },
  })
  return NextResponse.json(appointment)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.appointment.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
