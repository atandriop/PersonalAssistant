import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addInterval } from '@/lib/taskUtils'
import { parseTags, serializeTags } from '@/lib/taskTagUtils'
import { todayLocal } from '@/lib/dateUtils'
import { route, parseId, badRequest, notFound } from '@/lib/apiUtils'

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

const INCLUDE = {
  subtasks: true,
  sourceLink: true,
  blockedBy: { select: { title: true } },
  lifeArea: { select: { id: true, name: true, color: true } },
  project: { select: { id: true, name: true, color: true } },
} as const

export const dynamic = 'force-dynamic'

export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid task id')
  const task = await prisma.task.findUnique({ where: { id }, include: INCLUDE })
  if (!task) return new NextResponse(null, { status: 404 })
  return NextResponse.json(serializeTask(task))
})

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid task id')
  const body = await req.json()
  const {
    title, priority, dueDate, category, notes, done, recurring,
    recurringInterval, blockedById, lifeAreaId, projectId, tags,
  } = body

  const existing = await prisma.task.findUnique({ where: { id }, include: { subtasks: true } })
  if (!existing) return notFound('Task not found')

  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      priority,
      dueDate: dueDate !== undefined ? dueDate : existing?.dueDate ?? null,
      category: category !== undefined ? category : existing?.category ?? null,
      notes: notes !== undefined ? notes : existing?.notes ?? null,
      // Must not default to false: TaskForm PUTs an edit body with no `done`
      // key, which silently un-completed a finished task.
      done: done !== undefined ? done : existing.done,
      recurring: recurring ?? existing?.recurring ?? false,
      recurringInterval: recurringInterval !== undefined ? recurringInterval : (existing?.recurringInterval ?? null),
      blockedById: blockedById !== undefined ? (blockedById ? Number(blockedById) : null) : existing?.blockedById,
      lifeAreaId: lifeAreaId !== undefined ? (lifeAreaId ? Number(lifeAreaId) : null) : existing?.lifeAreaId,
      projectId: projectId !== undefined ? (projectId ? Number(projectId) : null) : existing?.projectId,
      tags: tags !== undefined ? serializeTags(Array.isArray(tags) ? tags : []) : existing?.tags ?? '',
    },
    include: INCLUDE,
  })

  // Only on the not-done -> done transition. Firing on every PUT carrying
  // `done: true` meant "Defer +1d" on an already-done recurring task cloned it.
  if (done === true && existing.done === false && task.recurring && task.recurringInterval) {
    const baseDue = task.dueDate ?? todayLocal()
    const nextDue = addInterval(baseDue, task.recurringInterval)
    // null means the interval is unrecognised — skip rather than clone the task
    // onto the same due date (or a null one) forever.
    if (nextDue !== null) {
      await prisma.task.create({
        data: {
          title: task.title,
          priority: task.priority,
          dueDate: nextDue,
          category: task.category,
          notes: task.notes,
          tags: task.tags,
          lifeAreaId: task.lifeAreaId,
          projectId: task.projectId,
          recurring: true,
          recurringInterval: task.recurringInterval,
          subtasks: existing?.subtasks && existing.subtasks.length > 0
            ? { create: existing.subtasks.map(s => ({ title: s.title })) }
            : undefined,
        },
      })
    }
  }

  return NextResponse.json(serializeTask(task))
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid task id')
  await prisma.task.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
