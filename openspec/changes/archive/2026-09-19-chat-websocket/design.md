# Design: Push real-time chat events into the panel

**Change**: `chat-websocket` · **Project**: `scrapingbot-front` · **Phase**: design · **Artifact store**: hybrid
**Implements**: `openspec/changes/chat-websocket/proposal.md` (all 6 decisions approved — this document does not re-open them)

## Shape of the result

One new folder `src/realtime/` (sibling of `src/auth/`, `src/theme/`), one protocol module in `src/api/`, and **three call sites** in existing code — one line in `AppShell`, one effect in `ChatPanel`, two lines in `App.tsx`. Everything else is additive.

```
main.tsx   QueryClientProvider
 App.tsx    AuthProvider
  <Route element={<RequireStaff/>}>              isStaff === true below this line
   <Route element={<WebSocketProvider><Outlet/></WebSocketProvider>}>   NEW
    <Route element={<AppShell/>}>                useConversationListSync()  NEW (1 line)
     ConversationsPage → ChatPanel               subscribe + mergeById       NEW (1 effect)
```

Data flow, both directions of the split:

```
 socket frame ──► connectionManager (pure, no React)
                     │ classify close code · backoff · resubscribe
                     ├─ onEvent ──► WebSocketProvider emitter
                     │                 ├─► ChatPanel      setMessages(mergeById(prev,[data]))
                     │                 └─► listSync       setQueriesData(update-if-present)
                     └─ onTerminal ─► 4401 → setQueryData(['auth','me'], null) → RequireStaff → /login
                                      4403 → toast + invalidate(['auth','me'])
```

## Corrections to what the proposal assumed

Verified against the real source; three things differ and the design absorbs them.

| Proposal said | Reality | Consequence |
|---|---|---|
| "introduces `src/vite-env.d.ts` typing" | The file **does not exist at all**, but `tsconfig.app.json:7` already sets `"types": ["vite/client"]`, so `import.meta.env.VITE_WS_URL` already compiles (as `any`) | Still create the file, but its job is *narrowing to `string \| undefined`*, not enabling `import.meta.env`. Non-blocking either way. |
| `4401` → "let the existing auth guard redirect" | There is **no** global HTTP-401 handler. `client.ts` only throws `ApiError`; `RequireStaff` redirects solely off `useAuth().status`, which derives from the `['auth','me']` query | Nothing redirects by itself. The provider must actively do `queryClient.setQueryData(['auth','me'], null)` — the exact line `AuthProvider.logout()` uses (`AuthProvider.tsx:48`) — to make the guard fire. |
| `4403` → "existing pattern" for no-permissions | No "no access" UI state exists anywhere; `sonner` `toast.error` is the only error convention (`ChatPanel.tsx:81`) | `toast.error` + `invalidateQueries(['auth','me'])` so the guard re-checks staff status against the server. |

Also confirmed: `ChatPanel` really is `key={conversationId}` (`ConversationsPage.tsx:38`) so it remounts per conversation — the proposal's reason for an app-level provider holds. And `<StrictMode>` is on (`main.tsx:20`), so every subscribe effect runs twice in dev; subscriptions must be **ref-counted**.

## Architecture decisions

