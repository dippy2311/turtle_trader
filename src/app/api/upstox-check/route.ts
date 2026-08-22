import { NextResponse } from 'next/server'
import { getInstrumentKey, fetchUpstoxOHLCV } from '@/lib/upstox'

export const maxDuration = 30

// Visit /api/upstox-check to verify Upstox is working correctly
export async function GET() {
  const tokenSet = !!process.env.UPSTOX_ACCESS_TOKEN
  const tokenPreview = process.env.UPSTOX_ACCESS_TOKEN
    ? `${process.env.UPSTOX_ACCESS_TOKEN.slice(0, 8)}...${process.env.UPSTOX_ACCESS_TOKEN.slice(-4)}`
    : null

  if (!tokenSet) {
    return NextResponse.json({
      status: 'error',
      step: 'env_check',
      message: 'UPSTOX_ACCESS_TOKEN is not set in environment variables. Add it in Vercel Settings → Environment Variables and redeploy.',
      token_set: false,
    }, { status: 500 })
  }

  try {
    // Step 1 — test instrument lookup (this downloads/decompresses the master file)
    const instrumentKey = await getInstrumentKey('RELIANCE')

    // Step 2 — test actual historical data fetch
    const bars = await fetchUpstoxOHLCV('RELIANCE', 10)

    return NextResponse.json({
      status: 'success',
      message: '✅ Upstox is working correctly',
      token_set: true,
      token_preview: tokenPreview,
      instrument_key_found: instrumentKey,
      bars_fetched: bars.length,
      latest_bar: bars[bars.length - 1] ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      step: 'fetch_test',
      message: e.message,
      token_set: true,
      token_preview: tokenPreview,
    }, { status: 500 })
  }
}
