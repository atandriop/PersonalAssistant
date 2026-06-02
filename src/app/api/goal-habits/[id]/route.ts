import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.goalHabitLink.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
