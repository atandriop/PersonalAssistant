import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const areas = await prisma.lifeArea.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      goals: {
        orderBy: { createdAt: 'asc' },
        include: {
          milestones: { orderBy: { createdAt: 'asc' } },
          habitLinks: {
            include: { habit: true },
          },
        },
      },
    },
  })
  return NextResponse.json(areas)
}

export async function POST(req: Request) {
  const { name, color } = await req.json()
  const area = await prisma.lifeArea.create({ data: { name, color } })
  return NextResponse.json(area, { status: 201 })
}
