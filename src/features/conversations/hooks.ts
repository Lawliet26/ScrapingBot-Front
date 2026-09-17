import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RefObject } from 'react'
import {
  fetchConversationDetail,
  fetchConversations,
  markConversationRead,
  pollConversation,
  sendMessage,
  toggleConversationBot,
  type SendMessagePayload,
} from '@/api/conversations'

export function useConversationsQuery(search: string) {
  return useQuery({
    queryKey: ['conversations', 'list', { search }],
    queryFn: ({ signal }) => fetchConversations({ search: search || undefined }, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  })
}

export function useConversationDetailQuery(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'detail'],
    queryFn: ({ signal }) => fetchConversationDetail(conversationId as string, signal),
    enabled: !!conversationId,
  })
}

export function useConversationPoll(
  conversationId: string | undefined,
  sinceRef: RefObject<string | null>,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'poll'],
    queryFn: ({ signal }) => pollConversation(conversationId as string, sinceRef.current, signal),
    enabled: enabled && !!conversationId,
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
  })
}

export function useToggleBot(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => toggleConversationBot(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
    },
  })
}

export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
    },
  })
}

export function useSendMessage(conversationId: string) {
  return useMutation({
    mutationFn: (payload: SendMessagePayload) => sendMessage(conversationId, payload),
  })
}
