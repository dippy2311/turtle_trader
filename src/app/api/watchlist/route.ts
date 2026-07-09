import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ data: [] })
  const db = supabaseAdmin()
  const { data } = await db.from('watchlists').select('*, watchlist_items(count)').eq('user_id', userId)
  return NextResponse.json({ data: (data ?? []).map((w: any) => ({ ...w, count: w.watchlist_items?.[0]?.count ?? 0 })) })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.from('watchlists').insert({ user_id: userId, name }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
