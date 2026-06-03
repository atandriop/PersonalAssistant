import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { log } from '@/lib/logger'

const LOG_FILE = join(process.cwd(), 'logs', 'app.log')

export async function GET() {
  try {
    if (!existsSync(LOG_FILE)) return NextResponse.json({ lines: [] })
    const content = readFileSync(LOG_FILE, 'utf8').trim()
    const lines = content ? content.split('\n').slice(-100).reverse() : []
    return NextResponse.json({ lines })
  } catch {
    return NextResponse.json({ lines: [] })
  }
}

export async function DELETE() {
  try {
    writeFileSync(LOG_FILE, '', 'utf8')
    log('Logs cleared')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 })
  }
}
