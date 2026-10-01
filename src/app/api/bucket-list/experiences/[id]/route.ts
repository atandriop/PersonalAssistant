import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { route, parseId, badRequest, notFound } from '@/lib/apiUtils'

export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid experience id')
  const { title, category, notes, targetYear, done } = await req.json()

  const existing = await prisma.bucketExperience.findUnique({ where: { id } })
  if (!existing) return notFound('Experience not found')

  const experience = await prisma.bucketExperience.update({
    where: { id },
    data: {
      title,
      category,
      notes: notes ?? null,
      targetYear: targetYear != null ? Number(targetYear) : null,
      // Must not default to false: a PUT that only edits the title would
      // otherwise un-complete a finished experience.
      done: done !== undefined ? done : existing.done,
    },
  })
  return NextResponse.json(experience)
})

export const DELETE = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const id = parseId(params.id)
  if (id === null) return badRequest('Invalid experience id')
  await prisma.bucketExperience.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
