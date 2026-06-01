import { NextResponse } from 'next/server'
import os from 'os'

export async function GET() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  return NextResponse.json({
    totalMem,
    freeMem,
    usedMem: totalMem - freeMem,
    uptimeSeconds: os.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
  })
}
