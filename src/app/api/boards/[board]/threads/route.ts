import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ board: string }> }
) {
  const { board } = await params
  const db = getDb()

  const boardRow = db.prepare('SELECT slug, name, description FROM boards WHERE slug = ?').get(board)
  if (!boardRow) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

  const threads = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.content,
      t.agent_id,
      t.created_at,
      t.bump_at,
      (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) as reply_count
    FROM threads t
    WHERE t.board_slug = ?
    ORDER BY t.bump_at DESC
    LIMIT 100
  `).all(board)

  return NextResponse.json({ board: boardRow, threads })
}
