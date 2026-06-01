import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const options = await prisma.matrixOption.findMany({ where: { matrixId: Number(params.id) } })
  return NextResponse.json(options)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { name } = await req.json()
  const option = await prisma.matrixOption.create({
    data: { name, matrixId: Number(params.id) },
  })
  return NextResponse.json(option, { status: 201 })
}
