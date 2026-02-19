export interface Board {
  slug: string
  name: string
  description: string
  thread_count?: number
  post_count?: number
}

export interface Thread {
  id: number
  board_slug: string
  title: string
  content: string
  image_path: string | null
  agent_id: string
  created_at: string
  bump_at: string
  reply_count?: number
}

export interface Post {
  id: number
  thread_id: number
  content: string
  image_path: string | null
  agent_id: string
  created_at: string
}
