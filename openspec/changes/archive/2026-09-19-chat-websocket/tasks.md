# Tasks: Chat WebSocket Consumer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR#1 ~450 / PR#2 ~140 / Total ~590 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR#1 (units 1+2) → PR#2 (units 3+4, targets PR#1's branch) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

**Decision (2026-09-19)**: user accepted `size:exception` for PR#1 (~450 lines) rather than splitting it further into two sequential PRs. PR#1 stays as designed — units 1+2 in one PR (zero runtime behavior change, connection manager travels with its own tests). PR#2 (units 3+4, ~140 lines) is within budget as-is. `sdd-apply` should implement PR#1 first under this accepted exception; `chained-pr`'s "ask maintainer for `size:exception`" step is satisfied by this explicit user decision.

**Sanity check vs. design's own ~460-line total**: design's estimate under-counts the two largest new files. `connectionManager.ts` implements a 10-row state machine (D1-D5: ref-counting, backoff, terminal classification, resubscribe replay, malformed-frame swallowing) — realistically ~150-200 lines, not a trivial module. Its co-located test file covers 5 distinct unit-test cases with fake timers/sockets — realistically ~150-180 lines. Those two files alone push **PR#1 to ~450 lines, already at/over the 400 budget on its own**, even though it is "just" units 1+2. PR#2 (~140 lines: provider ~90, wiring diffs ~50) is comfortably within budget (~20-30 min review). Net: the design's chaining boundary is still the right split point (zero behavior change until unit 3), but PR#1 itself may need a maintainer-accepted `size:exception` or a further internal split (e.g., land the manager without its test file as a stacked follow-up) if 450 lines proves accurate at apply time — flag this to the user before starting PR#1.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Env config + WS protocol types (`vite-env.d.ts`, `api/ws.ts`, `.env.example`, `vite.config.ts`, `README.md`) | PR#1 | Base = main/tracker. Zero runtime import yet. |
| 2 | Connection manager + Vitest setup/tests (`connectionManager.ts` + `.test.ts`, `vitest.config.ts`, `package.json`) | PR#1 | Same PR as unit 1 per design; tests travel with the module (no separate test task). |
| 3 | `WebSocketProvider` + `App.tsx` mount | PR#2 | Base = PR#1's branch. |
| 4 | `ChatPanel` + sidebar (`useConversationListSync`, `AppShell`) wiring | PR#2 | Same PR as unit 3 per design. |

## Task 0: Confidence Spike (non-blocking)

- [ ] 0.1 Manual: in a browser devtools console against the deployed panel, run `new WebSocket('wss://agente.luisacoy.me/ws/chat/')`; confirm the handshake succeeds (readyState → OPEN). 5-minute check, does not block coding either way — record the result. **Remains a manual step for the user to run against the deployed panel — not executable by the apply agent.**

## Phase 1: Work Unit 1 — Env config + WS protocol types (PR#1)

