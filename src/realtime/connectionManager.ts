import type { ChatEvent, ChatEventType, OutboundFrame, ProtocolErrorFrame, TerminalCloseCode } from '../api/ws'
import { CLOSE_FORBIDDEN, CLOSE_UNAUTHORIZED } from '../api/ws'

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed'

/** Structural subset of WebSocket — lets tests supply a fake with no DOM. */
export interface SocketLike {
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((ev: unknown) => void) | null
  onmessage: ((ev: { data: unknown }) => void) | null
  onclose: ((ev: { code: number; reason?: string }) => void) | null
  onerror: ((ev: unknown) => void) | null
}

export interface ConnectionManagerOptions {
  url: string | (() => string)
  socketFactory?: (url: string) => SocketLike
  setTimeout?: (fn: () => void, ms: number) => number
  clearTimeout?: (handle: number) => void
  baseDelayMs?: number
  maxDelayMs?: number
  onProtocolError?: (frame: ProtocolErrorFrame) => void
}

export interface ConnectionManager {
  connect(): void
  disconnect(): void
  subscribe(conversationId: string): void
  unsubscribe(conversationId: string): void
  getStatus(): ConnectionStatus
  getSubscriptions(): string[]
  onStatusChange(l: (s: ConnectionStatus) => void): () => void
  onEvent(l: (e: ChatEvent) => void): () => void
  onTerminal(l: (code: TerminalCloseCode) => void): () => void
}

const CHAT_EVENT_TYPES: ChatEventType[] = ['message.created', 'note.created', 'conversation.updated', 'conversation.read']

function isTerminalCode(code: number): code is TerminalCloseCode {
  return code === CLOSE_UNAUTHORIZED || code === CLOSE_FORBIDDEN
}

/**
 * Pure, React-free WebSocket lifecycle: connect, exponential backoff, terminal
 * close-code classification, ref-counted subscriptions, resubscribe-on-reconnect.
 * All timers and the socket constructor are injectable so this is unit-testable
 * without a DOM WebSocket (proposal decision 2).
 */
export function createConnectionManager(options: ConnectionManagerOptions): ConnectionManager {
  const socketFactory = options.socketFactory ?? ((u: string) => new WebSocket(u) as unknown as SocketLike)
  const scheduleTimeout = options.setTimeout ?? globalThis.setTimeout.bind(globalThis)
  const cancelTimeout = options.clearTimeout ?? globalThis.clearTimeout.bind(globalThis)
  const baseDelayMs = options.baseDelayMs ?? 1000
  const maxDelayMs = options.maxDelayMs ?? 30000

  let status: ConnectionStatus = 'idle'
  let socket: SocketLike | null = null
  let attempt = 0
  let retryTimer: number | null = null
  let intentionalDisconnect = false

  const subscriptions = new Map<string, number>()
  const statusListeners = new Set<(s: ConnectionStatus) => void>()
  const eventListeners = new Set<(e: ChatEvent) => void>()
  const terminalListeners = new Set<(code: TerminalCloseCode) => void>()

  function setStatus(next: ConnectionStatus): void {
    status = next
    for (const listener of statusListeners) listener(status)
  }

  function resolveUrl(): string {
    return typeof options.url === 'function' ? options.url() : options.url
  }

  function send(frame: OutboundFrame): void {
    socket?.send(JSON.stringify(frame))
  }

  function clearRetryTimer(): void {
    if (retryTimer !== null) {
      cancelTimeout(retryTimer)
      retryTimer = null
    }
  }

  function scheduleReconnect(): void {
    const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
    retryTimer = scheduleTimeout(() => {
      retryTimer = null
      connect()
    }, delay)
    attempt += 1
  }

  function handleOpen(): void {
    attempt = 0
    setStatus('open')
    // D2: the ONLY place subscribe frames are sent — first connect and reconnect both replay here.
    for (const id of subscriptions.keys()) {
      send({ type: 'subscribe', conversation_id: id })
    }
  }

  function handleClose(ev: { code: number; reason?: string }): void {
    socket = null
    if (intentionalDisconnect) {
      intentionalDisconnect = false
      return
    }
    if (isTerminalCode(ev.code)) {
      setStatus('closed')
      for (const listener of terminalListeners) listener(ev.code)
      return
    }
    setStatus('closed')
    scheduleReconnect()
  }

  function handleMessage(ev: { data: unknown }): void {
    try {
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data)
      const parsed = JSON.parse(raw) as { type?: unknown }
      if (!parsed || typeof parsed.type !== 'string') {
        if (import.meta.env.DEV) console.warn('[ws] malformed frame', ev.data)
        return
      }
      if (parsed.type === 'error') {
        options.onProtocolError?.(parsed as ProtocolErrorFrame)
        return
      }
      if (!CHAT_EVENT_TYPES.includes(parsed.type as ChatEventType)) {
        if (import.meta.env.DEV) console.warn('[ws] unknown event type', parsed.type)
        return
      }
      const event = parsed as ChatEvent
      for (const listener of eventListeners) listener(event)
    } catch (err) {
      // Never throw inside a WebSocket event handler — an uncaught throw here
      // can silently kill future event delivery for the life of the socket.
      if (import.meta.env.DEV) console.warn('[ws] failed to parse frame', err)
    }
  }

  function handleError(): void {
    // onerror is always followed by onclose per the WebSocket spec; nothing to do here.
  }

  function connect(): void {
    clearRetryTimer()
    intentionalDisconnect = false
    setStatus('connecting')
    const s = socketFactory(resolveUrl())
    socket = s
    s.onopen = handleOpen
    s.onmessage = handleMessage
    s.onclose = handleClose
    s.onerror = handleError
  }

  function disconnect(): void {
    clearRetryTimer()
    intentionalDisconnect = true
    const s = socket
    s?.close(1000)
    if (s) {
      s.onopen = null
      s.onmessage = null
      s.onerror = null
      s.onclose = null
    }
    socket = null
    setStatus('closed')
  }

  function subscribe(conversationId: string): void {
    const count = subscriptions.get(conversationId) ?? 0
    subscriptions.set(conversationId, count + 1)
    if (count === 0 && status === 'open') {
      send({ type: 'subscribe', conversation_id: conversationId })
    }
  }

  function unsubscribe(conversationId: string): void {
    const count = subscriptions.get(conversationId)
    if (count === undefined) return
    if (count <= 1) {
      subscriptions.delete(conversationId)
      if (status === 'open') {
        send({ type: 'unsubscribe', conversation_id: conversationId })
      }
    } else {
      subscriptions.set(conversationId, count - 1)
    }
  }

  return {
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    getStatus: () => status,
    getSubscriptions: () => Array.from(subscriptions.keys()),
    onStatusChange(listener) {
      statusListeners.add(listener)
      return () => statusListeners.delete(listener)
    },
    onEvent(listener) {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },
    onTerminal(listener) {
      terminalListeners.add(listener)
      return () => terminalListeners.delete(listener)
    },
  }
}
