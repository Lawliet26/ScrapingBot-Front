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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-canvas',
        isActive && 'bg-accent-soft hover:bg-accent-soft',
      )}
    >
      <Avatar name={conversation.customer} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13.5px] font-medium text-ink">{conversation.customer}</span>
          <span className="shrink-0 text-[11px] text-ink-faint">{formatTimeHHmm(conversation.last_message_at)}</span>
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">{conversation.active_product ?? '—'}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <StatusBadge label={conversation.label} color={conversation.color} />
        </div>
        <p className="mt-1.5 truncate text-[13px] text-ink-muted">{conversation.last_message || 'Sin mensajes'}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <CounterBadge count={conversation.unseen_messages_count} color="#25d366" label="Mensajes sin ver" />
        <CounterBadge count={conversation.unseen_notes_count} color="#e33e3e" label="Notas IA sin ver" />
      </div>
    </button>
  )
}
