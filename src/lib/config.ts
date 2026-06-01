import fs from 'fs'
import path from 'path'

export interface Config {
  port: number
}

const CONFIG_PATH = path.join(process.cwd(), 'config.json')

export function readConfig(): Config {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  return JSON.parse(raw) as Config
}

export function writeConfig(partial: Partial<Config>): Config {
  const current = readConfig()
  const updated = { ...current, ...partial }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2))
  return updated
}
