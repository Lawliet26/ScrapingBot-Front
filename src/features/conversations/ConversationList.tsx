import { ChatsCircle, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'
import type { ConversationListItem as ConversationListItemType } from '@/api/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InputField } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationListItem } from './ConversationListItem'

interface ConversationListProps {
  conversations: ConversationListItemType[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  selectedId: string | undefined
  onSelect: (id: string) => void
  search: string
  onSearchChange: (value: string) => void
}

export function ConversationList({
  conversations,
  isLoading,
  isError,
  onRetry,
  selectedId,
  onSelect,
  search,
  onSearchChange,
}: ConversationListProps) {
  const sorted = conversations
    ? [...conversations].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
    : []

  const unseenTotal = sorted.reduce((acc, c) => acc + c.unseen_messages_count, 0)

  return (
    <div className="flex h-full w-full shrink-0 flex-col bg-canvas lg:w-[340px] lg:border-r lg:border-border/60">
      <div className="space-y-4 px-4 pt-6 pb-4">
        <div className="flex items-baseline justify-between px-1">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Conversaciones</h1>
          {unseenTotal > 0 && <span className="text-[12px] font-medium text-accent-strong">{unseenTotal} sin leer</span>}
        </div>
        <InputField
          icon={MagnifyingGlass}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar cliente..."
          aria-label="Buscar conversaciones"
        />
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px] w-full" />)
        ) : isError ? (
          <EmptyState
            icon={WarningCircle}
            title="No pudimos cargar las conversaciones"
            action={
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Reintentar
              </Button>
            }
          />
        ) : sorted.length === 0 ? (
          <EmptyState icon={ChatsCircle} title="No hay conversaciones todavía." />
        ) : (
          sorted.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === selectedId}
              onSelect={() => onSelect(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
