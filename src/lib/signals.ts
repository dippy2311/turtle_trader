import type { MarketTrend } from '@/types'

// ── Interfaces (unchanged — do not modify) ────────────────────────────────────

export interface OHLCV {
  open: number; high: number; low: number; close: number; volume: number; date: string
}

export interface SignalResult {
  signal: 'BUY' | 'STRONG BUY' | 'SELL' | 'WATCH' | 'HOLD'
  ai_score: number
  confidence: number
  entry_price: number
  stop_loss: number
  atr_val: number
  breakout_level: number
  reasons: string[]
  scores: {
    trend: number
    momentum: number
    volume: number
    sector: number
    risk: number
    market: number
  }
  target1?: number
  target2?: number
}

// ── Pure math helpers (unchanged) ─────────────────────────────────────────────

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(...new Array(period - 1).fill(NaN), prev)
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

function atr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const tr: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < highs.length; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ))
  }
  const k = 2 / (period + 1)
  const result: number[] = new Array(period - 1).fill(NaN)
  let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(prev)
  for (let i = period; i < tr.length; i++) {
    prev = tr[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(period).fill(NaN)
  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? -diff : 0)
  }
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(100 - 100 / (1 + avgGain / (avgLoss || 0.001)))
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    result.push(100 - 100 / (1 + avgGain / (avgLoss || 0.001)))
  }
  return result
}

function adx(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < period * 2) return 15
  const n = closes.length
  const plusDM: number[] = [0]
  const minusDM: number[] = [0]
  for (let i = 1; i < n; i++) {
    const up = highs[i] - highs[i - 1]
    const down = lows[i - 1] - lows[i]
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
  }
  const atrVals = atr(highs, lows, closes, period)
  let smPlusDM = plusDM.slice(1, period + 1).reduce((a, b) => a + b, 0)
  let smMinusDM = minusDM.slice(1, period + 1).reduce((a, b) => a + b, 0)
  let smATR = atrVals.slice(0, period).filter(v => !isNaN(v)).reduce((a, b) => a + b, 0)
  const dxArr: number[] = []
  for (let i = period; i < n; i++) {
    smPlusDM = smPlusDM - smPlusDM / period + plusDM[i]
    smMinusDM = smMinusDM - smMinusDM / period + minusDM[i]
    smATR = smATR - smATR / period + (atrVals[i] || 0)
    const plusDI = smATR ? 100 * smPlusDM / smATR : 0
    const minusDI = smATR ? 100 * smMinusDM / smATR : 0
    const dx = plusDI + minusDI ? 100 * Math.abs(plusDI - minusDI) / (plusDI + minusDI) : 0
    dxArr.push(dx)
  }
  return dxArr.slice(-period).reduce((a, b) => a + b, 0) / period
}

function rollingMax(arr: number[], period: number): number[] {
  return arr.map((_, i) => i < period - 1 ? NaN : Math.max(...arr.slice(i - period + 1, i + 1)))
}

function rollingMin(arr: number[], period: number): number[] {
  return arr.map((_, i) => i < period - 1 ? NaN : Math.min(...arr.slice(i - period + 1, i + 1)))
}

// ── Main evaluate function (same signature, improved internals) ───────────────

