import { NextRequest, NextResponse } from 'next/server'
import { fetchOHLCV, generateExplanation } from '@/lib/market'
import { evaluate } from '@/lib/signals'
import { STOCK_UNIVERSE } from '@/lib/stocks'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

  const stock = STOCK_UNIVERSE.find(s => s.nse === symbol)
  const yfSymbol = stock?.symbol ?? `${symbol}.NS`

  try {
    const bars = await fetchOHLCV(yfSymbol, 300)
    const result = evaluate(bars)
    const explanation = generateExplanation(symbol, {
      signal: result.signal,
      ai_score: result.ai_score,
      confidence: result.confidence,
      entry_price: result.entry_price,
      stop_loss: result.stop_loss,
      scores: result.scores,
      reasons: result.reasons,
    })

    // Last 200 bars for chart
    const ohlcv = bars.slice(-200).map(b => ({
      time: b.date,
      open: b.open, high: b.high, low: b.low, close: b.close,
      volume: b.volume,
    }))

    return NextResponse.json({
      symbol,
      company: stock?.company ?? symbol,
      sector: stock?.sector ?? 'Unknown',
      signal: result,
      ohlcv,
      explanation,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
