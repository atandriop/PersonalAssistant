import { NextResponse } from 'next/server'
import { readConfig, writeConfig } from '@/lib/config'

export async function GET() {
  const config = readConfig()
  return NextResponse.json(config)
}

export async function PUT(req: Request) {
  const body = await req.json()
  const config = writeConfig(body)
  return NextResponse.json(config)
}
