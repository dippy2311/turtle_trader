import type { ScanSignal, MarketTrend } from '@/types'

// ── Pure math helpers ─────────────────────────────────────────────────────────

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
  // EMA of TR
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
  const k = 2 / (period + 1)
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

// ── Main signal evaluator ─────────────────────────────────────────────────────

export interface OHLCV {
  open: number; high: number; low: number; close: number; volume: number; date: string
}

export interface SignalResult {
  signal: 'BUY' | 'SELL' | 'WATCH' | 'HOLD'
  ai_score: number
  confidence: number
  entry_price: number
  stop_loss: number
  atr_val: number
  breakout_level: number
  reasons: string[]
  scores: { trend: number; momentum: number; volume: number; sector: number; risk: number; market: number }
}

export function evaluate(
  bars: OHLCV[],
  marketTrend: MarketTrend = 'BULLISH',
  sectorStrength = 50,
  hasPosition = false,
): SignalResult {
  if (bars.length < 210) {
    return insufficientData(bars)
  }

  const closes  = bars.map(b => b.close)
  const highs   = bars.map(b => b.high)
  const lows    = bars.map(b => b.low)
  const volumes = bars.map(b => b.volume)
  const n = bars.length

  // Indicators
  const ema20  = ema(closes, 20)
  const ema50  = ema(closes, 50)
  const ema200 = ema(closes, 200)
  const atrArr = atr(highs, lows, closes, 14)
  const rsiArr = rsi(closes, 14)
  const adxVal = adx(highs, lows, closes, 14)

  const high55Prev = rollingMax(highs.slice(0, -1).concat(highs.slice(-2, -1)), 55)
  const low20Prev  = rollingMin(lows.slice(0, -1).concat(lows.slice(-2, -1)), 20)
  const avg20Vol   = volumes.map((_, i) => i < 20 ? NaN : volumes.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20)

  const last = n - 1
  const close    = closes[last]
  const e20      = ema20[last]
  const e50      = ema50[last]
  const e200     = ema200[last]
  const atrVal   = atrArr[last]
  const rsiVal   = rsiArr[last]
  const volRatio = volumes[last] / (avg20Vol[last] || 1)
  const h55      = high55Prev[last] || highs.slice(-56, -1).reduce((a, b) => Math.max(a, b), 0)
  const l20      = low20Prev[last]  || lows.slice(-21, -1).reduce((a, b) => Math.min(a, b), Infinity)

  // ── Turtle BUY conditions ────────────────────────────────────────────────
  const c1 = close > e200
  const c2 = e50 > e200
  const c3 = close >= h55
  const c4 = volRatio >= 1.5
  const c5 = adxVal >= 20
  const c6 = marketTrend === 'BULLISH'
  const c7 = !hasPosition

  // ── Turtle SELL conditions ───────────────────────────────────────────────
  const sell1 = close <= l20
  const sell2 = e50 < e200 && close < e200

  const reasons: string[] = []
  if (c1) reasons.push(`Price ₹${close.toFixed(0)} above 200 EMA ₹${e200.toFixed(0)}`)
  else reasons.push(`Price below 200 EMA — bearish filter active`)
  if (c2) reasons.push(`Golden cross: 50 EMA above 200 EMA`)
  else reasons.push(`No golden cross — 50 EMA below 200 EMA`)
  if (c3) reasons.push(`55-day breakout confirmed at ₹${h55.toFixed(0)}`)
  else reasons.push(`No breakout yet — need close above ₹${h55.toFixed(0)}`)
  if (c4) reasons.push(`Volume ${volRatio.toFixed(1)}× avg — institutional buying`)
  else reasons.push(`Volume only ${volRatio.toFixed(1)}× avg — need ≥1.5×`)
  if (c5) reasons.push(`ADX ${adxVal.toFixed(0)} — strong trend confirmed`)
  else reasons.push(`ADX ${adxVal.toFixed(0)} — trend too weak (need ≥20)`)
  if (!c6) reasons.push(`Market trend ${marketTrend} — not supportive`)
  if (hasPosition) reasons.push(`Already in position — no new entry`)

  // ── Scores (0–100) ───────────────────────────────────────────────────────
  let trendScore = 0
  if (close > e20)  trendScore += 20
  if (close > e50)  trendScore += 20
  if (close > e200) trendScore += 30
  if (e50 > e200)   trendScore += 20
  if (e20 > e50)    trendScore += 10

  let momScore = 50
  if (rsiVal >= 50 && rsiVal <= 70) momScore = 80
  else if (rsiVal > 70) momScore = 65
  else if (rsiVal < 30) momScore = 20

  const volScore = volRatio >= 3 ? 100 : volRatio >= 2 ? 85 : volRatio >= 1.5 ? 70 : volRatio >= 1 ? 50 : 30
  const sectorScore = Math.min(100, Math.max(0, sectorStrength))
  const atrPct = (atrVal / close) * 100
  const riskScore = Math.min(100, Math.max(0, 100 - (atrPct - 1) * 17.5))
  const marketScore = marketTrend === 'BULLISH' ? 100 : marketTrend === 'SIDEWAYS' ? 50 : 20

  const aiScore = trendScore * 0.30 + momScore * 0.20 + volScore * 0.20 +
    sectorScore * 0.10 + riskScore * 0.10 + marketScore * 0.10

  const buyCount = [c1, c2, c3, c4, c5, c6, c7].filter(Boolean).length
  const stopLoss = close - 2 * atrVal

  let signal: 'BUY' | 'SELL' | 'WATCH' | 'HOLD'
  let confidence: number

  if (buyCount === 7) {
    signal = 'BUY'; confidence = Math.min(0.99, aiScore / 100)
  } else if (sell1 || sell2) {
    signal = 'SELL'; confidence = sell1 ? 0.9 : 0.75
    if (sell1) reasons.push(`20-day low ₹${l20.toFixed(0)} broken — Turtle exit`)
    if (sell2) reasons.push(`Trend reversal — 50 EMA crossed below 200 EMA`)
  } else if (buyCount >= 5) {
    signal = 'WATCH'; confidence = 0.55
    reasons.push(`${buyCount}/7 conditions met — watching for breakout`)
  } else {
    signal = 'HOLD'; confidence = 0.35
    reasons.push(`Only ${buyCount}/7 conditions met — no action`)
  }

  return {
    signal, ai_score: Math.round(aiScore * 10) / 10, confidence,
    entry_price: close, stop_loss: stopLoss, atr_val: atrVal, breakout_level: h55,
    reasons,
    scores: {
      trend: Math.round(trendScore), momentum: Math.round(momScore),
      volume: Math.round(volScore), sector: Math.round(sectorScore),
      risk: Math.round(riskScore), market: Math.round(marketScore),
    },
  }
}

function insufficientData(bars: OHLCV[]): SignalResult {
  const last = bars[bars.length - 1]?.close ?? 0
  return {
    signal: 'WATCH', ai_score: 0, confidence: 0,
    entry_price: last, stop_loss: 0, atr_val: 0, breakout_level: 0,
    reasons: ['Insufficient historical data (need 210+ days)'],
    scores: { trend: 0, momentum: 0, volume: 0, sector: 0, risk: 0, market: 0 },
  }
}
