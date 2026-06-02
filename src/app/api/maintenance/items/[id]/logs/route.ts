import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { description, date, cost, notes } = await req.json()
  const log = await prisma.maintenanceLog.create({
    data: {
      homeItemId: Number(params.id),
      description,
      date,
      cost: cost != null ? Number(cost) : null,
      notes: notes ?? null,
    },
  })
  return NextResponse.json(log, { status: 201 })
}
