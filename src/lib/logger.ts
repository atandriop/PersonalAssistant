import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const LOGS_DIR = join(process.cwd(), 'logs')
const LOG_FILE = join(LOGS_DIR, 'app.log')

export function log(message: string) {
  try {
    mkdirSync(LOGS_DIR, { recursive: true })
    const timestamp = new Date().toISOString()
    appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`, 'utf8')
  } catch {
    // ignore logging errors — never throw from a logger
  }
}
