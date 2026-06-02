import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const entries = await prisma.netWorthEntry.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const { name, value, type, category, notes } = await req.json()
  const entry = await prisma.netWorthEntry.create({
    data: { name, value: Number(value), type, category, notes: notes ?? null },
  })
  return NextResponse.json(entry, { status: 201 })
}
