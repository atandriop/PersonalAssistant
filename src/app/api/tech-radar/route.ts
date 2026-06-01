import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await prisma.techRadarItem.findMany({
    orderBy: [{ ring: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { name, ring, category, notes } = await req.json()
  const item = await prisma.techRadarItem.create({
    data: { name, ring, category, notes: notes ?? null },
  })
  return NextResponse.json(item, { status: 201 })
}
