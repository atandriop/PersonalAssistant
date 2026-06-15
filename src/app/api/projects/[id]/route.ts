import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, description, color, lifeAreaId, done } = await req.json()
  const project = await prisma.project.update({
    where: { id: Number(params.id) },
    data: {
      name,
      description: description ?? null,
      color,
      lifeAreaId: lifeAreaId !== undefined ? (lifeAreaId ? Number(lifeAreaId) : null) : undefined,
      done: done ?? undefined,
    },
    include: {
      lifeArea: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
  })
  return NextResponse.json({
    ...project,
    createdAt: project.createdAt.toISOString(),
    taskCount: project._count.tasks,
    openTaskCount: 0,
    _count: undefined,
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
