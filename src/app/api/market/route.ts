import { NextResponse } from 'next/server'
import { fetchOHLCV } from '@/lib/market'

export async function GET() {
  try {
    const bars = await fetchOHLCV('^NSEI', 300)
    const closes = bars.map(b => b.close)
    const last = closes.length - 1
    const curr = closes[last]
    const prev = closes[last - 1]
    const ema50  = closes.slice(last - 49, last + 1).reduce((a, b) => a + b) / 50
    const ema200 = closes.slice(last - 199, last + 1).reduce((a, b) => a + b) / 200

    const trend = curr > ema200 && ema50 > ema200 ? 'BULLISH'
      : curr < ema200 && ema50 < ema200 ? 'BEARISH' : 'SIDEWAYS'

    const changePct = (curr - prev) / prev * 100
    const base = trend === 'BULLISH' ? 70 : trend === 'BEARISH' ? 30 : 50
    const mood = Math.min(100, Math.max(0, base + (changePct > 0 ? 1 : -1) * Math.min(Math.abs(changePct) * 3, 15)))

    // NSE hours: 9:15 AM – 3:30 PM IST (UTC+5:30)
    const now = new Date()
    const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 0.5 : 0)
    const isWeekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5
    const isOpen = isWeekday && istHour >= 9.25 && istHour <= 15.5

    return NextResponse.json({
      is_open: isOpen,
      nifty_close: Math.round(curr),
      nifty_change: Math.round((curr - prev) * 100) / 100,
      nifty_change_pct: Math.round(changePct * 100) / 100,
      trend,
      mood_score: Math.round(mood),
    })
  } catch {
    return NextResponse.json({ is_open: false, nifty_close: 0, nifty_change: 0, nifty_change_pct: 0, trend: 'SIDEWAYS', mood_score: 50 })
  }
}