| # | Decision | Alternatives rejected | Rationale |
|---|---|---|---|
| D1 | Subscription **ref-counting lives inside the connection manager** (`Map<string, number>`), not in the provider | Set-based tracking in the provider | StrictMode double-invokes effects; a plain Set would unsubscribe on the first cleanup. Ref-counting is also unit-testable behaviour (c) with no React. |
| D2 | `subscribe()` **never sends eagerly** unless status is `open`; the single `onopen` handler replays every tracked id | Queue outbound frames; send-on-subscribe plus a separate reconnect replay | One code path serves both first-connect and reconnect. Tests exercise exactly one mechanism. |
| D3 | Terminal ⟺ `4401`, `4403`, or `disconnect()` was called. **Server-sent `1000` still retries** | Treat `1000` as terminal | A clean server close is a daphne redeploy, not a permission failure. Retrying is what we want there. |
| D4 | Deterministic backoff, **no jitter**: `min(1000 · 2ⁿ, 30000)`, `n` reset to 0 on `open` | Jittered backoff | Staff-only panel, single-digit concurrent clients — no thundering herd to protect against. Determinism makes the test a plain assertion list instead of a range check. |
| D5 | `{type:"error"}` frames → **dev-only `console.warn`, no UI, no retry, no state change** | Toast; surface in `status` | The UI cannot have an invalid conversation open (ids come from the server's own list). A toast would be noise the user cannot act on. The 8s/15s polls remain the correctness path. Decided, not omitted. |
| D6 | WS events **must not advance `sinceRef`** in `ChatPanel` | Advance it like the poll effect does (`ChatPanel.tsx:60-61`) | `sinceRef` is the poll's high-water mark. Advancing it past a message the HTTP poll has not yet returned would drop that message **permanently**. Letting the poll re-deliver a WS-seen message is free — `mergeById` dedupes it. |
| D7 | Event payloads typed `Partial<T> & { id: string }` for list rows, and the updater spreads over the cached row | Type as full `ConversationListItem` and replace wholesale | The exact envelope is `sdd-spec`'s to pin. A spread is correct under both full and partial payloads; a wholesale replace silently blanks fields if the backend sends a delta. |
| D8 | Sidebar sync hook is called by **`AppShell`**, not by the provider | Call it inside `WebSocketProvider` | Keeps `src/realtime/` free of `features/` imports (infra must not depend on a feature), and keeps work unit 3's provider file untouched by work unit 4. `AppShell` is always mounted in the staff subtree. |
| D9 | Vitest runs **without `globals`** — tests `import { describe, it, expect } from 'vitest'` | `globals: true` | `tsconfig.app.json` includes `src/**`, so `npm run build`'s `tsc -b` typechecks the test file. Explicit imports keep the build green with zero tsconfig changes. |
| D10 | Provider mounted as an **inline layout route element** in `App.tsx` | New `RealtimeRoute.tsx` wrapper file; wrapping inside `AppShell` | Two lines of diff, no new file, and the component type at that position is stable so React never remounts the provider. |

## New files

| File | Purpose | Work unit |
|---|---|---|
| `src/vite-env.d.ts` | Narrow `ImportMetaEnv` with `VITE_WS_URL?: string` | 1 |
| `src/api/ws.ts` | Inbound/outbound frame types (discriminated on `type`) composing `Message` / `ConversationNote` / `ConversationListItem`, close-code constants, `resolveWsUrl()` | 1 |
| `src/realtime/connectionManager.ts` | Pure, React-free, dependency-injected socket lifecycle | 2 |
| `src/realtime/connectionManager.test.ts` | Backoff schedule, terminal classification, resubscribe-on-reconnect | 2 |
| `src/realtime/WebSocketProvider.tsx` | Context + `useWebSocket()` | 3 |
| `src/features/conversations/useConversationListSync.ts` | Sidebar cache push-update | 4 |
| `vitest.config.ts` | node env, `@` alias, `src/**/*.test.ts` | 2 |
| `.env.example` | `VITE_API_PROXY` + `VITE_WS_URL`, commented | 1 |

## Modified files

| File | Change | Lines | Work unit |
|---|---|---|---|
| `vite.config.ts` | `/ws` proxy entry, `ws: true`, `proxyReqWs` Origin rewrite | ~10 | 1 |
| `README.md` | "Conectar con el backend": document `VITE_WS_URL` + the `/ws` dev proxy | ~12 | 1 |
| `package.json` | `vitest` devDep, `test` / `test:watch` scripts | ~4 | 2 |
| `src/App.tsx` | Wrap the staff subtree in `<WebSocketProvider>` | ~2 | 3 |
| `src/components/layout/AppShell.tsx` | Call `useConversationListSync()` | ~2 | 4 |
| `src/features/conversations/ChatPanel.tsx` | One `useEffect` subscribing to the open conversation | ~14 | 4 |

`src/features/conversations/hooks.ts` is **not modified** — the proposal's work-unit table listed it, but the sidebar sync belongs in its own hook file (D8) and nothing about the existing queries changes.

## Contracts

### Protocol — `src/api/ws.ts`

```ts
import type { ConversationListItem, ConversationNote, Message } from './types'

export interface MessageCreatedEvent  { type: 'message.created';      conversation_id: string; data: Message }
export interface NoteCreatedEvent     { type: 'note.created';         conversation_id: string; data: ConversationNote }
export interface ConversationUpdatedEvent { type: 'conversation.updated'; conversation_id: string; data: ConversationRowPatch }
export interface ConversationReadEvent    { type: 'conversation.read';    conversation_id: string; data: ConversationRowPatch }

/** D7: tolerant of both full rows and deltas until sdd-spec pins the envelope. */
export type ConversationRowPatch = Partial<ConversationListItem> & { id: string }

export type ChatEvent = MessageCreatedEvent | NoteCreatedEvent | ConversationUpdatedEvent | ConversationReadEvent
export type ChatEventType = ChatEvent['type']
export type EventOf<T extends ChatEventType> = Extract<ChatEvent, { type: T }>

export interface ProtocolErrorFrame { type: 'error'; error: string }
export type InboundFrame  = ChatEvent | ProtocolErrorFrame
export type OutboundFrame = { type: 'subscribe' | 'unsubscribe'; conversation_id: string }

export const CLOSE_UNAUTHORIZED = 4401
export const CLOSE_FORBIDDEN    = 4403
export type TerminalCloseCode = typeof CLOSE_UNAUTHORIZED | typeof CLOSE_FORBIDDEN

/** Decision 1: absolute VITE_WS_URL, else same-origin derivation. */
export function resolveWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL
  if (configured) return configured
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${scheme}//${window.location.host}/ws/chat/`
}
```

### Connection manager — `src/realtime/connectionManager.ts`

```ts
export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed'

