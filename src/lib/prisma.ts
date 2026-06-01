import { PrismaClient } from '@prisma/client'

// Use the database URL from env; fallback to local dev.db
const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db'

function createPrismaClient() {
  if (databaseUrl.startsWith('file:')) {
    // Local SQLite via better-sqlite3 adapter (required by Prisma 7)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3')
    const db = new Database(databaseUrl.replace('file:', ''))
    const adapter = new PrismaBetterSqlite3(db)
    return new PrismaClient({ adapter })
  }
  return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
