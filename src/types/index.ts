export type SignalType = 'BUY' | 'STRONG BUY' | 'SELL' | 'WATCH' | 'HOLD'
export type MarketTrend = 'BULLISH' | 'BEARISH' | 'SIDEWAYS'

export interface ScanSignal {
  symbol: string
  company: string
  sector: string
  signal: SignalType
  ai_score: number
  confidence: number
  entry_price: number
  stop_loss: number
  atr: number
  reasons: string[]
  scores: {
    trend: number
    momentum: number
    volume: number
    sector: number
    risk: number
    market: number
  }
}

export interface OHLCVBar {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Position {
  id: string
  user_id: string
  symbol: string
  company: string
  quantity: number
  avg_price: number
  current_price: number
  stop_loss: number
  entry_date: string
  pnl: number
  pnl_pct: number
  holding_days: number
}

export interface WatchlistItem {
  id: string
  symbol: string
  company: string
  sector: string
  current_price: number
  change_pct: number
}

export interface MarketStatus {
  is_open: boolean
  nifty_close: number
  nifty_change: number
  nifty_change_pct: number
  trend: MarketTrend
  mood_score: number
}

export interface ScanResult {
  scan_date: string
  market_trend: MarketTrend
  total_scanned: number
  signals: ScanSignal[]
  counts: { BUY: number; 'STRONG BUY': number; SELL: number; WATCH: number; HOLD: number }
}

export interface PositionSizeResult {
  shares: number
  capital_required: number
  max_loss: number
  risk_per_share: number
  capital_utilization_pct: number
}
