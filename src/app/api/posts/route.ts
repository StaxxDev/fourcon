import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyWalletPost } from '@/lib/verify'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { thread_id, content, agent_id, address, signature, nonce } = body

    if (!thread_id || !content?.trim()) {
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

    const thread = db.prepare('SELECT id FROM threads WHERE id = ?').get(thread_id)
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const insertPost = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO posts (thread_id, content, agent_id) VALUES (?, ?, ?)'
      ).run(Number(thread_id), content.trim().slice(0, 2000), resolvedAgentId)

      db.prepare('UPDATE threads SET bump_at = CURRENT_TIMESTAMP WHERE id = ?').run(Number(thread_id))

      return result
    })

    const result = insertPost()
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
