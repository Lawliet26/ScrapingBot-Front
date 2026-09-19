import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { CLOSE_UNAUTHORIZED, resolveWsUrl, type ChatEvent, type ChatEventType, type EventOf } from '@/api/ws'
import { createConnectionManager, type ConnectionManager, type ConnectionStatus } from './connectionManager'

interface WebSocketContextValue {
  status: ConnectionStatus
  subscribe: (conversationId: string) => () => void
  on: <T extends ChatEventType>(type: T, listener: (event: EventOf<T>) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, isStaff } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ConnectionStatus>('idle')

  const managerRef = useRef<ConnectionManager | null>(null)
  const eventListenersRef = useRef(new Map<ChatEventType, Set<(event: ChatEvent) => void>>())

  useEffect(() => {
    if (!(authStatus === 'authenticated' && isStaff)) return

    const manager = createConnectionManager({ url: resolveWsUrl })
    managerRef.current = manager

    const offStatus = manager.onStatusChange(setStatus)
    const offEvent = manager.onEvent((event) => {
      const listeners = eventListenersRef.current.get(event.type)
      if (!listeners) return
      for (const listener of listeners) listener(event)
    })
    const offTerminal = manager.onTerminal((code) => {
      if (code === CLOSE_UNAUTHORIZED) {
        toast.error('Tu sesión expiró. Volvé a iniciar sesión.')
        queryClient.setQueryData(['auth', 'me'], null)
      } else {
        toast.error('No tenés permisos para el chat en tiempo real.')
        void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      }
    })

    manager.connect()

    return () => {
      offStatus()
      offEvent()
      offTerminal()
      manager.disconnect()
      managerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, isStaff, queryClient])

  const stableApi = useMemo(() => {
    const subscribe = (conversationId: string) => {
      managerRef.current?.subscribe(conversationId)
      return () => managerRef.current?.unsubscribe(conversationId)
    }

    const on = <T extends ChatEventType>(type: T, listener: (event: EventOf<T>) => void) => {
      let listeners = eventListenersRef.current.get(type)
      if (!listeners) {
        listeners = new Set()
        eventListenersRef.current.set(type, listeners)
      }
      listeners.add(listener as (event: ChatEvent) => void)
      return () => listeners?.delete(listener as (event: ChatEvent) => void)
    }

    return { subscribe, on }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<WebSocketContextValue>(
    () => ({ status, subscribe: stableApi.subscribe, on: stableApi.on }),
    [status, stableApi],
  )

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket debe usarse dentro de <WebSocketProvider>')
  return ctx
}
