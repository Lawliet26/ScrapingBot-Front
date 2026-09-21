import type { ConversationDetail, ConversationNote, Message } from '@/api/types'
import { AUTO_REPLIES, buildConversations, type ConversationRecord } from '../data/conversations'
import { badRequest, field, notFound, ok, paginate, route } from '../router'

const conversations: ConversationRecord[] = buildConversations()
let messageSeq = 1000
let noteSeq = 1000

function find(id: string): ConversationRecord | undefined {
  return conversations.find((c) => c.summary.id === id)
}

function detailOf(record: ConversationRecord, since?: string | null): ConversationDetail {
  const messages = since ? record.messages.filter((m) => m.created_at > since) : record.messages
  return {
    conversation: {
      id: record.summary.id,
      llm_enabled: record.summary.llm_enabled,
      send_enabled: !record.summary.llm_enabled,
    },
    messages,
    notes: record.notes,
    idle_warning: record.idle_warning,
  }
}

function pushMessage(record: ConversationRecord, message: Message) {
  record.messages.push(message)
  record.summary.last_message = message.type === 'text' ? message.content : message.type === 'image' ? '📷 Imagen' : '🎤 Nota de voz'
  record.summary.last_message_at = message.created_at
  record.idle_warning = false
}

function pushNote(record: ConversationRecord, content: string) {
  const note: ConversationNote = { id: `n-${noteSeq++}`, content, seen: false, created_at: new Date().toISOString() }
  record.notes.push(note)
  record.summary.unseen_notes_count += 1
}

/** Simula que el cliente responde unos segundos después de que el staff escribe. */
function scheduleAutoReply(record: ConversationRecord) {
  const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
  setTimeout(() => {
    pushMessage(record, {
      id: `m-${messageSeq++}`,
      direction: 'inbound',
      type: 'text',
      content: reply,
      status: 'sent',
      media_id: '',
      mime: '',
      audio_url: '',
      image_url: '',
      created_at: new Date().toISOString(),
    })
    record.summary.unseen_messages_count += 1
    pushNote(record, `El cliente respondió: "${reply}".`)
  }, 2500 + Math.random() * 2000)
}

route('GET', '/conversations/', ({ query }) => {
  const search = (query.get('search') ?? '').trim().toLowerCase()
  const filtered = search
    ? conversations.filter((c) => c.summary.customer.toLowerCase().includes(search) || c.summary.phone.includes(search))
    : conversations
  return ok(
    paginate(
      filtered.map((c) => c.summary),
      query,
      50,
    ),
  )
})

route('GET', '/conversations/:id/', ({ params }) => {
  const record = find(params.id)
  return record ? ok(detailOf(record)) : notFound('Conversación no encontrada.')
})

route('GET', '/conversations/:id/poll/', ({ params, query }) => {
  const record = find(params.id)
  return record ? ok(detailOf(record, query.get('since'))) : notFound('Conversación no encontrada.')
})

route('POST', '/conversations/:id/toggle/', ({ params }) => {
  const record = find(params.id)
  if (!record) return notFound('Conversación no encontrada.')
  record.summary.llm_enabled = !record.summary.llm_enabled
  return ok({ ok: true, llm_enabled: record.summary.llm_enabled })
})

route('POST', '/conversations/:id/read/', ({ params }) => {
  const record = find(params.id)
  if (!record) return notFound('Conversación no encontrada.')
  record.summary.unseen_messages_count = 0
  record.summary.unseen_notes_count = 0
  record.notes = record.notes.map((n) => ({ ...n, seen: true }))
  return ok({ ok: true })
})

route('POST', '/conversations/:id/messages/', ({ params, body }) => {
  const record = find(params.id)
  if (!record) return notFound('Conversación no encontrada.')
  if (record.summary.llm_enabled) {
    return badRequest([{ field: '', message: 'Apagá el bot antes de escribir en esta conversación.' }])
  }

  const form = body instanceof FormData ? body : new FormData()
  const text = field(form, 'text')
  const audio = form.get('audio')
  const voice = form.get('voice')

  const base = {
    id: `m-${messageSeq++}`,
    direction: 'outbound' as const,
    status: 'sent' as const,
    media_id: '',
    created_at: new Date().toISOString(),
  }

  let message: Message
  if (text) {
    message = { ...base, type: 'text', content: text, mime: '', audio_url: '', image_url: '' }
  } else if (audio instanceof File) {
    const isImage = audio.type.startsWith('image/')
    const url = URL.createObjectURL(audio)
    message = {
      ...base,
      type: isImage ? 'image' : 'audio',
      content: '',
      mime: audio.type,
      audio_url: isImage ? '' : url,
      image_url: isImage ? url : '',
    }
  } else if (voice instanceof Blob) {
    message = { ...base, type: 'audio', content: '', mime: voice.type, audio_url: URL.createObjectURL(voice), image_url: '' }
  } else {
    return badRequest([{ field: 'text', message: 'El mensaje está vacío.' }])
  }

  pushMessage(record, message)
  scheduleAutoReply(record)
  return ok({ ok: true, message: { id: message.id, status: message.status } })
})
