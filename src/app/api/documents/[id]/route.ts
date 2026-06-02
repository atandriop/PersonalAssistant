import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents')

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const { name, category, notes, expiryDate } = await req.json()
  const doc = await prisma.document.update({
    where: { id },
    data: {
      name,
      category,
      notes: notes ?? null,
      expiryDate: expiryDate ?? null,
    },
  })
  return NextResponse.json(doc)
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
