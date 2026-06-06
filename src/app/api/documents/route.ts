import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const UPLOADS_DIR = join(process.cwd(), 'assets', 'documents')

function serializeDoc(d: { id: number; name: string; filename: string; originalName: string; mimeType: string; size: number; category: string; notes: string | null; expiryDate: string | null; tags: string; createdAt: Date }) {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    tags: d.tags ? d.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  }
}

export async function GET() {
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(docs.map(serializeDoc))
}

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const name = form.get('name') as string | null
  const category = form.get('category') as string | null
  const notes = (form.get('notes') as string | null) || null
  const expiryDate = (form.get('expiryDate') as string | null) || null
  const tagsRaw = (form.get('tags') as string | null) || ''

  if (!file || !name || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const originalExt = file.name.includes('.') ? '.' + file.name.split('.').pop()! : ''
  const filename = randomUUID() + originalExt

  await mkdir(UPLOADS_DIR, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(join(UPLOADS_DIR, filename), Buffer.from(bytes))

  let doc
  try {
    doc = await prisma.document.create({
      data: {
        name,
        filename,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        category,
        notes,
        expiryDate,
        tags: tagsRaw,
      },
    })
  } catch (e) {
    await unlink(join(UPLOADS_DIR, filename)).catch(() => {})
    return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
  }

  return NextResponse.json(serializeDoc(doc), { status: 201 })
}
