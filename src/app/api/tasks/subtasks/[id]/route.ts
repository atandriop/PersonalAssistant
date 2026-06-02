import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, done } = await req.json()
  const subtask = await prisma.subtask.update({
    where: { id: Number(params.id) },
    data: {
      ...(title != null ? { title } : {}),
      ...(done != null ? { done } : {}),
    },
  })
  return NextResponse.json(subtask)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.subtask.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
