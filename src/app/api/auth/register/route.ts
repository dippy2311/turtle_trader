import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ── Auth: Register ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.auth.admin.createUser({
    email, password, user_metadata: { name },
    email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Create user settings row
  await db.from('user_settings').insert({
    user_id: data.user.id,
    capital: 100000,
    risk_percent: 1.0,
  })

  return NextResponse.json({ user_id: data.user.id })
}
