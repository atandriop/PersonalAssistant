import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function esc(s: string | null | undefined): string {
  return `"${(s ?? '').replace(/"/g, '""')}"`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'json'
  const date = new Date().toISOString().slice(0, 10)

  if (format === 'csv') {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: { subtasks: true },
    })
    const header = 'id,title,priority,dueDate,category,notes,done,recurring,recurringInterval,subtasks,createdAt'
    const rows = tasks.map(t =>
      [
        t.id,
        esc(t.title),
        t.priority,
        t.dueDate ?? '',
        esc(t.category),
        esc(t.notes),
        t.done ? 'Yes' : 'No',
        t.recurring ? 'Yes' : 'No',
        t.recurringInterval ?? '',
        esc(t.subtasks.map(s => s.title).join('; ')),
        t.createdAt.toISOString().slice(0, 10),
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="homebase-tasks-${date}.csv"`,
      },
    })
  }

  // JSON: full export
  const [
    tasks,
    memories,
    lifeAreas,
    habits,
    habitLogs,
    documents,
    subscriptions,
    netWorthEntries,
    appointments,
  ] = await Promise.all([
    prisma.task.findMany({ include: { subtasks: true }, orderBy: { createdAt: 'desc' } }),
    prisma.memory.findMany({ orderBy: { date: 'desc' } }),
    prisma.lifeArea.findMany({
      include: {
        goals: { include: { milestones: true, habitLinks: { include: { habit: true } } } },
      },
    }),
    prisma.habit.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.habitLog.findMany({ orderBy: [{ habitId: 'asc' }, { date: 'desc' }] }),
    prisma.document.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.subscription.findMany({ orderBy: { name: 'asc' } }),
    prisma.netWorthEntry.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.appointment.findMany({ orderBy: { date: 'asc' } }),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    tasks,
    appointments,
    memories,
    lifeAreas,
    habits,
    habitLogs,
    documents,
    subscriptions,
    netWorthEntries,
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="homebase-export-${date}.json"`,
    },
  })
}
