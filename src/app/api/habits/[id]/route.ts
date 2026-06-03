import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, color, archived } = await req.json()
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (color !== undefined) data.color = color
  if (archived === true) data.archivedAt = new Date()
  if (archived === false) data.archivedAt = null
  const habit = await prisma.habit.update({
    where: { id: Number(params.id) },
    data,
  })
  return NextResponse.json(habit)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.habit.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
