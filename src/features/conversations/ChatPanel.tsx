import { ArrowLeft, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import type { ConversationDetailState, ConversationNote, Message } from '@/api/types'
import { Avatar } from '@/components/ui/avatar'
import { Banner } from '@/components/ui/banner'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'
import { NotesDialog } from './NotesDialog'
import { NotesPanel } from './NotesPanel'
import { mergeById } from './mergeById'
import { useConversationDetailQuery, useConversationPoll, useMarkRead, useSendMessage, useToggleBot } from './hooks'
import type { SendMessagePayload } from '@/api/conversations'

interface ChatPanelProps {
  conversationId: string
  customerName: string
  phone: string
  onBack: () => void
}

export function ChatPanel({ conversationId, customerName, phone, onBack }: ChatPanelProps) {
  const detailQuery = useConversationDetailQuery(conversationId)
  const [messages, setMessages] = useState<Message[]>([])
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [convState, setConvState] = useState<ConversationDetailState | null>(null)
  const [idleWarning, setIdleWarning] = useState(false)

  const sinceRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const markedReadRef = useRef<string | null>(null)

  const pollQuery = useConversationPoll(conversationId, sinceRef, !!detailQuery.data)
  const toggleBot = useToggleBot(conversationId)
  const markRead = useMarkRead(conversationId)
  const sendMessage = useSendMessage(conversationId)

  useEffect(() => {
    if (!detailQuery.data) return
    const incomingMessages = detailQuery.data.messages ?? []
    setMessages(incomingMessages)
    setNotes(detailQuery.data.notes ?? [])
    setConvState(detailQuery.data.conversation ?? null)
    setIdleWarning(detailQuery.data.idle_warning ?? false)
    sinceRef.current = incomingMessages.at(-1)?.created_at ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data])

  useEffect(() => {
    if (!pollQuery.data) return
    const incomingMessages = pollQuery.data.messages ?? []
    setMessages((prev) => mergeById(prev, incomingMessages))
    setNotes((prev) => mergeById(prev, pollQuery.data.notes ?? []))
    setConvState(pollQuery.data.conversation ?? null)
    setIdleWarning(pollQuery.data.idle_warning ?? false)
    const last = incomingMessages.at(-1)?.created_at
    if (last) sinceRef.current = last
  }, [pollQuery.data])

  useEffect(() => {
    if (detailQuery.data && markedReadRef.current !== conversationId) {
      markedReadRef.current = conversationId
      markRead.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, detailQuery.data])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleToggleBot() {
    try {
      const result = await toggleBot.mutateAsync()
      setConvState((prev) => (prev ? { ...prev, llm_enabled: result.llm_enabled, send_enabled: !result.llm_enabled } : prev))
    } catch {
      toast.error('No pudimos cambiar el estado del bot.')
    }
  }

  async function handleSend(payload: SendMessagePayload) {
    try {
      await sendMessage.mutateAsync(payload)
      await detailQuery.refetch()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.errors[0]?.message ?? err.message)
      } else {
        toast.error('No se pudo enviar el mensaje.')
      }
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (detailQuery.isError || !convState) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <EmptyState icon={WarningCircle} title="No pudimos cargar la conversación" description="Intentá de nuevo en unos segundos." />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink lg:hidden"
          >
            <ArrowLeft size={18} />
          </button>
          <Avatar name={customerName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{customerName}</p>
            <p className="truncate text-[12px] text-ink-faint">{phone}</p>
          </div>
          <NotesDialog notes={notes} />

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-ink-muted">Bot {convState.llm_enabled ? 'ON' : 'OFF'}</span>
            <Switch
              checked={convState.llm_enabled}
              onCheckedChange={() => void handleToggleBot()}
              disabled={toggleBot.isPending}
            />
          </div>
        </div>

        {idleWarning && (
          <div className="px-4 pt-3">
            <Banner tone="warning">
              <WarningCircle size={16} />
              Sin actividad del cliente hace más de 24 horas.
            </Banner>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <EmptyState icon={WarningCircle} title="Sin mensajes en esta conversación." />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <Composer
          disabled={!convState.send_enabled}
          isSending={sendMessage.isPending}
          onSendText={(text) => void handleSend({ kind: 'text', text })}
          onSendFile={(file) => void handleSend({ kind: 'attachment', file })}
          onSendVoice={(blob, durationSeconds) => void handleSend({ kind: 'voice', blob, durationSeconds })}
        />
      </div>

      <NotesPanel notes={notes} />
    </div>
  )
}
