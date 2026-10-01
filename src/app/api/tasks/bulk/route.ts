import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addInterval } from '@/lib/taskUtils'
import { todayLocal } from '@/lib/dateUtils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { action, ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  if (action === 'delete') {
    await prisma.task.deleteMany({ where: { id: { in: ids } } })
    return new NextResponse(null, { status: 204 })
  }

  if (action === 'markDone') {
    // `done: false` guard: re-running markDone over the same ids otherwise
    // spawned another recurrence clone on every call.
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids }, done: false },
      include: { subtasks: true },
    })
    await Promise.all(
      tasks.map(async task => {
        await prisma.task.update({ where: { id: task.id }, data: { done: true } })
        if (task.recurring && task.recurringInterval) {
          const baseDue = task.dueDate ?? todayLocal()
          const nextDue = addInterval(baseDue, task.recurringInterval)
          if (nextDue === null) return
          await prisma.task.create({
            data: {
              title: task.title,
              priority: task.priority,
              dueDate: nextDue,
              category: task.category,
              notes: task.notes,
              // tags/lifeAreaId/projectId were dropped here while the
              // single-task route copied them, so a bulk completion silently
              // stripped the next occurrence's project, area and tags.
              tags: task.tags,
              lifeAreaId: task.lifeAreaId,
              projectId: task.projectId,
              recurring: true,
              recurringInterval: task.recurringInterval,
              subtasks: task.subtasks.length > 0
                ? { create: task.subtasks.map(s => ({ title: s.title })) }
                : undefined,
            },
          })
        }
      })
    )
    return NextResponse.json({ updated: tasks.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