/** Structural subset of WebSocket — lets tests supply a fake with no DOM. */
export interface SocketLike {
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen:    ((ev: unknown) => void) | null
  onmessage: ((ev: { data: unknown }) => void) | null
  onclose:   ((ev: { code: number; reason?: string }) => void) | null
  onerror:   ((ev: unknown) => void) | null
}

export interface ConnectionManagerOptions {
  url: string | (() => string)                      // function form => re-read per attempt
  socketFactory?: (url: string) => SocketLike       // default: (u) => new WebSocket(u)
  setTimeout?: (fn: () => void, ms: number) => number   // default: globalThis.setTimeout
  clearTimeout?: (handle: number) => void               // default: globalThis.clearTimeout
  baseDelayMs?: number                              // default 1000
  maxDelayMs?: number                               // default 30000
  onProtocolError?: (frame: ProtocolErrorFrame) => void
}

export interface ConnectionManager {
  connect(): void
  disconnect(): void                                // terminal: clears timer, close(1000)
  subscribe(conversationId: string): void           // ref-counted (D1)
  unsubscribe(conversationId: string): void
  getStatus(): ConnectionStatus
  getSubscriptions(): string[]                      // test seam
  onStatusChange(l: (s: ConnectionStatus) => void): () => void
  onEvent(l: (e: ChatEvent) => void): () => void
  onTerminal(l: (code: TerminalCloseCode) => void): () => void
}

