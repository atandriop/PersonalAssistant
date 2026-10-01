import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound } from '@/lib/apiUtils'

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid maintenance task id')
  const body = await req.json()
  const { description, intervalMonths, dueDate, lastDoneDate } = body

  const existing = await prisma.maintenanceTask.findUnique({ where: { id } })
  if (!existing) return notFound('Maintenance task not found')

  // Every field falls back to its stored value: a partial PUT (e.g. only
  // lastDoneDate when logging a completion) used to null out intervalMonths and
  // dueDate, which made getTaskStatus report 'none' and dropped the task from
  // every due and overdue list.
  const task = await prisma.maintenanceTask.update({
    where: { id },
    data: {
      description: description !== undefined ? description : existing.description,
      intervalMonths: intervalMonths !== undefined
        ? (intervalMonths != null ? Number(intervalMonths) : null)
        : existing.intervalMonths,
      dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
      lastDoneDate: lastDoneDate !== undefined ? lastDoneDate : existing.lastDoneDate,
    },
  })
  return NextResponse.json(task)
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid maintenance task id')
  await prisma.maintenanceTask.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
