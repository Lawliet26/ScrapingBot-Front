import { describe, expect, it } from 'vitest'
import { CLOSE_FORBIDDEN, CLOSE_UNAUTHORIZED } from '../api/ws'
import type { ChatEvent, ProtocolErrorFrame } from '../api/ws'
import { createConnectionManager, type ConnectionManagerOptions, type SocketLike } from './connectionManager'

class FakeSocket implements SocketLike {
  sent: string[] = []
  closed: { code?: number; reason?: string } | null = null
  onopen: ((ev: unknown) => void) | null = null
  onmessage: ((ev: { data: unknown }) => void) | null = null
  onclose: ((ev: { code: number; reason?: string }) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null

  send(data: string): void {
    this.sent.push(data)
  }

  close(code?: number, reason?: string): void {
    this.closed = { code, reason }
  }
}

interface FakeTimer {
  fn: () => void
  ms: number
}

function createFakeTimers() {
  let nextId = 1
  const timers = new Map<number, FakeTimer>()

  return {
    setTimeout: (fn: () => void, ms: number): number => {
      const id = nextId++
      timers.set(id, { fn, ms })
      return id
    },
    clearTimeout: (id: number): void => {
      timers.delete(id)
    },
    get count() {
      return timers.size
    },
    get scheduled() {
      return Array.from(timers.values())
    },
    /** Fires the oldest pending timer (or a specific one by id) and removes it. */
    fire(id?: number): void {
      const targetId = id ?? Array.from(timers.keys())[0]
      const timer = timers.get(targetId)
      if (!timer) throw new Error('no timer scheduled to fire')
      timers.delete(targetId)
      timer.fn()
    },
  }
}

function setup(overrides: Partial<ConnectionManagerOptions> = {}) {
  const sockets: FakeSocket[] = []
  const timers = createFakeTimers()
  const manager = createConnectionManager({
    url: 'ws://test/ws/chat/',
    socketFactory: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    ...overrides,
  })
  return { manager, sockets, timers }
}

describe('createConnectionManager', () => {
  it('backs off 1s,2s,4s,8s,16s,30s,30s and resets to 1s after a successful open', () => {
    const { manager, sockets, timers } = setup()
    manager.connect()

    const delays: number[] = []
    for (let i = 0; i < 7; i++) {
      sockets[sockets.length - 1].onclose?.({ code: 1006 })
      delays.push(timers.scheduled[timers.scheduled.length - 1].ms)
      timers.fire()
    }
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000])

    sockets[sockets.length - 1].onopen?.(undefined)
    sockets[sockets.length - 1].onclose?.({ code: 1006 })
    expect(timers.scheduled[timers.scheduled.length - 1].ms).toBe(1000)
  })

  it.each([CLOSE_UNAUTHORIZED, CLOSE_FORBIDDEN])(
    'treats close code %i as terminal: zero timers scheduled, onTerminal fires',
    (code) => {
      const { manager, sockets, timers } = setup()
      const terminalCodes: number[] = []
      manager.onTerminal((c) => terminalCodes.push(c))
      manager.connect()

      sockets[0].onclose?.({ code })

      expect(timers.count).toBe(0)
      expect(terminalCodes).toEqual([code])
      expect(manager.getStatus()).toBe('closed')
    },
  )

  it('schedules exactly one timer for a non-terminal close code, including server-sent 1000', () => {
    const { manager, sockets, timers } = setup()
    manager.connect()

    sockets[0].onclose?.({ code: 1000 })

    expect(timers.count).toBe(1)
    expect(timers.scheduled[0].ms).toBe(1000)
  })

  it('resends exactly one subscribe frame per tracked id after a reconnect', () => {
    const { manager, sockets, timers } = setup()
    manager.connect()
    sockets[0].onopen?.(undefined)
    manager.subscribe('a')
    manager.subscribe('b')
    expect(sockets[0].sent).toEqual([
      JSON.stringify({ type: 'subscribe', conversation_id: 'a' }),
      JSON.stringify({ type: 'subscribe', conversation_id: 'b' }),
    ])

    sockets[0].onclose?.({ code: 1006 })
    timers.fire()
    sockets[1].onopen?.(undefined)

    expect(sockets[1].sent).toEqual([
      JSON.stringify({ type: 'subscribe', conversation_id: 'a' }),
      JSON.stringify({ type: 'subscribe', conversation_id: 'b' }),
    ])
  })

