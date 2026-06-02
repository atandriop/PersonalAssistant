import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, category, notes, targetYear, done } = await req.json()
  const experience = await prisma.bucketExperience.update({
    where: { id: Number(params.id) },
    data: {
      title,
      category,
      notes: notes ?? null,
      targetYear: targetYear != null ? Number(targetYear) : null,
      done: done ?? false,
    },
  })
  return NextResponse.json(experience)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.bucketExperience.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
