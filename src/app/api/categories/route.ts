import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { name, color } = await req.json()
  const category = await prisma.category.create({ data: { name, color } })
  return NextResponse.json(category, { status: 201 })
}
