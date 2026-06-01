import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const criteria = await prisma.matrixCriteria.findMany({ where: { matrixId: Number(params.id) } })
  return NextResponse.json(criteria)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { name, weight } = await req.json()
  const criterion = await prisma.matrixCriteria.create({
    data: { name, weight: Number(weight), matrixId: Number(params.id) },
  })
  return NextResponse.json(criterion, { status: 201 })
}
