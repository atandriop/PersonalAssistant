import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, birthday, relationship, email, phone, lastContactDate, notes } = await req.json()
  const person = await prisma.person.update({
    where: { id: Number(params.id) },
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
  return NextResponse.json({ ...person, createdAt: person.createdAt.toISOString() })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.person.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
