import type { ConversationListItem, ConversationNote, Message } from './types'

export interface MessageCreatedEvent {
  type: 'message.created'
  conversation_id: string
  data: Message
}
export interface NoteCreatedEvent {
  type: 'note.created'
  conversation_id: string
  data: ConversationNote
}
export type ConversationRowPatch = Partial<ConversationListItem> & { id: string }
export interface ConversationUpdatedEvent {
  type: 'conversation.updated'
  conversation_id: string
  data: ConversationRowPatch
}
export interface ConversationReadEvent {
  type: 'conversation.read'
  conversation_id: string
  data: ConversationRowPatch
}

export type ChatEvent = MessageCreatedEvent | NoteCreatedEvent | ConversationUpdatedEvent | ConversationReadEvent
export type ChatEventType = ChatEvent['type']
export type EventOf<T extends ChatEventType> = Extract<ChatEvent, { type: T }>

export interface ProtocolErrorFrame {
  type: 'error'
  error: string
  /** Echoed back only for invalid_conversation_id / conversation_not_found. */
  conversation_id?: string
}
export type InboundFrame = ChatEvent | ProtocolErrorFrame
export type OutboundFrame = { type: 'subscribe' | 'unsubscribe'; conversation_id: string }

export const CLOSE_UNAUTHORIZED = 4401
export const CLOSE_FORBIDDEN = 4403
export type TerminalCloseCode = typeof CLOSE_UNAUTHORIZED | typeof CLOSE_FORBIDDEN

/** Decision 1: absolute VITE_WS_URL, else same-origin derivation. */
export function resolveWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL
  if (configured) return configured
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${scheme}//${window.location.host}/ws/chat/`
}
