import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { title } = await req.json()
  const subtask = await prisma.subtask.create({
    data: { taskId: Number(params.id), title },
  })
  return NextResponse.json(subtask, { status: 201 })
}
