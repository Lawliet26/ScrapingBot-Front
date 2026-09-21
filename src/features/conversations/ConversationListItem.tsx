import type { ConversationListItem as ConversationListItemType } from '@/api/types'
import { Avatar } from '@/components/ui/avatar'
import { CounterBadge, StatusBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatTimeHHmm } from '@/lib/format'

export function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: ConversationListItemType
  isActive: boolean
  onSelect: () => void
}) {
  const hasUnseen = conversation.unseen_messages_count > 0 || conversation.unseen_notes_count > 0

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl bg-canvas px-3.5 py-3 text-left transition-[box-shadow,background-color] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
        // Activo: se hunde en el canvas. Reposo: plano; al pasar el mouse sobresale apenas.
        isActive ? 'neu-inset' : 'hover:neu-raised-sm',
      )}
    >
      <Avatar name={conversation.customer} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-[13.5px] text-ink', hasUnseen ? 'font-semibold' : 'font-medium')}>
            {conversation.customer}
          </span>
          <span className={cn('shrink-0 text-[11px]', hasUnseen ? 'font-medium text-accent-strong' : 'text-ink-faint')}>
            {formatTimeHHmm(conversation.last_message_at)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">{conversation.active_product ?? 'Sin producto activo'}</p>
        <p className={cn('mt-1 truncate text-[13px]', hasUnseen ? 'text-ink' : 'text-ink-muted')}>
          {conversation.last_message || 'Sin mensajes'}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <StatusBadge label={conversation.label} color={conversation.color} />
          <div className="flex shrink-0 items-center gap-1.5">
            <CounterBadge count={conversation.unseen_messages_count} color="#25d366" label="Mensajes sin ver" />
            <CounterBadge count={conversation.unseen_notes_count} color="#e33e3e" label="Notas IA sin ver" />
          </div>
        </div>
      </div>
    </button>
  )
}
