import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function addInterval(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  switch (interval) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': {
      const targetMonth = (d.getMonth() + 1) % 12
      d.setMonth(d.getMonth() + 1)
      if (d.getMonth() !== targetMonth) d.setDate(0)
      break
    }
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().slice(0, 10)
}

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
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids } },
      include: { subtasks: true },
    })
    await Promise.all(
      tasks.map(async task => {
        await prisma.task.update({ where: { id: task.id }, data: { done: true } })
        if (task.recurring && task.recurringInterval) {
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
              subtasks: task.subtasks.length > 0
                ? { create: task.subtasks.map(s => ({ title: s.title })) }
                : undefined,
            },
          })
        }
      })
    )
    return NextResponse.json({ updated: ids.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
