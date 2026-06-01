import { NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST() {
  exec('systemctl --user restart personal-assistant', err => {
    if (err) console.error('Restart error:', err)
  })
  return NextResponse.json({ message: 'Restarting…' })
}
