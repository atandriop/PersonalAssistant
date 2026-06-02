import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { habitId } = await req.json()
  try {
    const link = await prisma.goalHabitLink.create({
      data: { goalId: Number(params.id), habitId: Number(habitId) },
      include: { habit: true },
    })
    return NextResponse.json(link, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Already linked' }, { status: 409 })
    }
    throw e
  }
}
