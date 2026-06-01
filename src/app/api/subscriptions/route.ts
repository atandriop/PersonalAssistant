import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ renewalDate: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(subscriptions)
}

export async function POST(req: Request) {
  const { name, cost, period, renewalDate, url, notes, active } = await req.json()
  const subscription = await prisma.subscription.create({
    data: {
      name, cost: Number(cost), period,
      renewalDate: renewalDate ? new Date(renewalDate) : null,
      url: url ?? null, notes: notes ?? null,
      active: active ?? true,
    },
  })
  return NextResponse.json(subscription, { status: 201 })
}
