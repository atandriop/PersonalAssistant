import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function fetchCryptoPrice(name: string): Promise<number | null> {
  try {
    const searchRes = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json() as { coins?: { id: string }[] }
    const coinId = searchData.coins?.[0]?.id
    if (!coinId) return null

    const priceRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`,
      { headers: { Accept: 'application/json' } }
    )
    if (!priceRes.ok) return null
    const priceData = await priceRes.json() as Record<string, { eur?: number }>
    return priceData[coinId]?.eur ?? null
  } catch {
    return null
  }
}

async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json() as { quoteResponse?: { result?: { regularMarketPrice?: number }[] } }
    return data.quoteResponse?.result?.[0]?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

export async function POST() {
  const holdings = await prisma.portfolioHolding.findMany({
    where: { NOT: { type: 'savings' } },
  })

  const updated: string[] = []
  const failed: string[] = []

  await Promise.all(
    holdings.map(async h => {
      const price = h.type === 'crypto'
        ? await fetchCryptoPrice(h.name)
        : await fetchStockPrice(h.name)

      if (price !== null) {
        await prisma.portfolioHolding.update({
          where: { id: h.id },
          data: { currentPrice: price },
        })
        updated.push(h.name)
      } else {
        failed.push(h.name)
      }
    })
  )

  return NextResponse.json({ updated, failed })
}
