import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const matrix = await prisma.matrix.findUnique({
    where: { id: Number(params.id) },
    include: {
      criteria: { include: { scores: true } },
      options: true,
    },
  })
  if (!matrix) return new NextResponse(null, { status: 404 })

  // Flatten scores to top level and strip from criteria for a clean response shape
  const scores = matrix.criteria.flatMap(c => c.scores)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const criteria = matrix.criteria.map(({ scores: _s, ...c }) => c)

  return NextResponse.json({ ...matrix, criteria, scores })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { name, description } = await req.json()
  const matrix = await prisma.matrix.update({
    where: { id: Number(params.id) },
    data: { name, description },
  })
  return NextResponse.json(matrix)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.matrix.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
