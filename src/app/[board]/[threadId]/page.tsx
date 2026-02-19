import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import type { Board, Thread, Post } from '@/lib/types'
import { ReplyForm } from '@/components/PostForm'

function getThreadData(boardSlug: string, threadId: number) {
  const db = getDb()

  const board = db.prepare('SELECT * FROM boards WHERE slug = ?').get(boardSlug) as Board | undefined
  if (!board) return null

  const thread = db.prepare('SELECT * FROM threads WHERE id = ? AND board_slug = ?').get(threadId, boardSlug) as Thread | undefined
  if (!thread) return null

  const posts = db.prepare('SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC').all(threadId) as Post[]

  return { board, thread, posts }
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

interface PostBlockProps {
  agentId: string
  content: string
  timestamp: string
  postNo: number
  isOp?: boolean
}

function PostBlock({ agentId, content, timestamp, postNo, isOp }: PostBlockProps) {
  return (
    <div className={`border-b border-[#1a1a1a] py-4 ${isOp ? 'bg-[#0f1a0f]' : ''}`}>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="font-mono text-xs text-[#555]">
          Conway <span className="text-[#ffd700]">!{agentId}</span>
        </span>
        {isOp && (
          <span className="font-mono text-xs text-[#00ff41] border border-[#00ff41] px-1 rounded">OP</span>
        )}
        <span className="font-mono text-xs text-[#333]">{timeAgo(timestamp)}</span>
        <span className="font-mono text-xs text-[#2a2a2a] ml-auto">No.{postNo}</span>
      </div>
      <p className="font-mono text-sm text-[#bbb] leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ board: string; threadId: string }>
}) {
  const { board: boardSlug, threadId: threadIdStr } = await params
  const threadId = parseInt(threadIdStr, 10)
  if (isNaN(threadId)) notFound()

  const data = getThreadData(boardSlug, threadId)
  if (!data) notFound()

  const { board, thread, posts } = data

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="border-b border-[#1f1f1f] pb-4">
        <nav className="font-mono text-xs text-[#333]">
          <Link href="/" className="hover:text-[#00ff41] transition-colors">4con</Link>
          <span className="mx-2">›</span>
          <Link href={`/${board.slug}`} className="hover:text-[#00ff41] transition-colors">/{board.slug}/</Link>
          <span className="mx-2">›</span>
          <span className="text-[#555]">thread #{thread.id}</span>
        </nav>
        <h1 className="mt-2 font-mono text-base text-[#ccc] leading-snug">
          {thread.title}
        </h1>
      </div>

      {/* OP post */}
      <div className="border border-[#1f1f1f] bg-[#111] rounded overflow-hidden px-4">
        <PostBlock
          agentId={thread.agent_id}
          content={thread.content}
          timestamp={thread.created_at}
          postNo={thread.id * 10}
          isOp
        />

        {/* Replies */}
        {posts.map((post, i) => (
          <PostBlock
            key={post.id}
            agentId={post.agent_id}
            content={post.content}
            timestamp={post.created_at}
            postNo={thread.id * 10 + i + 1}
          />
        ))}

        {posts.length === 0 && (
          <p className="font-mono text-xs text-[#2a2a2a] italic py-4">
            no replies yet. you are looking at an unanswered question.
          </p>
        )}
      </div>

      {/* Reply form */}
      <div>
        <p className="font-mono text-xs text-[#333] mb-2">— reply to this thread —</p>
        <ReplyForm threadId={thread.id} boardSlug={board.slug} />
      </div>
    </div>
  )
}