export function evaluate(
  bars: OHLCV[],
  marketTrend: MarketTrend = 'BULLISH',
  sectorStrength = 50,
  hasPosition = false,
): SignalResult {
  if (bars.length < 210) return _insufficientData(bars)

  const closes  = bars.map(b => b.close)
  const highs   = bars.map(b => b.high)
  const lows    = bars.map(b => b.low)
  const volumes = bars.map(b => b.volume)
  const n = bars.length

  // ── Indicators ──────────────────────────────────────────────────────────────
  const ema20  = ema(closes, 20)
  const ema50  = ema(closes, 50)
  const ema200 = ema(closes, 200)
  const atrArr = atr(highs, lows, closes, 14)
  const adxVal = adx(highs, lows, closes, 14)
  const rsiArr = rsi(closes, 14)

  const last = n - 1
  const close   = closes[last]
  const e20     = ema20[last]
  const e50     = ema50[last]
  const e200    = ema200[last]
  const atrVal  = atrArr[last]
  const rsiVal  = rsiArr[last]

  // Volume ratio vs 20-day average
  const avg20Vol = volumes.slice(last - 19, last + 1).reduce((a, b) => a + b, 0) / 20
  const volRatio = avg20Vol > 0 ? volumes[last] / avg20Vol : 1

  // Breakout levels (using prior bars to avoid lookahead)
  const high55 = Math.max(...highs.slice(Math.max(0, last - 56), last))
  const low20  = Math.min(...lows.slice(Math.max(0, last - 21), last))

  // Swing low = lowest low of last 10 bars (for stop loss)
  const swingLow = Math.min(...lows.slice(Math.max(0, last - 10), last + 1))

  // ── SELL conditions (unchanged from original) ────────────────────────────────
  const sell1 = close <= low20
  const sell2 = e50 < e200 && close < e200

  if (sell1 || sell2) {
    const sellReasons: string[] = []
    if (sell1) sellReasons.push(`20-day low ₹${low20.toFixed(2)} broken — exit triggered`)
    if (sell2) sellReasons.push(`Trend reversal — 50 EMA crossed below 200 EMA`)
    return {
      signal: 'SELL',
      ai_score: 0,
      confidence: sell1 ? 0.90 : 0.75,
      entry_price: close,
      stop_loss: close - 2 * atrVal,
      atr_val: atrVal,
      breakout_level: high55,
      reasons: sellReasons,
      scores: { trend: 0, momentum: 0, volume: 0, sector: 0, risk: 0, market: 0 },
    }
  }

  // ── Seven original Turtle conditions (for condition count) ────────────────────
  const c1 = close > e200                          // price above 200 EMA
  const c2 = e50 > e200                            // golden cross
  const c3 = close >= high55                       // 55-day breakout
  const c4 = volRatio >= 1.5                       // volume surge
  const c5 = adxVal >= 20                          // strong trend
  const c6 = marketTrend === 'BULLISH'             // market bullish
  const c7 = !hasPosition                          // no existing position
  const turtleCount = [c1, c2, c3, c4, c5, c6, c7].filter(Boolean).length

  // ── TREND SCORE (30%) ─────────────────────────────────────────────────────────
  let trendScore = 0

  // Above 200 EMA
  if (c1) trendScore += 35
  else trendScore += Math.max(0, 35 * (1 - (e200 - close) / e200 / 0.05)) // partial if close

  // 50 EMA above 200 EMA (golden cross)
  if (c2) trendScore += 30
  else trendScore += Math.max(0, 30 * (1 - (e200 - e50) / e200 / 0.03))

  // Price above 20 EMA
  if (close > e20) trendScore += 20
  else trendScore += Math.max(0, 20 * (1 - (e20 - close) / e20 / 0.02))

  // ADX contribution
  if (adxVal >= 30) trendScore += 15
  else if (adxVal >= 20) trendScore += 10
  else if (adxVal >= 15) trendScore += 5

  trendScore = Math.min(100, trendScore)

  // ── MOMENTUM SCORE (20%) ──────────────────────────────────────────────────────
  let momentumScore = 0
  const nearBreakout = close >= high55 * 0.98     // within 2% of 55-day high
  const successfulRetest = close > high55 * 0.97 && close < high55 * 1.05 && rsiVal < 65

  if (c3) {
    // Full breakout
    momentumScore = 100
  } else if (nearBreakout) {
    // Within 2% of breakout
    const proximity = (close - high55 * 0.98) / (high55 * 0.02)
    momentumScore = 70 + proximity * 25
  } else if (successfulRetest) {
    // Successful retest after prior breakout
    momentumScore = 75
  } else {
    // Score based on distance from breakout
    const distPct = (high55 - close) / high55
    momentumScore = Math.max(0, 60 - distPct * 200)
  }

  // RSI contribution to momentum
  if (rsiVal >= 50 && rsiVal <= 70) momentumScore = Math.min(100, momentumScore + 10)
  else if (rsiVal > 70) momentumScore = Math.min(100, momentumScore + 5)   // slightly overbought — trim
  else if (rsiVal < 40) momentumScore = Math.max(0, momentumScore - 15)

  momentumScore = Math.min(100, Math.max(0, momentumScore))

  // ── VOLUME SCORE (20%) ────────────────────────────────────────────────────────
  let volumeScore: number
  if (volRatio >= 2.0)      volumeScore = 100
  else if (volRatio >= 1.5) volumeScore = 80
  else if (volRatio >= 1.2) volumeScore = 65
  else if (volRatio >= 1.0) volumeScore = 50
  else                      volumeScore = 20

  // ── SECTOR SCORE (10%) ────────────────────────────────────────────────────────
  const sectorScore = Math.min(100, Math.max(0, sectorStrength))

  // ── RISK SCORE (10%) — lower ATR% = better ───────────────────────────────────
  const atrPct = close > 0 ? (atrVal / close) * 100 : 5
  // 1% ATR = 95, 2% = 80, 3% = 60, 5% = 20
  const riskScore = Math.min(100, Math.max(0, 100 - (atrPct - 1) * 20))

  // ── MARKET SCORE (10%) ────────────────────────────────────────────────────────
  const marketScore = marketTrend === 'BULLISH' ? 100 : marketTrend === 'SIDEWAYS' ? 75 : 40

  // ── WEIGHTED AI SCORE ─────────────────────────────────────────────────────────
  const aiScore = Math.round(
    trendScore    * 0.30 +
    momentumScore * 0.20 +
    volumeScore   * 0.20 +
    sectorScore   * 0.10 +
    riskScore     * 0.10 +
    marketScore   * 0.10
  )

  // ── SIGNAL DECISION ───────────────────────────────────────────────────────────
  let signal: SignalResult['signal']
  if (aiScore >= 94 && turtleCount >= 6) {
    signal = 'STRONG BUY'
  } else if (aiScore >= 88 && turtleCount >= 4) {
    signal = 'BUY'
  } else if (aiScore >= 75) {
    signal = 'WATCH'
  } else {
    signal = 'HOLD'
  }

  // ── CONFIDENCE ────────────────────────────────────────────────────────────────
  let confidence: number
  if (aiScore >= 95)      confidence = 0.95
  else if (aiScore >= 90) confidence = 0.90
  else if (aiScore >= 85) confidence = 0.85
  else if (aiScore >= 80) confidence = 0.80
  else                    confidence = 0.70

  // ── ENTRY PRICE — breakout or pullback, better reward/risk ───────────────────
  const pullbackZone = e20   // 20 EMA as pullback support
  const distToBreakout = Math.abs(close - high55) / high55
  // Use breakout level if already breaking out, else pullback zone
  const entryPrice = distToBreakout <= 0.02 ? close : Math.min(close, pullbackZone)

  // ── STOP LOSS — max of swing low and close - 2×ATR ───────────────────────────
  const atrStop   = close - 2 * atrVal
  const stopLoss  = Math.max(swingLow, atrStop)

  // ── TARGETS ──────────────────────────────────────────────────────────────────
  // Target 1: nearest resistance = 55-day high (if not broken) or +1.5×ATR
  const target1 = close < high55 ? high55 : close + 1.5 * atrVal
  // Target 2: minimum 1:2 risk/reward from entry
  const riskAmount = entryPrice - stopLoss
  const target2 = entryPrice + riskAmount * 2

  // ── REASONS ──────────────────────────────────────────────────────────────────
  const reasons: string[] = []

  if (c1) reasons.push(`Price ₹${close.toFixed(2)} above 200 EMA ₹${e200.toFixed(2)}`)
  else    reasons.push(`Price ₹${close.toFixed(2)} below 200 EMA — trend caution`)

  if (c2) reasons.push(`Golden cross — 50 EMA ₹${e50.toFixed(2)} above 200 EMA`)
  else    reasons.push(`No golden cross yet`)

  if (c3)              reasons.push(`55-day breakout confirmed at ₹${high55.toFixed(2)}`)
  else if (nearBreakout) reasons.push(`Within 2% of 55-day breakout ₹${high55.toFixed(2)}`)
  else if (successfulRetest) reasons.push(`Successful retest of breakout zone ₹${high55.toFixed(2)}`)
  else                 reasons.push(`No breakout yet — need close above ₹${high55.toFixed(2)}`)

  if (volRatio >= 2.0)      reasons.push(`Volume ${volRatio.toFixed(1)}× average — strong institutional interest`)
  else if (volRatio >= 1.5) reasons.push(`Volume ${volRatio.toFixed(1)}× average — above threshold`)
  else if (volRatio >= 1.2) reasons.push(`Volume ${volRatio.toFixed(1)}× average — moderate`)
  else                      reasons.push(`Volume ${volRatio.toFixed(1)}× average — weak`)

  if (adxVal >= 30) reasons.push(`ADX ${adxVal.toFixed(0)} — strong trend momentum`)
  else if (adxVal >= 20) reasons.push(`ADX ${adxVal.toFixed(0)} — developing trend`)
  else              reasons.push(`ADX ${adxVal.toFixed(0)} — trend weak`)

  if (atrPct < 2)   reasons.push(`ATR ${atrPct.toFixed(1)}% — healthy volatility, controlled risk`)
  else if (atrPct < 3) reasons.push(`ATR ${atrPct.toFixed(1)}% — moderate volatility`)
  else              reasons.push(`ATR ${atrPct.toFixed(1)}% — high volatility, size position carefully`)

  if (sectorScore >= 70) reasons.push(`Sector outperforming — tailwind for the trade`)
  else if (sectorScore >= 50) reasons.push(`Sector neutral`)
  else              reasons.push(`Sector underperforming — headwind`)

  if (riskAmount > 0) {
    const rr = (target2 - entryPrice) / riskAmount
    reasons.push(`Risk/Reward ${rr.toFixed(1)}:1 — Target ₹${target2.toFixed(2)}, Stop ₹${stopLoss.toFixed(2)}`)
  }

  return {
    signal,
    ai_score:       aiScore,
    confidence,
    entry_price:    Number(entryPrice.toFixed(2)),
    stop_loss:      Number(stopLoss.toFixed(2)),
    atr_val:        Number(atrVal.toFixed(4)),
    breakout_level: Number(high55.toFixed(2)),
    target1:        Number(target1.toFixed(2)),
    target2:        Number(target2.toFixed(2)),
    reasons,
    scores: {
      trend:    Math.round(trendScore),
      momentum: Math.round(momentumScore),
      volume:   Math.round(volumeScore),
      sector:   Math.round(sectorScore),
      risk:     Math.round(riskScore),
      market:   Math.round(marketScore),
    },
  }
}

// ── Fallback for insufficient data (unchanged interface) ──────────────────────
function _insufficientData(bars: OHLCV[]): SignalResult {
  const last = bars[bars.length - 1]?.close ?? 0
  return {
    signal: 'WATCH',
    ai_score: 0,
    confidence: 0,
    entry_price: last,
    stop_loss: 0,
    atr_val: 0,
    breakout_level: 0,
    reasons: ['Insufficient historical data (need 210+ days)'],
    scores: { trend: 0, momentum: 0, volume: 0, sector: 0, risk: 0, market: 0 },
  }
}
