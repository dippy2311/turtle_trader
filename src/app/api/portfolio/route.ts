import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchOHLCV } from '@/lib/market'
import { STOCK_UNIVERSE } from '@/lib/stocks'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  const { data: positions } = await db
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'OPEN')

  if (!positions?.length) return NextResponse.json({ positions: [], summary: { total_pnl: 0, portfolio_value: 0, cash_balance: 0, open_positions: 0 } })

  // Refresh prices
  const enriched = await Promise.all(positions.map(async pos => {
    try {
      const stock = STOCK_UNIVERSE.find(s => s.nse === pos.symbol)
      const bars = await fetchOHLCV(stock?.symbol ?? `${pos.symbol}.NS`, 5)
      const currentPrice = bars[bars.length - 1]?.close ?? pos.avg_price
      const pnl = (currentPrice - pos.avg_price) * pos.quantity
      const pnlPct = (currentPrice - pos.avg_price) / pos.avg_price * 100
      const holdingDays = Math.floor((Date.now() - new Date(pos.entry_date).getTime()) / 86400000)
      return { ...pos, current_price: currentPrice, pnl, pnl_pct: pnlPct, holding_days: holdingDays }
    } catch { return { ...pos, current_price: pos.avg_price, pnl: 0, pnl_pct: 0, holding_days: 0 } }
  }))

  const { data: settings } = await db.from('user_settings').select('capital').eq('user_id', userId).single()
  const totalDeployed = enriched.reduce((a, p) => a + p.avg_price * p.quantity, 0)
  const totalPnl = enriched.reduce((a, p) => a + p.pnl, 0)
  const capital = settings?.capital ?? 100000

  return NextResponse.json({
    positions: enriched,
    summary: {
      total_pnl: totalPnl,
      portfolio_value: capital + totalPnl,
      cash_balance: capital - totalDeployed,
      total_deployed: totalDeployed,
      open_positions: enriched.length,
      capital,
    },
  })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()

  const { data, error } = await db.from('positions').insert({
    user_id: userId,
    symbol: body.symbol,
    company: body.company,
    quantity: body.quantity,
    avg_price: body.entry_price,
    stop_loss: body.stop_loss,
    entry_date: new Date().toISOString().slice(0, 10),
    status: 'OPEN',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ position: data })
}
