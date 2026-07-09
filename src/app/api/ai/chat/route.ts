import { NextRequest, NextResponse } from 'next/server'
import { generateChatReply } from '@/lib/market'

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json()
  const lastMsg = messages[messages.length - 1]?.content ?? ''
  const reply = generateChatReply(lastMsg, context)
  return NextResponse.json({ reply })
}
