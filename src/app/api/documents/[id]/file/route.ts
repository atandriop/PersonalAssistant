import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'assets', 'documents')

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const filePath = join(UPLOADS_DIR, doc.filename)

  let size: number
  try {
    size = statSync(filePath).size
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  const url = new URL(req.url)
  const download = url.searchParams.get('download') === 'true'

  const safeName = doc.originalName.replace(/[\x00-\x1f\x7f"\\]/g, '_')
  const headers: Record<string, string> = {
    'Content-Type': doc.mimeType,
    'Content-Length': String(size),
  }
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${safeName}"`
  }

  const nodeStream = createReadStream(filePath)
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', chunk => controller.enqueue(chunk))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', err => controller.error(err))
    },
    cancel() {
      nodeStream.destroy()
    },
  })

  return new Response(webStream, { headers })
}
