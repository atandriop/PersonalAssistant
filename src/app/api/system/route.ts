import { NextResponse } from 'next/server'
import os from 'os'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()

  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
  let dbSize = 0
  try { dbSize = fs.statSync(dbPath).size } catch {}

  return NextResponse.json({
    totalMem,
    freeMem,
    usedMem: totalMem - freeMem,
    uptimeSeconds: os.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    dbSize,
  })
}
