import { WarningCircle } from '@phosphor-icons/react'
import type { Message } from '@/api/types'
import { cn } from '@/lib/utils'
import { formatTimeHHmm } from '@/lib/format'

interface MessageBubbleProps {
  message: Message
  /** Primer mensaje de una racha del mismo remitente: muestra el nombre. */
  isFirstOfGroup: boolean
  /** Último de la racha: muestra la hora. */
  isLastOfGroup: boolean
}

export function MessageBubble({ message, isFirstOfGroup, isLastOfGroup }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'

  return (
    <div className={cn('flex flex-col animate-in', isOutbound ? 'items-end' : 'items-start', isFirstOfGroup ? 'mt-4' : 'mt-1.5')}>
      {isFirstOfGroup && (
        <span className="mb-1.5 px-1 text-[11px] font-medium text-ink-faint">{isOutbound ? 'Bot' : 'Cliente'}</span>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed',
          isOutbound
            ? 'bg-linear-to-br from-accent to-accent-strong text-accent-ink neu-accent'
            : 'bg-canvas text-ink neu-raised',
          // La esquina "pegada" al remitente se achata solo en el primer mensaje de la racha.
          isFirstOfGroup && (isOutbound ? 'rounded-tr-md' : 'rounded-tl-md'),
        )}
      >
        {message.type === 'image' && message.image_url && (
          <img src={message.image_url} alt="" className="mb-2 max-h-64 rounded-xl object-cover" />
        )}
        {message.type === 'audio' && message.audio_url && (
          <div className="mb-1.5">
            <audio controls src={message.audio_url} className="h-9 max-w-full" />
          </div>
        )}
        {message.content && <p className="whitespace-pre-line">{message.content}</p>}
        {message.status === 'failed' && (
          <p className={cn('mt-1 flex items-center gap-1 text-[12px]', isOutbound ? 'text-accent-ink/90' : 'text-danger')}>
            <WarningCircle size={13} />
            No se pudo enviar
          </p>
        )}
      </div>
      {isLastOfGroup && <span className="mt-1 px-1 text-[11px] text-ink-faint">{formatTimeHHmm(message.created_at)}</span>}
    </div>
  )
}
