import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { personId } = await req.json()
  const companion = await prisma.companion.update({
    where: { id: Number(params.id) },
    data: { personId: personId != null ? Number(personId) : null },
  })
  return NextResponse.json(companion)
}