export function createConnectionManager(o: ConnectionManagerOptions): ConnectionManager
```

**State machine.** `attempt` resets to `0` on every `open`. `delay(n) = min(baseDelayMs · 2ⁿ, maxDelayMs)` → `1s, 2s, 4s, 8s, 16s, 30s, 30s, …`.

| From | Trigger | To | Side effects |
|---|---|---|---|
| `idle` | `connect()` | `connecting` | `socketFactory(url)`, attach handlers |
| `connecting` | `onopen` | `open` | `attempt = 0`; send `{type:'subscribe'}` for **every** tracked id (D2) |
| `connecting` / `open` | `onclose`, code ∉ terminal, not intentional | `closed` | `setTimeout(connect, delay(attempt++))` |
| `closed` | retry timer fires | `connecting` | new socket |
| any | `onclose` code `4401`/`4403` | `closed` | no timer, `onTerminal(code)` |
| any | `disconnect()` | `closed` | `clearTimeout`, `close(1000)`, drop handlers, never retry |
| `open` | `subscribe(id)` first ref | `open` | send `{type:'subscribe', conversation_id:id}` |
| `open` | `unsubscribe(id)` last ref | `open` | send `{type:'unsubscribe', …}`, drop from map |
| `open` | `onmessage` | `open` | parse → `ChatEvent` ⇒ `onEvent`; `error` ⇒ `onProtocolError` (D5); unknown/malformed ⇒ dev warn, swallow |

`onmessage` never throws — a throw inside the handler would silently kill event delivery for the life of the socket.

### Provider — `src/realtime/WebSocketProvider.tsx`

Named `useWebSocket()` to match the repo's `AuthProvider` → `useAuth()` convention (`AuthProvider.tsx:57`), including the same "must be used inside" throw.

```ts
interface WebSocketContextValue {
  status: ConnectionStatus                                    // Decision 3: exposed, not rendered
  subscribe: (conversationId: string) => () => void           // returns unsubscribe
  on: <T extends ChatEventType>(type: T, l: (e: EventOf<T>) => void) => () => void
}
export function WebSocketProvider({ children }: { children: ReactNode }): ReactElement
export function useWebSocket(): WebSocketContextValue
```

`subscribe` and `on` are **identity-stable** (built once from refs, `useMemo`'d with an empty-ish dep list) so consumer effects keyed on `conversationId` never re-run because the context value changed. `status` lives in `useState`, fed by `onStatusChange` — a status flip re-renders the provider, so the value object must keep the same `subscribe`/`on` references across that re-render.

Lifecycle: one `useEffect` gated on `status === 'authenticated' && isStaff` from `useAuth()` creates the manager, calls `connect()`, and returns `disconnect()` as cleanup. Terminal handling:

```ts
onTerminal((code) => {
  if (code === CLOSE_UNAUTHORIZED) {
    toast.error('Tu sesión expiró. Volvé a iniciar sesión.')
    queryClient.setQueryData(['auth', 'me'], null)          // makes RequireStaff redirect
  } else {
    toast.error('No tenés permisos para el chat en tiempo real.')
    void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
  }
})
```

Deliberately **not** `queryClient.clear()` (what `logout()` does): clearing mid-render triggers a refetch storm across still-mounted components. Nulling `['auth','me']` is enough for the guard.

### `ChatPanel` wiring

A third effect, same shape as the existing detail and poll effects, inserted after the poll effect (`ChatPanel.tsx:62`):

```ts
const { subscribe, on } = useWebSocket()

useEffect(() => {
  const offSub  = subscribe(conversationId)
  const offMsg  = on('message.created', (e) => {
    if (e.conversation_id !== conversationId) return
    setMessages((prev) => mergeById(prev, [e.data]))
  })
  const offNote = on('note.created', (e) => {
    if (e.conversation_id !== conversationId) return
    setNotes((prev) => mergeById(prev, [e.data]))
  })
  return () => { offMsg(); offNote(); offSub() }
}, [conversationId, subscribe, on])
```

Identical `mergeById(prev, [data])` call as the poll path — the two sources stay indistinguishable. No `sinceRef` write (D6). The existing scroll effect already keys on `messages.length`, so WS arrivals auto-scroll for free.

**Known ≤8s race, accepted**: the detail effect does `setMessages(incoming)` — a *replace* (`ChatPanel.tsx:45`), also re-run after `detailQuery.refetch()` on send. A WS event landing in that window is overwritten and re-delivered by the next poll tick. Changing that line to a merge is out of scope for a change whose contract is "zero regression if the socket is absent".

### Sidebar cache — `useConversationListSync()`

```ts
const apply = (e: ConversationUpdatedEvent | ConversationReadEvent) => {
  queryClient.setQueriesData<Paginated<ConversationListItem>>(
    { queryKey: ['conversations', 'list'] },        // prefix match: every {search} variant
    (prev) => {
      if (!prev) return prev
      const current = prev.results.find((r) => r.id === e.data.id)
      if (!current) return prev                      // Decision 4: update-only, never insert
      return { ...prev, results: mergeById(prev.results, [{ ...current, ...e.data }]) }
    },
  )
}
```

The prefix `['conversations','list']` cannot collide with `['conversations', <id>, 'detail']` or `…'poll'` — prefix matching requires the literal `'list'` in slot 1. `mergeById`'s `JSON.stringify` comparison returns the original array when nothing actually changed, so a no-op event causes no re-render. Ordering and newly created conversations stay with the 15s refetch, as decided.

## Config

`vite.config.ts` — extend the existing conditional proxy object:

```ts
'/ws': {
  target: apiProxyTarget,
  ws: true,
  changeOrigin: true,
  configure: (proxy) => {
    // changeOrigin rewrites Host, not Origin; Channels' origin validator reads Origin.
    proxy.on('proxyReqWs', (proxyReq) => proxyReq.setHeader('origin', apiProxyTarget))
  },
},
```

`vitest.config.ts` — standalone (Vitest ignores `vite.config.ts`'s `test` field when this file exists), node env, no jsdom, no setup file, **with the `@` alias** so type-only imports from `@/api/ws` resolve during transform:

```ts
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

