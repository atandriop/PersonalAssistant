import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { action, ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  if (action === 'delete') {
    await prisma.memory.deleteMany({ where: { id: { in: ids } } })
    return new NextResponse(null, { status: 204 })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
