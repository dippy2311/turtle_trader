import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchOHLCV, getActiveDataSource } from '@/lib/market'
import { evaluate } from '@/lib/signals'
import { STOCK_UNIVERSE } from '@/lib/stocks'

export const maxDuration = 60 // Vercel max for free tier

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10)
  const batch = parseInt(req.nextUrl.searchParams.get('batch') ?? '0')
  const forceRescan = req.nextUrl.searchParams.get('force') === '1'
  const db = supabaseAdmin()

  // ── Smart cache logic ────────────────────────────────────────────────────────
  // During market hours (9:15–15:30 IST) → always fresh on user request
  // Post market → cache for the day (no point rescanning)
  // forceRescan=1 → always bypass cache

  const nowUTC = new Date()
  const istMinutes = (nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes() + 330) % (24 * 60)
  const marketOpen  = 9  * 60 + 15   // 9:15 AM IST
  const marketClose = 15 * 60 + 30   // 3:30 PM IST
  const isWeekday   = nowUTC.getUTCDay() >= 1 && nowUTC.getUTCDay() <= 5
  const isMarketHours = isWeekday && istMinutes >= marketOpen && istMinutes <= marketClose

  // Use cache only if: NOT force rescan AND NOT market hours AND already have today's data
  const useCache = !forceRescan && !isMarketHours && batch === 0

  if (useCache) {
    const { data: cached } = await db
      .from('scan_results')
      .select('*')
      .eq('scan_date', today)
      .order('ai_score', { ascending: false })

    if (cached && cached.length > 10) {
      const counts: Record<string, number> = { BUY: 0, 'STRONG BUY': 0, SELL: 0, WATCH: 0, HOLD: 0 }
      cached.forEach(r => { if (counts[r.signal] !== undefined) counts[r.signal]++; else counts[r.signal] = 1 })
      return NextResponse.json({
        scan_date: today,
        cached: true,
        is_market_hours: false,
        total_scanned: cached.length,
        market_trend: cached[0]?.market_trend ?? 'SIDEWAYS',
        counts: counts as any,
        signals: cached,
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

  // Select batch of stocks — each batch = 50 stocks
  const BATCH_SIZE = 50
  const stocks = STOCK_UNIVERSE.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE)
  if (!stocks.length) return NextResponse.json({ signals: [], counts: {}, total_scanned: 0, scan_date: today, cached: false, is_market_hours: isMarketHours })

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
        options_setup: result.options_setup ?? null,
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

  const counts: Record<string, number> = { BUY: 0, 'STRONG BUY': 0, SELL: 0, WATCH: 0, HOLD: 0 }
  results.forEach(r => { if (counts[r.signal] !== undefined) counts[r.signal]++; else counts[r.signal] = 1 })

  return NextResponse.json({
    scan_date: today,
    cached: false,
    is_market_hours: isMarketHours,
    data_source: getActiveDataSource(),
    market_trend: marketTrend,
    total_scanned: results.length,
    counts: counts as any,
    signals: results,
  })
}
