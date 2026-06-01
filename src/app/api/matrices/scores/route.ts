import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request) {
  const { criteriaId, optionId, score } = await req.json()
  const matrixScore = await prisma.matrixScore.upsert({
    where: { optionId_criteriaId: { optionId: Number(optionId), criteriaId: Number(criteriaId) } },
    create: { score: Number(score), optionId: Number(optionId), criteriaId: Number(criteriaId) },
    update: { score: Number(score) },
  })
  return NextResponse.json(matrixScore)
}
