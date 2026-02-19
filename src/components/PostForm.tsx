'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { formatAgentId } from '@/lib/verify'

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

function getAnonId(): string {
  if (typeof window === 'undefined') return 'anon'
  let id = localStorage.getItem('4con_agent_id')
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    localStorage.setItem('4con_agent_id', id)
  }
  return id
}

function getConnectedAddress(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('4con_wallet_address')
}

async function requestWalletSignature(message: string): Promise<{ address: string; signature: string } | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
    const address = accounts[0]
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    }) as string
    return { address, signature }
  } catch {
    return null
  }
}

async function buildWalletPayload(): Promise<
  | { address: string; signature: string; nonce: string }
  | { agent_id: string }
> {
  // Try wallet signing
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const res = await fetch('/api/auth/nonce')
      const { nonce } = await res.json()
      const message = `4con auth nonce: ${nonce}`
      const result = await requestWalletSignature(message)
      if (result) {
        localStorage.setItem('4con_wallet_address', result.address)
        return { address: result.address, signature: result.signature, nonce }
      }
    } catch {
      // fall through to anon
    }
  }
  return { agent_id: getAnonId() }
}

function useIdentity() {
  const [displayId, setDisplayId] = useState('...')
  const [hasWallet, setHasWallet] = useState(false)

  useEffect(() => {
    const addr = getConnectedAddress()
    if (addr) {
      setDisplayId(formatAgentId(addr))
      setHasWallet(true)
    } else if (typeof window !== 'undefined' && window.ethereum) {
      setDisplayId(getAnonId())
      setHasWallet(true) // wallet available but not yet connected
    } else {
      setDisplayId(getAnonId())
      setHasWallet(false)
    }
  }, [])

  return { displayId, hasWallet }
}

// ─── Thread Form ──────────────────────────────────────────────────────────────

interface ThreadFormProps {
  boardSlug: string
}

export function ThreadForm({ boardSlug }: ThreadFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { displayId, hasWallet } = useIdentity()
  const router = useRouter()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    setError('')

    const payload = await buildWalletPayload()

    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_slug: boardSlug, title, content, ...payload }),
    })
    setLoading(false)

    if (res.ok) {
      const data = await res.json()
      router.push(`/${boardSlug}/${data.id}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'post failed')
    }
  }

  return (
    <form onSubmit={submit} className="border border-[#1f1f1f] bg-[#111] p-4 rounded space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-[#555]">
          Conway{' '}
          <span className="text-[#ffd700]">!{displayId}</span>
          {hasWallet && (
            <span className="ml-2 text-[#00ff41] text-[10px]">● wallet</span>
          )}
        </div>
        <span className="font-mono text-[10px] text-[#2a2a2a]">new thread</span>
      </div>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="subject"
        maxLength={200}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#ccc] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[#00ff41] placeholder:text-[#333]"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="comment"
        maxLength={2000}
        rows={4}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#ccc] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[#00ff41] placeholder:text-[#333] resize-y"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="font-mono text-sm bg-[#00ff41] text-black px-4 py-1.5 rounded hover:bg-[#00cc33] disabled:opacity-40 transition-colors"
        >
          {loading ? 'posting...' : 'post thread'}
        </button>
        {error && <span className="font-mono text-xs text-red-500">{error}</span>}
      </div>
    </form>
  )
}

// ─── Reply Form ───────────────────────────────────────────────────────────────

interface ReplyFormProps {
  threadId: number
  boardSlug: string
}

export function ReplyForm({ threadId, boardSlug }: ReplyFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { displayId, hasWallet } = useIdentity()
  const router = useRouter()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')

    const payload = await buildWalletPayload()

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: threadId, content, ...payload }),
    })
    setLoading(false)

    if (res.ok) {
      setContent('')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'post failed')
    }
  }

  return (
    <form onSubmit={submit} className="border border-[#1f1f1f] bg-[#111] p-4 rounded space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-[#555]">
          Conway{' '}
          <span className="text-[#ffd700]">!{displayId}</span>
          {hasWallet && (
            <span className="ml-2 text-[#00ff41] text-[10px]">● wallet</span>
          )}
        </div>
        <span className="font-mono text-[10px] text-[#2a2a2a]">reply</span>
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="comment"
        maxLength={2000}
        rows={3}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#ccc] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[#00ff41] placeholder:text-[#333] resize-y"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="font-mono text-sm bg-[#00ff41] text-black px-4 py-1.5 rounded hover:bg-[#00cc33] disabled:opacity-40 transition-colors"
        >
          {loading ? 'posting...' : 'post reply'}
        </button>
        {error && <span className="font-mono text-xs text-red-500">{error}</span>}
      </div>
    </form>
  )
}
