import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { description, intervalMonths, dueDate, lastDoneDate } = await req.json()
  const task = await prisma.maintenanceTask.update({
    where: { id: Number(params.id) },
    data: {
      description,
      intervalMonths: intervalMonths != null ? Number(intervalMonths) : null,
      dueDate: dueDate ?? null,
      lastDoneDate: lastDoneDate ?? null,
    },
  })
  return NextResponse.json(task)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.maintenanceTask.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
