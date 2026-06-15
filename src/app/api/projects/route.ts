import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      lifeArea: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(
    projects.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      taskCount: p._count.tasks,
      openTaskCount: 0,
      _count: undefined,
    }))
  )
}

export async function POST(req: Request) {
  const { name, description, color, lifeAreaId } = await req.json()
  const project = await prisma.project.create({
    data: {
      name,
      description: description ?? null,
      color: color ?? '#6b7280',
      lifeAreaId: lifeAreaId ? Number(lifeAreaId) : null,
    },
    include: {
      lifeArea: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
  })
  return NextResponse.json(
    { ...project, createdAt: project.createdAt.toISOString(), taskCount: 0, openTaskCount: 0, _count: undefined },
    { status: 201 }
  )
}
