import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: Number(params.id) },
    include: { subtasks: true, sourceLink: true },
  })
  if (!task) return new NextResponse(null, { status: 404 })
  return NextResponse.json(task)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, priority, dueDate, category, notes, done } = await req.json()
  const task = await prisma.task.update({
    where: { id: Number(params.id) },
    data: {
      title,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category ?? null,
      notes: notes ?? null,
      done: done ?? false,
    },
    include: { subtasks: true, sourceLink: true },
  })
  return NextResponse.json(task)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.task.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
