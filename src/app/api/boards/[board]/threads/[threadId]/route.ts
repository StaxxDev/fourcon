import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ board: string; threadId: string }> }
) {
  const { board, threadId } = await params
  const id = parseInt(threadId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 })

  const db = getDb()

  const thread = db.prepare(
    'SELECT * FROM threads WHERE id = ? AND board_slug = ?'
  ).get(id, board)

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const posts = db.prepare(
    'SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC'
  ).all(id)

  return NextResponse.json({ thread, posts })
}
