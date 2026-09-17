import { api } from './client'
import type { ConversationDetail, ConversationListItem, Paginated, SendMessageSuccess } from './types'

export interface ConversationsQuery {
  page?: number
  pageSize?: number
  search?: string
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchConversations(
  query: ConversationsQuery,
  signal?: AbortSignal,
): Promise<Paginated<ConversationListItem>> {
  return api.get<Paginated<ConversationListItem>>(
    `/conversations/${buildQueryString({ page: query.page, page_size: query.pageSize, search: query.search })}`,
    signal,
  )
}

export async function fetchConversationDetail(id: string, signal?: AbortSignal): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/conversations/${id}/`, signal)
}

export async function pollConversation(id: string, since: string | null, signal?: AbortSignal): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/conversations/${id}/poll/${buildQueryString({ since: since ?? undefined })}`, signal)
}

export async function toggleConversationBot(id: string): Promise<{ ok: true; llm_enabled: boolean }> {
  return api.post(`/conversations/${id}/toggle/`)
}

export async function markConversationRead(id: string): Promise<{ ok: true }> {
  return api.post(`/conversations/${id}/read/`)
}

export type SendMessagePayload =
  | { kind: 'text'; text: string }
  | { kind: 'attachment'; file: File }
  | { kind: 'voice'; blob: Blob; durationSeconds: number }

export async function sendMessage(conversationId: string, payload: SendMessagePayload): Promise<SendMessageSuccess> {
  const form = new FormData()
  if (payload.kind === 'text') {
    form.set('text', payload.text)
  } else if (payload.kind === 'attachment') {
    form.set('audio', payload.file)
  } else {
    form.set('voice', payload.blob, 'nota-de-voz.webm')
    form.set('duration', String(Math.round(payload.durationSeconds)))
  }
  return api.postForm<SendMessageSuccess>(`/conversations/${conversationId}/messages/`, form)
}

export function mediaUrl(conversationId: string, messageId: string): string {
  return `/api/conversations/${conversationId}/messages/${messageId}/media/`
}
