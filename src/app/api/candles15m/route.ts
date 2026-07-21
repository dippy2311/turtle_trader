import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase() ?? 'INFY'
  const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`

  try {
    const end = Math.floor(Date.now() / 1000)
    const start = end - 2 * 24 * 60 * 60 // last 2 days

    // Fetch 15-min candles
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}?interval=15m&period1=${start}&period2=${end}&includePrePost=false`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 }, // always fresh
    })

    if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`)

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) throw new Error(`No data for ${symbol}`)

    const timestamps: number[] = result.timestamp ?? []
    const q = result.indicators.quote[0]
    const meta = result.meta

    const IST_OFFSET = 5.5 * 3600

    const allBars = timestamps.map((ts, i) => {
      const istDate = new Date((ts + IST_OFFSET) * 1000)
      const dateStr = istDate.toISOString().slice(0, 10)
      const hh = istDate.getUTCHours()
      const mm = istDate.getUTCMinutes()
      const timeStr = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
      return {
        timestamp: ts,
        date: dateStr,
        time_ist: timeStr,
        open:   Number((q.open[i]   ?? 0).toFixed(2)),
        high:   Number((q.high[i]   ?? 0).toFixed(2)),
        low:    Number((q.low[i]    ?? 0).toFixed(2)),
        close:  Number((q.close[i]  ?? 0).toFixed(2)),
        volume: Math.round(q.volume[i] ?? 0),
      }
    }).filter(b => b.close > 0)

    if (!allBars.length) throw new Error(`No valid data for ${symbol}`)

    // Get today's date in IST
    const nowIST = new Date(Date.now() + IST_OFFSET * 1000)
    const todayIST = nowIST.toISOString().slice(0, 10)
    const nowTimeStr = `${String(nowIST.getUTCHours()).padStart(2,'0')}:${String(nowIST.getUTCMinutes()).padStart(2,'0')}`

    // Get most recent trading session
    const tradingDates = [...new Set(allBars.map(b => b.date))].sort().reverse()
    const sessionDate = tradingDates[0]
    const sessionBars = allBars.filter(b => b.date === sessionDate)

    if (!sessionBars.length) throw new Error(`No session data`)

    // Day open = first candle open of the session
    const dayOpen = sessionBars[0].open

    // Previous close
    const prevDate = tradingDates[1]
    const prevBars = prevDate ? allBars.filter(b => b.date === prevDate) : []
    const prevClose = prevBars.length
      ? prevBars[prevBars.length - 1].close
      : Number((meta.chartPreviousClose ?? meta.previousClose ?? 0).toFixed(2))

    // Tolerance for day open condition: 0.5%
    const TOLERANCE = 0.005

    // Process each 15-min candle
    const candles = sessionBars.map((bar, i) => {
      const isGreen = bar.close >= bar.open
      const change = Number((bar.close - bar.open).toFixed(2))
      const changePct = Number(((bar.close - bar.open) / bar.open * 100).toFixed(2))

      // BUY condition: candle LOW touches Day Open (±0.5%)
      const lowTouchesDayOpen = Math.abs(bar.low - dayOpen) / dayOpen <= TOLERANCE
      // SELL condition: candle HIGH touches Day Open (±0.5%)
      const highTouchesDayOpen = Math.abs(bar.high - dayOpen) / dayOpen <= TOLERANCE

      let alert = null
      if (lowTouchesDayOpen) {
        alert = {
          type: 'BUY',
          message: `🔔 BUY Alert — Candle LOW (₹${bar.low}) touched Day Open (₹${dayOpen}). Strong support level!`,
        }
      } else if (highTouchesDayOpen) {
        alert = {
          type: 'SELL',
          message: `🔔 SELL Alert — Candle HIGH (₹${bar.high}) touched Day Open (₹${dayOpen}). Resistance level!`,
        }
      }

      return {
        time_ist: bar.time_ist,
        open:   bar.open,
        high:   bar.high,
        low:    bar.low,
        close:  bar.close,
        volume: bar.volume,
        color:  isGreen ? 'GREEN' : 'RED',
        change,
        change_pct: changePct,
        alert,
        is_current: i === sessionBars.length - 1,
      }
    })

    // Current candle = last one
    const currentCandle = candles[candles.length - 1]

    // Market status
    const isMarketOpen = sessionDate === todayIST
      && nowTimeStr >= '09:15'
      && nowTimeStr <= '15:30'
      && nowIST.getUTCDay() >= 1
      && nowIST.getUTCDay() <= 5

    // Any alerts today
    const alerts = candles.filter(c => c.alert !== null)

    // Gap analysis
    const gap = Number((dayOpen - prevClose).toFixed(2))
    const gapPct = prevClose ? Number((gap / prevClose * 100).toFixed(2)) : 0

    return NextResponse.json({
      symbol: symbol.replace('.NS', ''),
      session_date: sessionDate,
      is_market_open: isMarketOpen,
      fetched_at: nowTimeStr,
      day_open: dayOpen,
      prev_close: prevClose,
      gap,
      gap_pct: gapPct,
      current_candle: currentCandle,
      candles,          // all 15-min candles for the session
      alerts,           // candles that triggered BUY or SELL alert
      total_candles: candles.length,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
