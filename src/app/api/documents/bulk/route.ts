import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const UPLOADS_DIR = join(process.cwd(), 'assets', 'documents')

export async function POST(req: Request) {
  const { action, ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  if (action === 'delete') {
    const docs = await prisma.document.findMany({ where: { id: { in: ids } }, select: { filename: true } })
    await prisma.document.deleteMany({ where: { id: { in: ids } } })
    await Promise.allSettled(docs.map(d => unlink(join(UPLOADS_DIR, d.filename))))
    return new NextResponse(null, { status: 204 })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
