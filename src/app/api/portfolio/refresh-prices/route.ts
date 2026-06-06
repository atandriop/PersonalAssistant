import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function searchCoinId(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const data = await res.json() as { coins?: { id: string }[] }
    return data.coins?.[0]?.id ?? null
  } catch {
    return null
  }
}

async function fetchCryptoPrices(coinIds: string[]): Promise<Record<string, { eur?: number }>> {
  if (coinIds.length === 0) return {}
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=eur`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return {}
    return await res.json() as Record<string, { eur?: number }>
  } catch {
    return {}
  }
}

async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const [quoteRes, fxRes] = await Promise.all([
      fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
        { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } }
      ),
      fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=EURUSD%3DX`,
        { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } }
      ),
    ])
    if (!quoteRes.ok || !fxRes.ok) return null
    const quoteData = await quoteRes.json() as { quoteResponse?: { result?: { regularMarketPrice?: number; currency?: string }[] } }
    const fxData = await fxRes.json() as { quoteResponse?: { result?: { regularMarketPrice?: number }[] } }
    const price = quoteData.quoteResponse?.result?.[0]?.regularMarketPrice ?? null
    const currency = quoteData.quoteResponse?.result?.[0]?.currency ?? 'USD'
    if (price === null) return null
    if (currency === 'EUR') return price
    const eurUsd = fxData.quoteResponse?.result?.[0]?.regularMarketPrice ?? null
    if (eurUsd === null) return null
    return price / eurUsd
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

  const cryptoHoldings = holdings.filter(h => h.type === 'crypto')
  const stockHoldings = holdings.filter(h => h.type !== 'crypto')

  // Batch crypto: resolve IDs in parallel, then one price call
  const coinIds = await Promise.all(cryptoHoldings.map(h => searchCoinId(h.name)))
  const validCryptoMap = new Map<number, string>() // holdingId → coinId
  cryptoHoldings.forEach((h, i) => {
    if (coinIds[i]) validCryptoMap.set(h.id, coinIds[i]!)
  })

  const batchPriceData = await fetchCryptoPrices(Array.from(validCryptoMap.values()))

  await Promise.all(
    cryptoHoldings.map(async h => {
      const coinId = validCryptoMap.get(h.id)
      const price = coinId ? batchPriceData[coinId]?.eur ?? null : null
      if (price !== null) {
        await prisma.portfolioHolding.update({ where: { id: h.id }, data: { currentPrice: price } })
        updated.push(h.name)
      } else {
        failed.push(h.name)
      }
    })
  )

  // Stocks: individual fetches (already EUR-converted)
  await Promise.all(
    stockHoldings.map(async h => {
      const price = await fetchStockPrice(h.name)
      if (price !== null) {
        await prisma.portfolioHolding.update({ where: { id: h.id }, data: { currentPrice: price } })
        updated.push(h.name)
      } else {
        failed.push(h.name)
      }
    })
  )

  return NextResponse.json({ updated, failed })
}
