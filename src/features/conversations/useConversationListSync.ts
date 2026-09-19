import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { ConversationListItem, Paginated } from '@/api/types'
import type { ConversationReadEvent, ConversationUpdatedEvent } from '@/api/ws'
import { useWebSocket } from '@/realtime/WebSocketProvider'
import { mergeById } from './mergeById'

/**
 * Keeps the sidebar's cached conversation list rows fresh from WS pushes,
 * without waiting for the 15s poll. Update-only: never inserts a row that
 * isn't already present in a given cached `search` variant (D4/D8).
 */
export function useConversationListSync(): void {
  const queryClient = useQueryClient()
  const { on } = useWebSocket()

  useEffect(() => {
    const apply = (event: ConversationUpdatedEvent | ConversationReadEvent) => {
      queryClient.setQueriesData<Paginated<ConversationListItem>>({ queryKey: ['conversations', 'list'] }, (prev) => {
        if (!prev) return prev
        const current = prev.results.find((row) => row.id === event.data.id)
        if (!current) return prev
        return { ...prev, results: mergeById(prev.results, [{ ...current, ...event.data }]) }
      })
    }

    const offUpdated = on('conversation.updated', apply)
    const offRead = on('conversation.read', apply)
    return () => {
      offUpdated()
      offRead()
    }
  }, [queryClient, on])
}
