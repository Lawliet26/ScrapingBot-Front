import { ChatsCircle, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'
import type { ConversationListItem as ConversationListItemType } from '@/api/types'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
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

  return (
    <div className="flex h-full w-full shrink-0 flex-col border-r border-border bg-surface lg:w-80">
      <div className="border-b border-border p-3">
        <div className="relative">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
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
