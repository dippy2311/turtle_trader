import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = supabaseAdmin()
  await db.from('user_settings').upsert({ user_id: userId, ...body }, { onConflict: 'user_id' })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ capital: 100000, risk_percent: 1 })
  const db = supabaseAdmin()
  const { data } = await db.from('user_settings').select('*').eq('user_id', userId).single()
  return NextResponse.json(data ?? { capital: 100000, risk_percent: 1 })
}
