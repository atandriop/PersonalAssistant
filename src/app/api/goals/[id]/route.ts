import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, timePeriod, notes, lifeAreaId } = await req.json()
  const goal = await prisma.goal.update({
    where: { id: Number(params.id) },
    data: { title, timePeriod, notes, ...(lifeAreaId != null ? { lifeAreaId: Number(lifeAreaId) } : {}) },
  })
  return NextResponse.json(goal)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.goal.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
