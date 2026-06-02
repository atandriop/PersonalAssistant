import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await prisma.homeItem.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      tasks: { orderBy: { createdAt: 'asc' } },
      logs: { orderBy: { date: 'desc' } },
    },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { name, notes } = await req.json()
  const item = await prisma.homeItem.create({ data: { name, notes: notes ?? null } })
  return NextResponse.json(item, { status: 201 })
}
