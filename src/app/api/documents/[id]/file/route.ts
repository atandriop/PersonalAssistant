import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents')

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let buffer: Buffer
  try {
    buffer = await readFile(join(UPLOADS_DIR, doc.filename))
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  const url = new URL(req.url)
  const download = url.searchParams.get('download') === 'true'

  const headers: Record<string, string> = {
    'Content-Type': doc.mimeType,
    'Content-Length': String(buffer.length),
  }
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${doc.originalName}"`
  }

  return new Response(new Uint8Array(buffer), { headers })
}