## Testing strategy

| Layer | What | How |
|---|---|---|
| Unit | Backoff schedule `1s,2s,4s,8s,16s,30s,30s` and reset-to-1s after a successful `open` | Fake `setTimeout` recording `(fn, ms)` pairs; assert the `ms` sequence |
| Unit | `4401`/`4403` schedule **zero** timers and fire `onTerminal`; `1006`/`1000`-from-server do schedule one | Fake socket emitting `onclose({code})`; assert timer count + listener calls |
| Unit | Resubscribe-after-reconnect sends one `subscribe` frame per tracked id, none duplicated | Subscribe 2 ids, force close, run the timer, `onopen`; assert `send` payloads |
| Unit | Ref-counting: two `subscribe(x)` then one `unsubscribe(x)` keeps `x` subscribed (StrictMode) | Assert `getSubscriptions()` |
| Unit | Malformed JSON / unknown `type` / `error` frame do not throw and do not emit `ChatEvent` | Feed raw strings to `onmessage` |
| Manual | Task 0 devtools handshake spike; two browsers, message appears <1s; kill network → reconnects; polls still work with the socket blocked | Per proposal checklist |

No component tests, no jsdom, no `@testing-library`, no CI gate — the fence from Decision 2 is part of the design, not an omission.

## Rollout

No migration. Purely additive: with `VITE_WS_URL` unset and no `/ws` route reachable, the manager cycles `connecting → closed → retry` forever in the background while the 8s/15s polls carry the app exactly as they do today. Rollback = revert the `App.tsx` provider line; every other file becomes dead code.

**Chaining.** The proposal's ~460-line estimate exceeds the 400-line review budget. The split is clean because units 1+2 introduce **zero** runtime behaviour — nothing imports `connectionManager` until unit 3:

| PR | Units | Contains | Reviewable claim |
|---|---|---|---|
| #1 | 1 + 2 | env typing, `src/api/ws.ts`, connection manager, Vitest config + tests, `vite.config.ts`, `.env.example`, README | "New pure module with tests; app behaviour byte-identical" — verified by `npm run build` + `npm test` |
| #2 | 3 + 4 | `WebSocketProvider`, `App.tsx` mount, `AppShell` line, `ChatPanel` effect, `useConversationListSync` | "Wires the module in" — verified manually against a live socket |

PR #2 targets PR #1's branch.

## Open questions

- [ ] **`sdd-spec` must pin** whether `conversation.updated` / `conversation.read` carry a full `ConversationListItem` or a delta. D7 is safe under both, but if the backend sends full rows the type should tighten to `ConversationListItem`.
- [ ] Does the backend echo an ack for `subscribe`, or is silence success? The design assumes silence; only the `{type:"error"}` frame is handled.
- [ ] `proxy.on('proxyReqWs', …)` must be confirmed against Vite 8's bundled proxy at apply time. If the hook name changed, fall back to `VITE_WS_URL=wss://agente.luisacoy.me/ws/chat/` for local dev (viable now that the cross-site cookie issue is resolved).
