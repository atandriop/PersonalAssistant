import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(people.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })))
}

export async function POST(req: Request) {
  const { name, birthday, relationship, email, phone, lastContactDate, notes } = await req.json()
  const person = await prisma.person.create({
    data: {
      name,
      birthday: birthday || null,
      relationship: relationship || null,
      email: email || null,
      phone: phone || null,
      lastContactDate: lastContactDate || null,
      notes: notes || null,
    },
  })
  return NextResponse.json({ ...person, createdAt: person.createdAt.toISOString() }, { status: 201 })
}
