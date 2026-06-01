import { NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST() {
  exec('systemctl --user stop personal-assistant', err => {
    if (err) console.error('Shutdown error:', err)
  })
  return NextResponse.json({ message: 'Shutting down…' })
}
