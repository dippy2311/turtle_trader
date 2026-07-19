import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

// Returns the most recent trading session's 3:16 PM candle
// Works on weekends, holidays, and after market hours
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

  const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`

  try {
    // Fetch last 7 days of 5-min data to cover weekends + holidays
    const end = Math.floor(Date.now() / 1000)
    const start = end - 7 * 24 * 60 * 60

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}?interval=5m&period1=${start}&period2=${end}&includePrePost=false`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    })

    if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`)

    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) throw new Error(`No data found for ${symbol}. Check the NSE symbol.`)

    const timestamps: number[] = result.timestamp ?? []
    const q = result.indicators.quote[0]
    const meta = result.meta

    if (!timestamps.length) throw new Error(`No trading data for ${symbol}`)

    // Convert all bars to IST
    const IST_OFFSET = 5.5 * 3600
    const allBars = timestamps.map((ts, i) => {
      const istDate = new Date((ts + IST_OFFSET) * 1000)
      const dateStr = istDate.toISOString().slice(0, 10)
      const hh = istDate.getUTCHours()
      const mm = istDate.getUTCMinutes()
      const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
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

    if (!allBars.length) throw new Error(`No valid price data for ${symbol}`)

    // Get all unique trading dates (sorted newest first)
    const tradingDates = [...new Set(allBars.map(b => b.date))].sort().reverse()

    // ── Find the most recent session that has reached 3:16 PM ──
    // Check if market has crossed 3:16 PM today IST
    const nowIST = new Date(Date.now() + IST_OFFSET * 1000)
    const nowTimeStr = `${String(nowIST.getUTCHours()).padStart(2,'0')}:${String(nowIST.getUTCMinutes()).padStart(2,'0')}`
    const todayIST = nowIST.toISOString().slice(0, 10)
    const marketReached316Today = tradingDates[0] === todayIST && nowTimeStr >= '15:16'

    // Pick the session to show:
    // - If market has passed 3:16 PM today → use today
    // - Otherwise → use the most recent previous trading session
    let sessionDate: string
    if (marketReached316Today) {
      sessionDate = todayIST
    } else {
      // Use most recent session (could be today before 3:16, or last trading day)
      // Find most recent session with bars after 15:10
      sessionDate = tradingDates[0]
      for (const d of tradingDates) {
        const sessionBars = allBars.filter(b => b.date === d)
        const has316 = sessionBars.some(b => b.time_ist >= '15:10')
        if (has316) {
          sessionDate = d
          break
        }
      }
    }

    // Get all bars for the selected session
    const sessionBars = allBars.filter(b => b.date === sessionDate)
    if (!sessionBars.length) throw new Error(`No data for trading session ${sessionDate}`)

    // ── 3:16 PM candle — find closest bar to 15:16 ──
    const bar316 = sessionBars.find(b => b.time_ist >= '15:15' && b.time_ist <= '15:20')
      ?? sessionBars.find(b => b.time_ist >= '15:10' && b.time_ist <= '15:25')
      ?? sessionBars.find(b => b.time_ist >= '15:00' && b.time_ist <= '15:30')
      ?? sessionBars[sessionBars.length - 1]  // fallback to last bar of session

    // ── Day candle (full session) ──
    const dayOpen  = sessionBars[0]
    const dayClose = sessionBars[sessionBars.length - 1]
    const dayHigh  = Math.max(...sessionBars.map(b => b.high))
    const dayLow   = Math.min(...sessionBars.map(b => b.low))

    // ── Previous session for gap calculation ──
    const prevSessionDate = tradingDates.find(d => d !== sessionDate)
    const prevSessionBars = prevSessionDate ? allBars.filter(b => b.date === prevSessionDate) : []
    const prevClose = prevSessionBars.length
      ? prevSessionBars[prevSessionBars.length - 1].close
      : (meta.chartPreviousClose ?? meta.previousClose ?? 0)

    // ── Calculate candle details ──
    const c316Change    = Number((bar316.close - bar316.open).toFixed(2))
    const c316ChangePct = Number(((bar316.close - bar316.open) / bar316.open * 100).toFixed(2))
    const dayChange     = Number((dayClose.close - dayOpen.open).toFixed(2))
    const dayChangePct  = Number(((dayClose.close - dayOpen.open) / dayOpen.open * 100).toFixed(2))
    const gap           = prevClose ? Number((dayOpen.open - prevClose).toFixed(2)) : 0
    const gapPct        = prevClose ? Number((gap / prevClose * 100).toFixed(2)) : 0

    // ── Is this today's session or a previous session? ──
    const isCurrentSession = sessionDate === todayIST
    const isWeekend = [0, 6].includes(new Date().getDay()) // 0=Sun, 6=Sat
    const sessionLabel = isCurrentSession
      ? (nowTimeStr < '09:15' ? 'Pre-market' : nowTimeStr < '15:30' ? 'Live session' : "Today's session")
      : `Last session (${formatDisplayDate(sessionDate)})`

    return NextResponse.json({
      symbol: symbol.replace('.NS', ''),
      session_date: sessionDate,
      session_label: sessionLabel,
      is_current_session: isCurrentSession,
      prev_close: Number(prevClose.toFixed(2)),
      gap,
      gap_pct: gapPct,

      candle_316: {
        time: bar316.time_ist,
        open:   bar316.open,
        high:   bar316.high,
        low:    bar316.low,
        close:  bar316.close,
        volume: bar316.volume,
        color:  bar316.close >= bar316.open ? 'GREEN' : 'RED',
        change:     c316Change,
        change_pct: c316ChangePct,
      },

      day_candle: {
        open:   dayOpen.open,
        high:   dayHigh,
        low:    dayLow,
        close:  dayClose.close,
        color:  dayClose.close >= dayOpen.open ? 'GREEN' : 'RED',
        change:     dayChange,
        change_pct: dayChangePct,
      },

      latest_price: dayClose.close,
      latest_time:  dayClose.time_ist,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
