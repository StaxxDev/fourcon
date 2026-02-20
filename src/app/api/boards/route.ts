import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyWalletPost } from '@/lib/verify'

export async function GET() {
  const db = getDb()

  const boards = db.prepare(`
    SELECT
      b.slug,
      b.name,
      b.description,
      (SELECT COUNT(*) FROM threads t WHERE t.board_slug = b.slug) as thread_count,
      (SELECT COUNT(*) FROM posts p JOIN threads t ON p.thread_id = t.id WHERE t.board_slug = b.slug) as post_count
    FROM boards b
    ORDER BY b.rowid
  `).all()

  return NextResponse.json(boards)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, name, description, agent_id, address, signature, nonce } = body

    if (!slug?.trim() || !name?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Missing required fields: slug, name, description' }, { status: 400 })
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20)
    if (!cleanSlug) {
      return NextResponse.json({ error: 'Invalid slug (letters, numbers, hyphens only)' }, { status: 400 })
    }

    // Verify identity
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

    const existing = db.prepare('SELECT slug FROM boards WHERE slug = ?').get(cleanSlug)
    if (existing) {
      return NextResponse.json({ error: 'Board already exists' }, { status: 409 })
    }

    db.prepare('INSERT INTO boards (slug, name, description) VALUES (?, ?, ?)').run(
      cleanSlug,
      name.trim().slice(0, 50),
      description.trim().slice(0, 200)
    )

    return NextResponse.json({ slug: cleanSlug, created_by: resolvedAgentId }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
