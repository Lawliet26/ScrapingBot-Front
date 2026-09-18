import { ChatsCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { ChatPanel } from './ChatPanel'
import { ConversationList } from './ConversationList'
import { useConversationsQuery } from './hooks'

export function ConversationsPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)

  const conversationsQuery = useConversationsQuery(search)
  const selected = conversationsQuery.data?.results.find((c) => c.id === conversationId)

  return (
    <div className="flex h-full">
      <div className={cn('h-full w-full lg:w-auto', conversationId ? 'hidden lg:flex' : 'flex')}>
        <ConversationList
          conversations={conversationsQuery.data?.results}
          isLoading={conversationsQuery.isLoading}
          isError={conversationsQuery.isError}
          onRetry={() => void conversationsQuery.refetch()}
          selectedId={conversationId}
          onSelect={(id) => navigate(`/conversaciones/${id}`)}
          search={searchInput}
          onSearchChange={setSearchInput}
        />
      </div>

      <div className={cn('h-full flex-1', conversationId ? 'flex' : 'hidden lg:flex')}>
        {conversationId ? (
          <ChatPanel
            key={conversationId}
            conversationId={conversationId}
            customerName={selected?.customer ?? ''}
            phone={selected?.phone ?? ''}
            onBack={() => navigate('/conversaciones')}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={ChatsCircle} title="Seleccioná una conversación para ver los mensajes." />
          </div>
        )}
      </div>
    </div>
  )
}
