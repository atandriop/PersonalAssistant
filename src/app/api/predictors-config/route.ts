import { NextResponse } from 'next/server'
import fs from 'fs'

const CONFIG_PATH = '/home/than/FootballRepo/config/config.json'

function readPredictorsConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  return JSON.parse(raw)
}

function writePredictorsConfig(full: Record<string, unknown>) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(full, null, 2))
}

export async function GET() {
  try {
    const cfg = readPredictorsConfig()
    return NextResponse.json(cfg.compression ?? { codec: 'zstd', level: 3 })
  } catch {
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as { codec?: string; level?: number }
    const cfg = readPredictorsConfig()
    cfg.compression = {
      codec: body.codec ?? cfg.compression?.codec ?? 'zstd',
      level: body.level ?? cfg.compression?.level ?? 3,
    }
    writePredictorsConfig(cfg)
    return NextResponse.json(cfg.compression)
  } catch {
    return NextResponse.json({ error: 'Failed to write config' }, { status: 500 })
  }
}
