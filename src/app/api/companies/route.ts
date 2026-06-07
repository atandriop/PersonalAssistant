import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(companies)
}

export async function POST(req: Request) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const company = await prisma.company.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  })
  return NextResponse.json(company, { status: 201 })
}