- [x] 1.1 Verify Vite 8's bundled http-proxy still fires the `proxyReqWs` event before writing the proxy config. If the hook name changed, fall back to documenting `VITE_WS_URL=wss://agente.luisacoy.me/ws/chat/` for local dev instead of a `/ws` proxy.
- [x] 1.2 Create `src/vite-env.d.ts` narrowing `ImportMetaEnv.VITE_WS_URL?: string`.
- [x] 1.3 Create `src/api/ws.ts`: `MessageCreatedEvent`, `NoteCreatedEvent`, `ConversationUpdatedEvent`, `ConversationReadEvent`, `ConversationRowPatch = Partial<ConversationListItem> & {id}`, `ChatEvent`/`ChatEventType`/`EventOf<T>`, `ProtocolErrorFrame`, `InboundFrame`, `OutboundFrame`, `CLOSE_UNAUTHORIZED=4401`, `CLOSE_FORBIDDEN=4403`, `TerminalCloseCode`, `resolveWsUrl()`. AC: `resolveWsUrl()` returns `VITE_WS_URL` when set, else same-origin `ws(s)://host/ws/chat/`. (Opportunistic, non-blocking: confirm with backend whether `conversation.updated`/`.read` send full rows or deltas — `ConversationRowPatch` is safe either way.)
- [x] 1.4 Extend `vite.config.ts`'s conditional proxy object with the `/ws` entry per 1.1's outcome (`ws: true`, `changeOrigin: true`, origin-header fix in `configure`, or the documented fallback).
- [x] 1.5 Extend the existing `.env.example` (already committed since `807baef`, contradicting explore/proposal's "missing file" claim — see correction notes in those docs) with a `VITE_WS_URL` entry (commented). Content not independently verifiable by any agent due to a sandbox rule blocking `.env*` reads — recommend a human review the diff before this PR merges.
- [x] 1.6 Update `README.md` "Conectar con el backend" to document `VITE_WS_URL` and the dev proxy/fallback.

## Phase 2: Work Unit 2 — Connection manager + Vitest (PR#1)

- [x] 2.1 Add `vitest` devDependency and `test`/`test:watch` scripts to `package.json`.
- [x] 2.2 Create `vitest.config.ts`: node env, `@` alias to `src`, `include: ['src/**/*.test.ts']`, no `globals` (D9).
- [x] 2.3 Create `src/realtime/connectionManager.ts` implementing `createConnectionManager()` per the public API and state-machine table: ref-counted `subscribe`/`unsubscribe` (D1), `onopen` resets `attempt=0` and replays every tracked id (D2), `delay(n)=min(baseDelayMs·2ⁿ, maxDelayMs)`, only `4401`/`4403` terminal — server `1000` retries (D3/D4), `onmessage` never throws (dev-warn + swallow on malformed/unknown/error frames per D5).
- [x] 2.4 Write `src/realtime/connectionManager.test.ts` alongside 2.3 (tests travel with the module, not a separate task): backoff `1s,2s,4s,8s,16s,30s,30s` + reset after `open`; `4401`/`4403` → zero timers + `onTerminal` fires, `1006`/`1000` → one timer scheduled; resubscribe-after-reconnect sends exactly one `subscribe` per tracked id; ref-counting keeps id subscribed after double-subscribe + single unsubscribe (StrictMode); malformed JSON/unknown `type`/`error` frame never throw and never emit a `ChatEvent`.
- [x] 2.5 Run `npm test` and `npm run build`; confirm no file outside `src/realtime/` and `src/api/ws.ts` imports the manager yet — PR#1 boundary is byte-identical app behavior.

## Phase 3: Work Unit 3 — WebSocketProvider (PR#2, base = PR#1 branch)

- [x] 3.1 Create `src/realtime/WebSocketProvider.tsx`: context + `useWebSocket()` (throws outside provider, matching `AuthProvider`/`useAuth()`); `subscribe`/`on` built once via refs + `useMemo`, identity-stable across `status` re-renders.
- [x] 3.2 Add lifecycle effect gated on `status === 'authenticated' && isStaff` (`useAuth()`): create the manager, `connect()`, cleanup calls `disconnect()`.
- [x] 3.3 Wire `onTerminal`: `4401` → toast + `queryClient.setQueryData(['auth','me'], null)`; `4403` → toast + `queryClient.invalidateQueries({queryKey:['auth','me']})`. AC: never calls `queryClient.clear()`.
- [x] 3.4 Mount `<WebSocketProvider>` as an inline layout route element in `src/App.tsx`, below `RequireStaff` and above `AppShell` (D10, ~2-line diff, no new wrapper file).

## Phase 4: Work Unit 4 — ChatPanel + sidebar wiring (PR#2)

- [x] 4.1 Create `src/features/conversations/useConversationListSync.ts`: `setQueriesData` on the `['conversations','list']` prefix, update-only-if-row-present via `mergeById`, never insert. AC: entries without the row are untouched; entries with it are replaced across every `search` variant.
- [x] 4.2 Call `useConversationListSync()` from `src/components/layout/AppShell.tsx` (D8 — not from the provider).
- [x] 4.3 Add a subscribe effect to `src/features/conversations/ChatPanel.tsx` after the existing poll effect: `subscribe(conversationId)`, `on('message.created', ...)` → `mergeById` into messages, `on('note.created', ...)` → `mergeById` into notes; cleanup unsubscribes/offs in reverse order. AC: no `sinceRef` write (D6); events for other `conversation_id`s are ignored.
- [ ] 4.4 Manual verification: two browsers, message appears <1s; kill network → reconnects; block socket entirely → 8s/15s polls still update with no error UI (Requirement: Polling Independence).
