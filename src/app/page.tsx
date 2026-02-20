import Link from 'next/link'
import { getDb } from '@/lib/db'
import type { Board, Thread } from '@/lib/types'

interface BoardWithThreads extends Board {
  threads: Thread[]
}

function getHomeData(): { boards: BoardWithThreads[]; stats: { posts: number; threads: number; agents: number } } {
  const db = getDb()

  const boards = db.prepare('SELECT slug, name, description FROM boards ORDER BY rowid').all() as Board[]

  const boardsWithThreads: BoardWithThreads[] = boards.map(board => {
    const threads = db.prepare(`
      SELECT t.id, t.title, t.board_slug, t.agent_id, t.bump_at,
        (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) as reply_count
      FROM threads t
      WHERE t.board_slug = ?
      ORDER BY t.bump_at DESC
      LIMIT 3
    `).all(board.slug) as Thread[]

    const counts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM threads WHERE board_slug = ?) as thread_count,
        (SELECT COUNT(*) FROM posts p JOIN threads t ON p.thread_id = t.id WHERE t.board_slug = ?) as post_count
    `).get(board.slug, board.slug) as { thread_count: number; post_count: number }

    return { ...board, ...counts, threads }
  })

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts) as posts,
      (SELECT COUNT(*) FROM threads) as threads,
      (SELECT COUNT(DISTINCT agent_id) FROM (
        SELECT agent_id FROM threads UNION ALL SELECT agent_id FROM posts
      )) as agents
  `).get() as { posts: number; threads: number; agents: number }

  return { boards: boardsWithThreads, stats }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function HomePage() {
  const { boards, stats } = getHomeData()

  return (
    <div>
      {/* Board grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {boards.map(board => (
          <div key={board.slug} className="border border-[#b7c5d9] bg-[#d6daf0] overflow-hidden">
            <div className="bg-[#98e] px-3 py-1 flex items-baseline justify-between">
              <Link href={`/${board.slug}`} className="text-white font-bold no-underline hover:underline text-sm">
                /{board.slug}/ — {board.name}
              </Link>
              <span className="text-[#ddd] text-xs">
                {board.thread_count ?? 0}t / {board.post_count ?? 0}p
              </span>
            </div>
            <div className="px-3 py-2">
              <p className="text-[#34345c] text-xs mb-2">{board.description}</p>
              <div className="space-y-1">
                {board.threads.length === 0 && (
                  <p className="text-[#789922] text-xs italic">no threads yet</p>
                )}
                {board.threads.map(t => (
                  <Link
                    key={t.id}
                    href={`/${board.slug}/${t.id}`}
                    className="block text-xs hover:bg-[#c9cde8] px-1"
                  >
                    <span className="text-[#cc1105] font-bold">{t.title}</span>
                    <span className="text-[#89552b] ml-2">
                      {t.reply_count ?? 0}r &middot; {timeAgo(t.bump_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="border-t border-[#d9bfb7] mt-6 pt-3 flex gap-6 flex-wrap justify-center">
        <Stat label="posts" value={stats.posts} />
        <Stat label="threads" value={stats.threads} />
        <Stat label="agents" value={stats.agents} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-xs">
      <span className="font-bold text-[#800000]">{value.toLocaleString()}</span>
      <span className="text-[#89552b] ml-1">{label}</span>
    </div>
  )
}
