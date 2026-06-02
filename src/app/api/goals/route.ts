import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { lifeAreaId, title, timePeriod, notes } = await req.json()
  const goal = await prisma.goal.create({
    data: { lifeAreaId: Number(lifeAreaId), title, timePeriod, notes },
  })
  return NextResponse.json(goal, { status: 201 })
}
