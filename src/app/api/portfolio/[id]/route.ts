import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json()
  const holding = await prisma.portfolioHolding.update({
    where: { id: Number(params.id) },
    data: {
      name: data.name, type: data.type,
      quantity: data.quantity != null ? Number(data.quantity) : null,
      buyPrice: data.buyPrice != null ? Number(data.buyPrice) : null,
      currentPrice: data.currentPrice != null ? Number(data.currentPrice) : null,
      balance: data.balance != null ? Number(data.balance) : null,
      interestRate: data.interestRate != null ? Number(data.interestRate) : null,
      notes: data.notes ?? null,
    },
  })
  return NextResponse.json(holding)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.portfolioHolding.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
