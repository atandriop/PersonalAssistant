import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const habits = await prisma.habit.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(habits)
}

export async function POST(req: Request) {
  const { name, color } = await req.json()
  const habit = await prisma.habit.create({ data: { name, color } })
  return NextResponse.json(habit, { status: 201 })
}
