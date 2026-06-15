import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseTags, serializeTags } from '@/lib/taskTagUtils'

export const dynamic = 'force-dynamic'

function serializeTask(t: {
  id: number; title: string; priority: string; dueDate: string | null; category: string | null
  notes: string | null; done: boolean; recurring: boolean; recurringInterval: string | null
  blockedById: number | null; tags: string; createdAt: Date
  lifeAreaId: number | null
  lifeArea: { id: number; name: string; color: string } | null
  projectId: number | null
  project: { id: number; name: string; color: string } | null
  subtasks: { id: number; taskId: number; title: string; done: boolean }[]
  sourceLink: { id: number; taskId: number; sourceType: string; sourceId: number } | null
  blockedBy: { title: string } | null
}) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    blockedByTitle: t.blockedBy?.title ?? null,
    tags: parseTags(t.tags),
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const doneFilter = searchParams.get('done')

  const where = doneFilter !== null ? { done: doneFilter === 'true' } : {}

  const tasks = await prisma.task.findMany({
    where,
    include: {
      subtasks: true,
      sourceLink: true,
      blockedBy: { select: { title: true } },
      lifeArea: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tasks.map(serializeTask))
}

export async function POST(req: Request) {
  const {
    title, priority, dueDate, category, notes, subtasks = [], sourceLink,
    recurring, recurringInterval, blockedById, lifeAreaId, projectId, tags = [],
  } = await req.json()

  const task = await prisma.task.create({
    data: {
      title,
      priority: priority ?? 'Medium',
      dueDate: dueDate ?? null,
      category: category ?? null,
      notes: notes ?? null,
      recurring: recurring ?? false,
      recurringInterval: recurringInterval ?? null,
      blockedById: blockedById ? Number(blockedById) : null,
      lifeAreaId: lifeAreaId ? Number(lifeAreaId) : null,
      projectId: projectId ? Number(projectId) : null,
      tags: serializeTags(Array.isArray(tags) ? tags : []),
      subtasks: subtasks.length > 0
        ? { create: subtasks.map((s: { title: string }) => ({ title: s.title })) }
        : undefined,
      sourceLink: sourceLink
        ? { create: { sourceType: sourceLink.sourceType, sourceId: Number(sourceLink.sourceId) } }
        : undefined,
    },
    include: {
      subtasks: true,
      sourceLink: true,
      blockedBy: { select: { title: true } },
      lifeArea: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  })
  return NextResponse.json(serializeTask(task), { status: 201 })
}
