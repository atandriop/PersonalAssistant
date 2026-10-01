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

/** EUR/USD rate, fetched once per request rather than once per holding. */
async function fetchEurUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=EURUSD%3DX`,
      { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json() as { quoteResponse?: { result?: { regularMarketPrice?: number }[] } }
    return data.quoteResponse?.result?.[0]?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

// The FX rate is passed in: it used to be re-fetched inside this function, so a
// refresh with 5 non-crypto holdings made 5 identical calls to the same Yahoo
// endpoint, for 5x the latency and rate-limit exposure.
async function fetchStockPrice(symbol: string, eurUsd: number | null): Promise<number | null> {
  try {
    const quoteRes = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!quoteRes.ok) return null
    const quoteData = await quoteRes.json() as { quoteResponse?: { result?: { regularMarketPrice?: number; currency?: string }[] } }
    const price = quoteData.quoteResponse?.result?.[0]?.regularMarketPrice ?? null
    const currency = quoteData.quoteResponse?.result?.[0]?.currency ?? 'USD'
    if (price === null) return null
    if (currency === 'EUR') return price
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

  // Stocks: one quote each, sharing a single FX rate for the whole request
  const eurUsd = stockHoldings.length > 0 ? await fetchEurUsd() : null
  await Promise.all(
    stockHoldings.map(async h => {
      const price = await fetchStockPrice(h.name, eurUsd)
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
