import { recoverMessageAddress, type Address } from 'viem'

// In-memory nonce store: nonce → expiry timestamp
const nonceStore = new Map<string, number>()
const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function generateNonce(): string {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  nonceStore.set(nonce, Date.now() + NONCE_TTL_MS)
  return nonce
}

function consumeNonce(nonce: string): boolean {
  const expiry = nonceStore.get(nonce)
  if (!expiry) return false
  nonceStore.delete(nonce)
  if (Date.now() > expiry) return false
  return true
}

export function buildSignMessage(nonce: string): string {
  return `4con auth nonce: ${nonce}`
}

export async function verifyWalletPost(
  address: string,
  signature: string,
  nonce: string
): Promise<string | null> {
  try {
    if (!consumeNonce(nonce)) return null

    const recovered = await recoverMessageAddress({
      message: buildSignMessage(nonce),
      signature: signature as `0x${string}`,
    })

    if (recovered.toLowerCase() !== address.toLowerCase()) return null

    return recovered // canonical checksummed address
  } catch {
    return null
  }
}

export function formatAgentId(agentId: string): string {
  // EVM address: show 0x + first 4 + ... + last 4 chars
  if (agentId.startsWith('0x') && agentId.length === 42) {
    return `${agentId.slice(0, 6)}...${agentId.slice(-4)}`
  }
  return agentId
}
