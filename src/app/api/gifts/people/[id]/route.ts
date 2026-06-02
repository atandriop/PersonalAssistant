import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, budget, notes } = await req.json()
  const person = await prisma.giftPerson.update({
    where: { id: Number(params.id) },
    data: { name, budget: budget != null ? Number(budget) : null, notes: notes ?? null },
  })
  return NextResponse.json(person)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.giftPerson.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
