import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound, requireFields } from '@/lib/apiUtils'

export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const taskId = parseId(params.id)
  if (taskId === null) return badRequest('Invalid task id')

  const body = await req.json()
  const missing = requireFields(body, ['title'])
  if (missing.length > 0) return badRequest(`Missing required field: ${missing.join(', ')}`)

  // Without this the FK violation escapes as an unhandled 500.
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } })
  if (!task) return notFound('Task not found')

  const subtask = await prisma.subtask.create({
    data: { taskId, title: String(body.title).trim() },
  })
  return NextResponse.json(subtask, { status: 201 })
})
