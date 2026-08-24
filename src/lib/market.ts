// Fetch OHLCV — Upstox (live NSE data) with Yahoo Finance fallback
import type { OHLCV } from './signals'
import { fetchUpstoxOHLCV, fetchNiftyOHLCV } from './upstox'

const USE_UPSTOX = !!process.env.UPSTOX_ACCESS_TOKEN

// Tracks which source actually served the last successful fetch —
// starts as the configured preference, flips to 'yahoo' if Upstox fails at runtime.
let lastUsedSource: 'upstox' | 'yahoo' = USE_UPSTOX ? 'upstox' : 'yahoo'

export function getActiveDataSource(): 'upstox' | 'yahoo' {
  return lastUsedSource
}

export async function fetchOHLCV(symbol: string, days = 300): Promise<OHLCV[]> {
  // Strip Yahoo-style suffix — Upstox uses plain NSE trading symbols
  const cleanSymbol = symbol.replace('.NS', '')

  if (USE_UPSTOX) {
    try {
      // Nifty 50 index — Yahoo used '^NSEI', Upstox has its own index fetcher
      if (symbol === '^NSEI' || cleanSymbol === 'NIFTY50' || cleanSymbol === 'NIFTY') {
        const bars = await fetchNiftyOHLCV(days)
        lastUsedSource = 'upstox'
        return bars
      }
      const bars = await fetchUpstoxOHLCV(cleanSymbol, days)
      lastUsedSource = 'upstox'
      return bars
    } catch (e) {
      console.warn(`Upstox fetch failed for ${symbol}, falling back to Yahoo Finance:`, e)
      lastUsedSource = 'yahoo'
      // fall through to Yahoo Finance below
    }
  }

  // Yahoo Finance fallback (also used if UPSTOX_ACCESS_TOKEN is not set)
  const end = Math.floor(Date.now() / 1000)
  const start = end - days * 24 * 60 * 60
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${start}&period2=${end}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(`Yahoo Finance error for ${symbol}: ${res.status}`)

  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)

  const timestamps: number[] = result.timestamp
  const q = result.indicators.quote[0]

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    open:   Number((q.open[i]   ?? 0).toFixed(2)),
    high:   Number((q.high[i]   ?? 0).toFixed(2)),
    low:    Number((q.low[i]    ?? 0).toFixed(2)),
    close:  Number((q.close[i]  ?? 0).toFixed(2)),
    volume: Math.round(q.volume[i] ?? 0),
  })).filter(b => b.close > 0)
}

// ── Rule-based AI explanation — FREE, no LLM ─────────────────────────────────

// ── Shared market trend calculator ────────────────────────────────────────────
// Single source of truth for BULLISH/BEARISH/SIDEWAYS — used by both the
// scanner (bulk scan) and the stock detail page, so AI scores never diverge
// between the list view and the detail view for the same stock.
export async function getMarketTrend(): Promise<'BULLISH' | 'BEARISH' | 'SIDEWAYS'> {
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
  return marketTrend
}

export function generateExplanation(symbol: string, data: {
  signal: string; ai_score: number; confidence: number
  entry_price: number; stop_loss: number
  scores: Record<string, number>; reasons: string[]
}): string {
  const { signal, ai_score, confidence, entry_price, stop_loss, scores } = data
  const riskPct = ((entry_price - stop_loss) / entry_price * 100).toFixed(1)

  const trendPara = scores.trend >= 80
    ? `${symbol} is in a strong uptrend. All three EMAs (20, 50, 200-day) are aligned bullishly and the golden cross is confirmed — the most reliable trend signal in Turtle Trading.`
    : scores.trend >= 50
    ? `${symbol} shows a developing uptrend. Price is above the critical 200 EMA filter, though the structure needs more time to fully align.`
    : `${symbol} is in a downtrend — price is below the 200 EMA, which disqualifies it from Turtle Trading buy entries until the trend recovers.`

  const momPara = scores.momentum >= 70
    ? `Momentum is strong — RSI is in the ideal 50–70 zone with positive MACD. This is the momentum profile seen in the best breakout candidates.`
    : scores.momentum >= 50
    ? `Momentum is moderate. RSI and MACD are constructive but not yet showing decisive strength. Watch for confirmation.`
    : `Momentum is weak — RSI below 50 and MACD negative suggest insufficient buying pressure to sustain a move.`

  const volPara = scores.volume >= 70
    ? `Volume confirms the move at ${(scores.volume / 50).toFixed(1)}× the 20-day average. This is the critical Turtle requirement — institutional money is participating.`
    : `Volume is below the 1.5× threshold needed for a valid Turtle Trading signal. Low-volume breakouts frequently fail.`

  const verdict = signal === 'BUY'
    ? `VERDICT — BUY confirmed (${Math.round(confidence * 100)}% confidence, score ${ai_score}/100). Entry ₹${entry_price.toFixed(0)}, stop loss ₹${stop_loss.toFixed(0)} (−${riskPct}%). All 7 Turtle conditions satisfied. Size position to risk ≤1% of capital.`
    : signal === 'SELL'
    ? `VERDICT — SELL. A Turtle exit condition triggered. Exit at market price — the system does not predict bottoms, it follows rules.`
    : signal === 'WATCH'
    ? `VERDICT — WATCH (score ${ai_score}/100). On the radar but not all conditions met. Add to watchlist and wait for the 55-day breakout with volume.`
    : `VERDICT — No action. Score ${ai_score}/100 is below the threshold. Focus on higher-scoring setups.`

  return `${trendPara}\n\n${momPara}\n\n${volPara}\n\n${verdict}`
}

