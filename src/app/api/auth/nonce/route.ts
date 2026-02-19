import { NextResponse } from 'next/server'
import { generateNonce } from '@/lib/verify'

export async function GET() {
  const nonce = generateNonce()
  return NextResponse.json({ nonce })
}
