import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function addInterval(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  switch (interval) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().slice(0, 10)
}

function serializeTask(t: {
  id: number; title: string; priority: string; dueDate: string | null; category: string | null
  notes: string | null; done: boolean; recurring: boolean; recurringInterval: string | null
  blockedById: number | null; createdAt: Date
  subtasks: { id: number; taskId: number; title: string; done: boolean }[]
  sourceLink: { id: number; taskId: number; sourceType: string; sourceId: number } | null
  blockedBy: { title: string } | null
}) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    blockedByTitle: t.blockedBy?.title ?? null,
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: Number(params.id) },
    include: { subtasks: true, sourceLink: true, blockedBy: { select: { title: true } } },
  })
  if (!task) return new NextResponse(null, { status: 404 })
  return NextResponse.json(serializeTask(task))
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const { title, priority, dueDate, category, notes, done, recurring, recurringInterval, blockedById } = body

  const existing = await prisma.task.findUnique({ where: { id }, include: { subtasks: true } })

  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      priority,
      dueDate: dueDate !== undefined ? dueDate : existing?.dueDate ?? null,
      category: category ?? null,
      notes: notes ?? null,
      done: done ?? false,
      recurring: recurring ?? existing?.recurring ?? false,
      recurringInterval: recurringInterval !== undefined ? recurringInterval : (existing?.recurringInterval ?? null),
      blockedById: blockedById !== undefined ? (blockedById ? Number(blockedById) : null) : existing?.blockedById,
    },
    include: { subtasks: true, sourceLink: true, blockedBy: { select: { title: true } } },
  })

  if (done === true && task.recurring && task.recurringInterval) {
    const baseDue = task.dueDate ?? new Date().toISOString().slice(0, 10)
    const nextDue = addInterval(baseDue, task.recurringInterval)
    await prisma.task.create({
      data: {
        title: task.title,
        priority: task.priority,
        dueDate: nextDue,
        category: task.category,
        notes: task.notes,
        recurring: true,
        recurringInterval: task.recurringInterval,
        subtasks: existing?.subtasks && existing.subtasks.length > 0
          ? { create: existing.subtasks.map(s => ({ title: s.title })) }
          : undefined,
      },
    })
  }

  return NextResponse.json(serializeTask(task))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.task.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
