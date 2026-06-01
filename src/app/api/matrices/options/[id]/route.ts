import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name } = await req.json()
  const option = await prisma.matrixOption.update({
    where: { id: Number(params.id) },
    data: { name },
  })
  return NextResponse.json(option)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.matrixOption.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
