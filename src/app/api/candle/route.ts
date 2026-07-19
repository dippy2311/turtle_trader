import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

  const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`

  try {
    // Fetch today's intraday data — 5 min intervals
    const end = Math.floor(Date.now() / 1000)
    const start = end - 86400 // last 24 hours
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}?interval=5m&period1=${start}&period2=${end}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    })

    if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`)

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) throw new Error('No data returned')

    const timestamps: number[] = result.timestamp ?? []
    const q = result.indicators.quote[0]
    const meta = result.meta

    // Find 3:16 PM IST = 09:46 UTC
    // Also get current/latest bar
    const IST_OFFSET = 5.5 * 3600 // seconds

    const bars = timestamps.map((ts, i) => {
      const istDate = new Date((ts + IST_OFFSET) * 1000)
      const hh = istDate.getUTCHours()
      const mm = istDate.getUTCMinutes()
      return {
        timestamp: ts,
        time_ist: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
        open:  Number((q.open[i]  ?? 0).toFixed(2)),
        high:  Number((q.high[i]  ?? 0).toFixed(2)),
        low:   Number((q.low[i]   ?? 0).toFixed(2)),
        close: Number((q.close[i] ?? 0).toFixed(2)),
        volume: Math.round(q.volume[i] ?? 0),
      }
    }).filter(b => b.close > 0)

    // Find bar closest to 3:16 PM IST
    const target316 = bars.find(b => b.time_ist >= '15:15' && b.time_ist <= '15:20')
      ?? bars.find(b => b.time_ist >= '15:10' && b.time_ist <= '15:25')
      ?? bars[bars.length - 1]

    // Latest bar
    const latest = bars[bars.length - 1]

    // Day open = first bar of the day
    const dayOpen = bars[0]

    const candle316 = target316 ? {
      time: target316.time_ist,
      open: target316.open,
      high: target316.high,
      low: target316.low,
      close: target316.close,
      volume: target316.volume,
      color: target316.close >= target316.open ? 'GREEN' : 'RED',
      change: Number((target316.close - target316.open).toFixed(2)),
      change_pct: Number(((target316.close - target316.open) / target316.open * 100).toFixed(2)),
    } : null

    // Full day candle
    const dayCandle = dayOpen ? {
      open: dayOpen.open,
      high: Math.max(...bars.map(b => b.high)),
      low: Math.min(...bars.map(b => b.low)),
      close: latest?.close ?? 0,
      color: (latest?.close ?? 0) >= dayOpen.open ? 'GREEN' : 'RED',
      change: Number(((latest?.close ?? 0) - dayOpen.open).toFixed(2)),
      change_pct: Number((((latest?.close ?? 0) - dayOpen.open) / dayOpen.open * 100).toFixed(2)),
    } : null

    // Previous close for gap analysis
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0
    const gap = dayOpen ? Number((dayOpen.open - prevClose).toFixed(2)) : 0
    const gapPct = prevClose ? Number((gap / prevClose * 100).toFixed(2)) : 0

    return NextResponse.json({
      symbol: symbol.replace('.NS', ''),
      date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
      prev_close: Number(prevClose.toFixed(2)),
      gap,
      gap_pct: gapPct,
      candle_316: candle316,
      day_candle: dayCandle,
      latest_price: latest?.close ?? 0,
      latest_time: latest?.time_ist ?? '',
      total_bars: bars.length,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

