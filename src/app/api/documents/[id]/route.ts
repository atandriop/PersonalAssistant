import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'assets', 'documents')

function serializeDoc(d: { id: number; name: string; filename: string; originalName: string; mimeType: string; size: number; category: string; notes: string | null; expiryDate: string | null; tags: string; createdAt: Date }) {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    tags: d.tags ? d.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const { name, category, notes, expiryDate, tags } = await req.json()
  const doc = await prisma.document.update({
    where: { id },
    data: {
      name,
      category,
      notes: notes ?? null,
      expiryDate: expiryDate ?? null,
      tags: Array.isArray(tags) ? tags.filter(Boolean).join(',') : (tags ?? undefined),
    },
  })
  return NextResponse.json(serializeDoc(doc))
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await unlink(join(UPLOADS_DIR, doc.filename))
  } catch {
    // file already missing — proceed with DB delete
  }

  await prisma.document.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
