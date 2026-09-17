import { WarningCircle } from '@phosphor-icons/react'
import type { Message } from '@/api/types'
import { cn } from '@/lib/utils'
import { formatTimeHHmm } from '@/lib/format'

export function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound'

  return (
    <div className={cn('flex flex-col motion-safe:animate-in', isOutbound ? 'items-end' : 'items-start')}>
      <span className="mb-1 px-1 text-[11px] font-medium text-ink-faint">{isOutbound ? 'Bot' : 'Cliente'}</span>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed',
          isOutbound ? 'rounded-tr-sm bg-accent text-accent-ink' : 'rounded-tl-sm bg-surface border border-border text-ink',
        )}
      >
        {message.type === 'image' && message.image_url && (
          <img src={message.image_url} alt="" className="mb-1.5 max-h-64 rounded-lg object-cover" />
        )}
        {message.type === 'audio' && message.audio_url && (
          <div className="mb-1.5">
            <audio controls src={message.audio_url} className="h-9 max-w-full" />
          </div>
        )}
        {message.content && <p className="whitespace-pre-line">{message.content}</p>}
        {message.status === 'failed' && (
          <p className={cn('mt-1 flex items-center gap-1 text-[12px]', isOutbound ? 'text-white/90' : 'text-danger')}>
            <WarningCircle size={13} />
            No se pudo enviar
          </p>
        )}
      </div>
      <span className="mt-1 px-1 text-[11px] text-ink-faint">{formatTimeHHmm(message.created_at)}</span>
    </div>
  )
}
