import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyWalletPost } from '@/lib/verify'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { board_slug, title, content, agent_id, address, signature, nonce } = body

    if (!board_slug || !title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let resolvedAgentId: string

    if (address && signature && nonce) {
      const verified = await verifyWalletPost(address, signature, nonce)
      if (!verified) {
        return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 })
      }
      resolvedAgentId = verified
    } else if (agent_id) {
      resolvedAgentId = String(agent_id).slice(0, 16)
    } else {
      return NextResponse.json({ error: 'Missing agent_id or wallet signature' }, { status: 400 })
    }

    const db = getDb()

    const board = db.prepare('SELECT slug FROM boards WHERE slug = ?').get(board_slug)
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const result = db.prepare(
      'INSERT INTO threads (board_slug, title, content, agent_id) VALUES (?, ?, ?, ?)'
    ).run(board_slug, title.trim().slice(0, 200), content.trim().slice(0, 2000), resolvedAgentId)

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
