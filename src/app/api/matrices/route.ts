import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const matrices = await prisma.matrix.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(matrices)
}

export async function POST(req: Request) {
  const { name, description } = await req.json()
  const matrix = await prisma.matrix.create({ data: { name, description } })
  return NextResponse.json(matrix, { status: 201 })
}
