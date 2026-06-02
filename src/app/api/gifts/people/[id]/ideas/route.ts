import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { title, occasion, estimatedCost, notes } = await req.json()
  const idea = await prisma.giftIdea.create({
    data: {
      giftPersonId: Number(params.id),
      title,
      occasion: occasion ?? null,
      estimatedCost: estimatedCost != null ? Number(estimatedCost) : null,
      notes: notes ?? null,
    },
  })
  return NextResponse.json(idea, { status: 201 })
}
