import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { name, color, valueMethod, depreciationRate } = await req.json()
  const category = await prisma.category.create({
    data: {
      name,
      color,
      valueMethod: valueMethod ?? 'cost',
      depreciationRate: depreciationRate !== undefined && depreciationRate !== null
        ? Number(depreciationRate)
        : null,
    },
  })
  return NextResponse.json(category, { status: 201 })
}
