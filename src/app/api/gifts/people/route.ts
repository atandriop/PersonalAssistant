import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const people = await prisma.giftPerson.findMany({
    orderBy: { createdAt: 'asc' },
    include: { ideas: { orderBy: { createdAt: 'asc' } } },
  })
  return NextResponse.json(people)
}

export async function POST(req: Request) {
  const { name, budget, notes, personId } = await req.json()
  const person = await prisma.giftPerson.create({
    data: { name, budget: budget != null ? Number(budget) : null, notes: notes ?? null, personId: personId != null ? Number(personId) : null },
  })
  return NextResponse.json(person, { status: 201 })
}
