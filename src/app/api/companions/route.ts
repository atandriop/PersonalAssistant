import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const companions = await prisma.companion.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(companions)
}

export async function POST(req: Request) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const companion = await prisma.companion.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  })
  return NextResponse.json(companion, { status: 201 })
}
