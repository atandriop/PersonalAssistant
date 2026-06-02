import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { description, intervalMonths, dueDate } = await req.json()
  const task = await prisma.maintenanceTask.create({
    data: {
      homeItemId: Number(params.id),
      description,
      intervalMonths: intervalMonths != null ? Number(intervalMonths) : null,
      dueDate: dueDate ?? null,
    },
  })
  return NextResponse.json(task, { status: 201 })
}
