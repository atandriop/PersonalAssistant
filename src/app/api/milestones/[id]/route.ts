import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { completedAt, targetDate } = await req.json()
  const milestone = await prisma.milestone.update({
    where: { id: Number(params.id) },
    data: {
      completedAt: completedAt ? new Date(completedAt) : null,
      ...(targetDate !== undefined ? { targetDate: targetDate ?? null } : {}),
    },
  })
  return NextResponse.json(milestone)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.milestone.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
