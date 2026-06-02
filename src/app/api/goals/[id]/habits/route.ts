import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { habitId } = await req.json()
  const link = await prisma.goalHabitLink.create({
    data: { goalId: Number(params.id), habitId: Number(habitId) },
    include: { habit: true },
  })
  return NextResponse.json(link, { status: 201 })
}
