// Upstox Market Data Integration
// Uses the Analytics Access Token (1-year validity, read-only market data)
// Docs: https://upstox.com/developer/api-documentation/

import type { OHLCV } from './signals'

const UPSTOX_TOKEN = process.env.UPSTOX_ACCESS_TOKEN!
const UPSTOX_BASE = 'https://api.upstox.com'

// ── Instrument master — cached in memory per serverless instance ─────────────
// Maps NSE trading_symbol -> instrument_key (e.g. "RELIANCE" -> "NSE_EQ|INE002A01018")
let instrumentCache: Map<string, string> | null = null
let instrumentCacheTime = 0
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours — instruments refresh once daily at 6 AM

async function getInstrumentMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (instrumentCache && now - instrumentCacheTime < CACHE_TTL_MS) {
    return instrumentCache
  }

  // Upstox complete instrument list — gzipped JSON.
  // IMPORTANT: no Next.js `next: { revalidate }` here — this file is 15-20MB+
  // uncompressed and exceeds Vercel's Data Cache per-entry limit, which was
  // silently breaking the fetch (seen as "Failed to set Next.js data cache").
  // Use cache: 'no-store' and rely on our own in-memory Map cache instead.
  const res = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz', {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to fetch Upstox instrument master: ${res.status} ${res.statusText}`)

  const buffer = await res.arrayBuffer()
  const decompressed = await decompressGzip(buffer)

  let instruments: any[]
  try {
    instruments = JSON.parse(decompressed)
  } catch (e) {
    throw new Error(`Failed to parse Upstox instrument master JSON: ${(e as Error).message}`)
  }

  const map = new Map<string, string>()
  for (const inst of instruments) {
    if (inst.segment === 'NSE_EQ' && inst.instrument_type === 'EQ' && inst.trading_symbol) {
      map.set(inst.trading_symbol.toUpperCase(), inst.instrument_key)
    }
    if (inst.segment === 'NSE_INDEX' && inst.trading_symbol) {
      map.set(inst.trading_symbol.toUpperCase(), inst.instrument_key)
    }
  }

  if (map.size === 0) throw new Error('Upstox instrument master parsed but produced 0 entries — check segment/instrument_type field names')

  instrumentCache = map
  instrumentCacheTime = now
  return map
}

// Decompress gzip buffer using Node's built-in zlib (available in Vercel Node runtime)
async function decompressGzip(buffer: ArrayBuffer): Promise<string> {
  const zlib = await import('zlib')
  const { promisify } = await import('util')
  const gunzip = promisify(zlib.gunzip)
  const result = await gunzip(Buffer.from(buffer))
  return result.toString('utf-8')
}

// ── Get instrument_key for a symbol ───────────────────────────────────────────
export async function getInstrumentKey(symbol: string): Promise<string> {
  const map = await getInstrumentMap()
  const key = map.get(symbol.toUpperCase())
  if (!key) throw new Error(`Instrument not found for symbol: ${symbol}`)
  return key
}

// ── Fetch historical daily candles from Upstox V3 API ────────────────────────
export async function fetchUpstoxOHLCV(symbol: string, days = 300): Promise<OHLCV[]> {
  const instrumentKey = await getInstrumentKey(symbol)

  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)

  const toStr = toDate.toISOString().slice(0, 10)
  const fromStr = fromDate.toISOString().slice(0, 10)

  // V3 historical candle endpoint: /v3/historical-candle/{instrument_key}/days/1/{to}/{from}
  const encodedKey = encodeURIComponent(instrumentKey)
  const url = `${UPSTOX_BASE}/v3/historical-candle/${encodedKey}/days/1/${toStr}/${fromStr}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${UPSTOX_TOKEN}`,
    },
    next: { revalidate: 3600 }, // 1 hour cache
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Upstox API error for ${symbol}: ${res.status} — ${errText}`)
  }

  const json = await res.json()
  if (json.status !== 'success') throw new Error(`Upstox returned error status for ${symbol}`)

  // candles format: [timestamp, open, high, low, close, volume, oi]
  const candles: any[][] = json.data?.candles ?? []

  // Upstox returns newest-first — reverse to oldest-first (what signals.ts expects)
  const bars: OHLCV[] = candles
    .map(c => ({
      date: c[0].slice(0, 10),
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      volume: Number(c[5]),
    }))
    .filter(b => b.close > 0)
    .reverse()

  return bars
}

// ── Get Nifty 50 index data ────────────────────────────────────────────────────
export async function fetchNiftyOHLCV(days = 300): Promise<OHLCV[]> {
  // Nifty 50 index instrument key is fixed and well-known
  const NIFTY_INSTRUMENT_KEY = 'NSE_INDEX|Nifty 50'

  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)

  const toStr = toDate.toISOString().slice(0, 10)
  const fromStr = fromDate.toISOString().slice(0, 10)

  const encodedKey = encodeURIComponent(NIFTY_INSTRUMENT_KEY)
  const url = `${UPSTOX_BASE}/v3/historical-candle/${encodedKey}/days/1/${toStr}/${fromStr}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${UPSTOX_TOKEN}`,
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(`Upstox Nifty fetch failed: ${res.status}`)

  const json = await res.json()
  const candles: any[][] = json.data?.candles ?? []

  return candles
    .map(c => ({
      date: c[0].slice(0, 10),
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      volume: Number(c[5]),
    }))
    .filter(b => b.close > 0)
    .reverse()
}

// ── Intraday candles (for 3:16 PM and 15-min tabs) ────────────────────────────
export async function fetchUpstoxIntraday(symbol: string, unit: 'minutes' = 'minutes', interval = 1): Promise<OHLCV[]> {
  const instrumentKey = await getInstrumentKey(symbol)
  const encodedKey = encodeURIComponent(instrumentKey)

  // V3 intraday endpoint: /v3/historical-candle/intraday/{instrument_key}/{unit}/{interval}
  const url = `${UPSTOX_BASE}/v3/historical-candle/intraday/${encodedKey}/${unit}/${interval}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${UPSTOX_TOKEN}`,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) throw new Error(`Upstox intraday fetch failed for ${symbol}: ${res.status}`)

  const json = await res.json()
  const candles: any[][] = json.data?.candles ?? []

  return candles
    .map(c => ({
      date: c[0], // full ISO timestamp for intraday
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      volume: Number(c[5]),
    }))
    .filter(b => b.close > 0)
    .reverse()
}
