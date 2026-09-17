import type { Message } from '@/api/types'

export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) return existing
  const seen = new Set(existing.map((m) => m.id))
  const fresh = incoming.filter((m) => !seen.has(m.id))
  if (fresh.length === 0) return existing
  return [...existing, ...fresh]
}
