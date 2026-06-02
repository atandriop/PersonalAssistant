import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const experiences = await prisma.bucketExperience.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(experiences)
}

export async function POST(req: Request) {
  const { title, category, notes, targetYear } = await req.json()
  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }
  const experience = await prisma.bucketExperience.create({
    data: {
      title,
      category: category ?? 'Other',
      notes: notes ?? null,
      targetYear: targetYear != null ? Number(targetYear) : null,
    },
  })
  return NextResponse.json(experience, { status: 201 })
}