  it('ref-counts subscriptions so a StrictMode double-invoked effect does not unsubscribe early', () => {
    const { manager } = setup()
    manager.subscribe('x')
    manager.subscribe('x')
    manager.unsubscribe('x')
    expect(manager.getSubscriptions()).toEqual(['x'])
  })

  it('never throws and never emits a ChatEvent for malformed JSON, an unknown type, or an error frame', () => {
    const { manager, sockets } = setup()
    manager.connect()
    const events: ChatEvent[] = []
    manager.onEvent((e) => events.push(e))

    expect(() => sockets[0].onmessage?.({ data: '{not valid json' })).not.toThrow()
    expect(() => sockets[0].onmessage?.({ data: JSON.stringify({ type: 'something.unknown' }) })).not.toThrow()
    expect(() =>
      sockets[0].onmessage?.({ data: JSON.stringify({ type: 'error', error: 'conversation_not_found' }) }),
    ).not.toThrow()

    expect(events).toEqual([])
  })

  it('removes a rejected conversation_id from subscriptions and never resends it after reconnect', () => {
    const { manager, sockets, timers } = setup()
    manager.connect()
    sockets[0].onopen?.(undefined)
    manager.subscribe('good')
    manager.subscribe('bad')
    expect(manager.getSubscriptions().sort()).toEqual(['bad', 'good'])

    sockets[0].onmessage?.({
      data: JSON.stringify({ type: 'error', error: 'conversation_not_found', conversation_id: 'bad' }),
    })
    expect(manager.getSubscriptions()).toEqual(['good'])

    sockets[0].onclose?.({ code: 1006 })
    timers.fire()
    sockets[1].onopen?.(undefined)
    expect(sockets[1].sent).toEqual([JSON.stringify({ type: 'subscribe', conversation_id: 'good' })])
  })

  it('ignores an error frame with no conversation_id to correlate (invalid_json, unknown_type, missing_conversation_id)', () => {
    const { manager, sockets } = setup()
    manager.connect()
    sockets[0].onopen?.(undefined)
    manager.subscribe('x')

    expect(() =>
      sockets[0].onmessage?.({ data: JSON.stringify({ type: 'error', error: 'missing_conversation_id' }) }),
    ).not.toThrow()
    expect(manager.getSubscriptions()).toEqual(['x'])
  })

  it('invokes onProtocolError for an error frame instead of emitting a ChatEvent', () => {
    const protocolErrors: ProtocolErrorFrame[] = []
    const { manager, sockets } = setup({ onProtocolError: (frame) => protocolErrors.push(frame) })
    manager.connect()

    sockets[0].onmessage?.({ data: JSON.stringify({ type: 'error', error: 'conversation_not_found' }) })

    expect(protocolErrors).toEqual([{ type: 'error', error: 'conversation_not_found' }])
  })

  it('delivers valid ChatEvents to onEvent listeners', () => {
    const { manager, sockets } = setup()
    manager.connect()
    const events: ChatEvent[] = []
    manager.onEvent((e) => events.push(e))
    const frame = { type: 'message.created' as const, conversation_id: 'c1', data: { id: 'm1' } }

    sockets[0].onmessage?.({ data: JSON.stringify(frame) })

    expect(events).toEqual([frame])
  })

  it('disconnect() clears pending timers and never schedules a retry', () => {
    const { manager, sockets, timers } = setup()
    manager.connect()
    sockets[0].onopen?.(undefined)

    manager.disconnect()

    expect(sockets[0].closed).toEqual({ code: 1000, reason: undefined })
    expect(manager.getStatus()).toBe('closed')
    expect(timers.count).toBe(0)
  })
})
