import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import { log } from '@/lib/logger'

const execAsync = promisify(exec)

const ROOT = process.cwd()
const BACKUPS_DIR = join(ROOT, 'backups')

function ensureBackupsDir() {
  mkdirSync(BACKUPS_DIR, { recursive: true })
}

export async function GET() {
  try {
    ensureBackupsDir()
    const files = readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('homebase-') && f.endsWith('.tar.gz'))
      .map(f => {
        const stat = statSync(join(BACKUPS_DIR, f))
        return { name: f, size: stat.size, createdAt: stat.mtime.toISOString() }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return NextResponse.json(files)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST() {
  try {
    ensureBackupsDir()
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `homebase-${ts}.tar.gz`
    const dest = join(BACKUPS_DIR, filename)
    // Archive the database + all user assets into a single compressed tarball
    await execAsync(`tar -czf "${dest}" -C "${ROOT}" prisma/dev.db assets/`, { timeout: 30000 })
    const size = statSync(dest).size
    log(`Backup created: ${filename} (${(size / 1024).toFixed(0)} KB)`)
    return NextResponse.json({ filename }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    ensureBackupsDir()
    const files = readdirSync(BACKUPS_DIR).filter(f => f.startsWith('homebase-') && f.endsWith('.tar.gz'))
    files.forEach(f => unlinkSync(join(BACKUPS_DIR, f)))
    log(`Cleaned ${files.length} backup(s)`)
    return NextResponse.json({ deleted: files.length })
  } catch {
    return NextResponse.json({ deleted: 0 })
  }
}
