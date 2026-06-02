import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { title, occasion, estimatedCost, purchased, notes } = await req.json()
  const idea = await prisma.giftIdea.update({
    where: { id: Number(params.id) },
    data: {
      title,
      occasion: occasion ?? null,
      estimatedCost: estimatedCost != null ? Number(estimatedCost) : null,
      purchased: Boolean(purchased),
      notes: notes ?? null,
    },
  })
  return NextResponse.json(idea)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.giftIdea.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
