import { NextResponse } from 'next/server'
import { readConfig, writeConfig } from '@/lib/config'
import { route, badRequest } from '@/lib/apiUtils'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  return NextResponse.json(readConfig())
})

export const PUT = route(async (req: Request) => {
  const body = await req.json()

  // config.json drives the dev launcher's port, so only a known key with a
  // valid value is written — an arbitrary body used to be merged in wholesale.
  const port = Number(body?.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return badRequest('port must be an integer between 1 and 65535')
  }

  return NextResponse.json(writeConfig({ port }))
})
