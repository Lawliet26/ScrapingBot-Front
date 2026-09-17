export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface User {
  id: number
  username: string
}

export interface Oferta {
  cantidad: number
  total: number
}

export interface Product {
  id: string
  nombre: string
  descripcion: string
  precio: string
  ofertas: Oferta[]
  ofertas_summary: string
  imagenes: string[]
  imagen_url: string
  created_at: string
  updated_at: string
}

export type AgentVisibleField = 'nombre' | 'descripcion' | 'precio'

export interface ProductsConfig {
  agent_visible_fields: AgentVisibleField[]
}

export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'image' | 'audio'
export type MessageStatus = '' | 'sent' | 'failed'

export interface Message {
  id: string
  direction: MessageDirection
  type: MessageType
  content: string
  status: MessageStatus
  media_id: string
  mime: string
  audio_url: string
  image_url: string
  created_at: string
}

export interface ConversationNote {
  id: string
  content: string
  seen: boolean
  created_at: string
}

export interface ConversationListItem {
  id: string
  customer: string
  phone: string
  llm_enabled: boolean
  confirmed: boolean
  label: string
  color: string
  active_product: string | null
  last_message: string
  last_message_at: string
  unseen_notes_count: number
  unseen_messages_count: number
}

export interface ConversationDetailState {
  id: string
  llm_enabled: boolean
  send_enabled: boolean
}

export interface ConversationDetail {
  conversation: ConversationDetailState
  messages: Message[]
  notes: ConversationNote[]
  idle_warning: boolean
}

export interface SendMessageSuccess {
  ok: true
  message: { id: string; status: string }
}

export type AgentProvider = 'gemini' | 'openai'

export interface AgentPrompt {
  system_prompt: string
  provider: AgentProvider
  openai_model: string
  debounce_seconds: number
}
