import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const holdings = await prisma.portfolioHolding.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(holdings)
}

export async function POST(req: Request) {
  const { name, type, quantity, buyPrice, currentPrice, balance, interestRate, notes } = await req.json()
  const holding = await prisma.portfolioHolding.create({
    data: {
      name, type,
      quantity: quantity != null ? Number(quantity) : null,
      buyPrice: buyPrice != null ? Number(buyPrice) : null,
      currentPrice: currentPrice != null ? Number(currentPrice) : null,
      balance: balance != null ? Number(balance) : null,
      interestRate: interestRate != null ? Number(interestRate) : null,
      notes: notes ?? null,
    },
  })
  return NextResponse.json(holding, { status: 201 })
}
