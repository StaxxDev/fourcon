import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

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
