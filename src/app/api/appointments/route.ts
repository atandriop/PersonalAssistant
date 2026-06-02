import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const appointments = await prisma.appointment.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(appointments)
}

export async function POST(req: Request) {
  const { title, date, time, location, category, notes, cost, recurring, recurringInterval } = await req.json()
  const appointment = await prisma.appointment.create({
    data: {
      title,
      date,
      time: time ?? null,
      location: location ?? null,
      category: category ?? 'Other',
      notes: notes ?? null,
      cost: cost != null ? Number(cost) : null,
      recurring: recurring ?? false,
      recurringInterval: recurringInterval ?? null,
    },
  })
  return NextResponse.json(appointment, { status: 201 })
}
