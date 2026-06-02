import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: { subtasks: true, sourceLink: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const { title, priority, dueDate, category, notes, subtasks = [], sourceLink } = await req.json()
  const task = await prisma.task.create({
    data: {
      title,
      priority: priority ?? 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category ?? null,
      notes: notes ?? null,
      subtasks: subtasks.length > 0
        ? { create: subtasks.map((s: { title: string }) => ({ title: s.title })) }
        : undefined,
      sourceLink: sourceLink
        ? { create: { sourceType: sourceLink.sourceType, sourceId: Number(sourceLink.sourceId) } }
        : undefined,
    },
    include: { subtasks: true, sourceLink: true },
  })
  return NextResponse.json(task, { status: 201 })
}