export function generateChatReply(question: string, context?: {
  symbol: string; signal: string; ai_score: number
  entry_price: number; stop_loss: number; confidence: number
}): string {
  const q = question.toLowerCase()

  if (context) {
    const { symbol, signal, ai_score, entry_price, stop_loss, confidence } = context
    const riskPct = ((entry_price - stop_loss) / entry_price * 100).toFixed(1)

    if (q.includes('buy') || q.includes('should i') || q.includes('enter')) {
      if (signal === 'BUY') return `**${symbol} — BUY signal active ✅**\n\nScore: ${ai_score}/100 | Confidence: ${Math.round(confidence * 100)}%\n\nAll 7 Turtle conditions confirmed.\n\n**Entry:** ₹${entry_price.toFixed(0)}\n**Stop Loss:** ₹${stop_loss.toFixed(0)} (−${riskPct}%)\n\nSize your position so that hitting the stop costs ≤1% of your capital.`
      if (signal === 'SELL') return `**${symbol} — Do NOT buy. 🔴**\n\nA SELL signal is active. The Turtle system says exit or stay out.`
      return `**${symbol} — Not ready yet. 🟡**\n\nCurrent signal: ${signal} | Score: ${ai_score}/100\n\nWaiting for the 55-day breakout with volume confirmation. Add to watchlist.`
    }
    if (q.includes('stop') || q.includes('risk')) {
      return `**${symbol} Stop Loss**\n\nEntry: ₹${entry_price.toFixed(0)}\nStop Loss: ₹${stop_loss.toFixed(0)}\nRisk: ₹${(entry_price - stop_loss).toFixed(0)} per share (${riskPct}%)\n\nFormula: Entry − (2 × ATR 14). The stop trails upward using the 20-day low — it only moves up, never down.`
    }
  }

  if (q.includes('turtle') || q.includes('strategy') || q.includes('how does')) {
    return `**The Turtle Trading Strategy 🐢**\n\n**Entry:** Price breaks above the 55-day high with volume > 1.5× average\n\n**Exit:** Price drops below the 20-day low\n\n**Stop Loss:** Entry − (2 × ATR 14)\n\n**Filters:**\n• Price above 200 EMA\n• 50 EMA above 200 EMA (golden cross)\n• ADX > 20 (strong trend)\n• Market trend bullish\n\n**Position sizing:** Risk exactly 1% of capital per trade. Small losses, let winners run.`
  }
  if (q.includes('position size') || q.includes('how many shares') || q.includes('quantity')) {
    return `**Position Sizing — Turtle Method**\n\nFormula:\n\`\`\`\nMax Loss = Capital × 1%\nRisk/Share = Entry − Stop Loss\nShares = Max Loss ÷ Risk/Share\n\`\`\`\n\n**Example:**\nCapital ₹5,00,000 | Entry ₹500 | Stop ₹480\nMax Loss = ₹5,000\nRisk/share = ₹20\n**Shares = 250**\n\nUse the Position Size calculator on any stock detail page.`
  }
  if (q.includes('atr')) return `**ATR (Average True Range)**\n\nMeasures how much a stock moves per day on average.\n\nStop Loss = Entry − (2 × ATR)\nThis gives the trade room to breathe without being stopped by normal volatility.\n\nHigh ATR = volatile stock = buy fewer shares\nLow ATR = stable stock = buy more shares\nPosition sizing adjusts automatically.`
  if (q.includes('adx')) return `**ADX (Average Directional Index)**\n\nMeasures trend strength (not direction).\n\n• ADX < 20: Choppy, stay out\n• ADX 20–40: Developing trend ✓\n• ADX 40–60: Strong trend — ideal\n• ADX > 60: Very strong, watch for exhaustion\n\nMarccet requires ADX > 20 before any BUY signal.`

  return `I can help with:\n\n• **Stock analysis** — ask "Should I buy RELIANCE?"\n• **Strategy** — ask "Explain the Turtle strategy"\n• **Risk** — ask "How do I size my position?"\n• **Indicators** — ask "What is ADX?" or "What is ATR?"\n\nFor a specific stock, open it from the Scanner and I'll have full context.`
}
