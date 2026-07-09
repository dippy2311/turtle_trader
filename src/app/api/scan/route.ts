import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchOHLCV } from '@/lib/market'
import { evaluate } from '@/lib/signals'
import { STOCK_UNIVERSE } from '@/lib/stocks'

export const maxDuration = 60 // Vercel max for free tier

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10)
  const batch = parseInt(req.nextUrl.searchParams.get('batch') ?? '0')
  const forceRescan = req.nextUrl.searchParams.get('force') === '1'
  const db = supabaseAdmin()

  // Return cached results if already scanned today
  if (!forceRescan && batch === 0) {
    const { data: cached } = await db
      .from('scan_results')
      .select('*')
      .eq('scan_date', today)
      .order('ai_score', { ascending: false })

    if (cached && cached.length > 10) {
      const counts = { BUY: 0, SELL: 0, WATCH: 0, HOLD: 0 }
      cached.forEach(r => { counts[r.signal as keyof typeof counts]++ })
      return NextResponse.json({
        scan_date: today, cached: true,
        total_scanned: cached.length,
        market_trend: cached[0]?.market_trend ?? 'SIDEWAYS',
        counts, signals: cached,
      })
    }
  }

  // Get Nifty trend first
  let marketTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS'
  try {
    const niftyBars = await fetchOHLCV('^NSEI', 300)
    if (niftyBars.length >= 200) {
      const closes = niftyBars.map(b => b.close)
      const last = closes.length - 1
      const ema50 = closes.slice(last - 49, last + 1).reduce((a, b) => a + b) / 50
      const ema200 = closes.slice(last - 199, last + 1).reduce((a, b) => a + b) / 200
      const curr = closes[last]
      if (curr > ema200 && ema50 > ema200) marketTrend = 'BULLISH'
      else if (curr < ema200 && ema50 < ema200) marketTrend = 'BEARISH'
    }
  } catch { /* use SIDEWAYS */ }

  // Select batch of stocks
  const BATCH_SIZE = 50
  const stocks = batch === 0
    ? STOCK_UNIVERSE.slice(0, 50)
    : STOCK_UNIVERSE.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE)

  const results = []
  for (const stock of stocks) {
    try {
      const bars = await fetchOHLCV(stock.symbol, 300)
      const result = evaluate(bars, marketTrend)

      const row = {
        symbol: stock.nse,
        company: stock.company,
        sector: stock.sector,
        scan_date: today,
        market_trend: marketTrend,
        signal: result.signal,
        ai_score: result.ai_score,
        confidence: result.confidence,
        entry_price: result.entry_price,
        stop_loss: result.stop_loss,
        atr: result.atr_val,
        breakout_level: result.breakout_level,
        reasons: result.reasons,
        scores: result.scores,
      }

      // Upsert to DB
      await db.from('scan_results').upsert(row, {
        onConflict: 'symbol,scan_date',
        ignoreDuplicates: false,
      })

      results.push(row)
    } catch (e) {
      console.error(`Skip ${stock.nse}:`, e)
    }
  }

  const counts = { BUY: 0, SELL: 0, WATCH: 0, HOLD: 0 }
  results.forEach(r => { counts[r.signal as keyof typeof counts]++ })

  return NextResponse.json({
    scan_date: today,
    cached: false,
    market_trend: marketTrend,
    total_scanned: results.length,
    counts,
    signals: results,
  })
}
