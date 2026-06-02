import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { title } = await req.json()
  const milestone = await prisma.milestone.create({
    data: { goalId: Number(params.id), title },
  })
  return NextResponse.json(milestone, { status: 201 })
}
