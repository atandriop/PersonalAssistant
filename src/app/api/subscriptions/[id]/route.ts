import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const subscription = await prisma.subscription.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name, cost: Number(data.cost), period: data.period,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      url: data.url ?? null, notes: data.notes ?? null, active: data.active,
      category: data.category ?? 'Other',
    },
  })
  return NextResponse.json(subscription)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.subscription.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
