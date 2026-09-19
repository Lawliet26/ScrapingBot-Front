# Exploration: Real-time WebSocket chat events (chat-websocket)

> **Handoff doc updated 2026-09-19**: backend is now deployed to production and verified end-to-end (not just "archived/ready" as in the first handoff). Production WS URL is confirmed: `wss://agente.luisacoy.me/ws/chat/` (real host, not a placeholder). Nginx reverse-proxies `/ws/` → `localhost:8001` (daphne) with `proxy_read_timeout 3600s`. Handshake, subscribe (valid/invalid), and end-to-end push were all tested against production. This does not change the frontend architecture recommendation below — it resolves one of the open questions (prod WS host is now known) and adds one coordination item: **for local dev, the backend team must add `http://localhost:5173` to their allowed origins** — this is a backend-side `.env` change, not something the frontend can do itself, so it should be called out as a dependency in the proposal/tasks phase.

## Current State

Polling-only architecture, all in `src/features/conversations/`:

- `useConversationsQuery` (`src/features/conversations/hooks.ts:13-20`) — TanStack Query, key `['conversations','list',{search}]`, `refetchInterval: 15000`.
- `useConversationPoll` (same file, lines 30-42) — key `['conversations', conversationId, 'poll']`, 8s interval, fetches `ConversationDetail` (`{conversation, messages, notes, idle_warning}`).
- `useToggleBot`/`useMarkRead` (lines 44-62) — mutations call `invalidateQueries` only. **Every cache write in this codebase today is pull-based (invalidate→refetch); there is zero `setQueryData` usage anywhere.** WS `conversation.updated`/`conversation.read` handling would introduce the app's first push-based cache write.
- `ChatPanel.tsx` does NOT read messages/notes from the query cache — it copies `detailQuery.data` into local `useState` on mount, then merges poll ticks into that same state via `mergeById` (lines 42-62). Per-conversation dedupe lives at component-state level, not cache level.
- `mergeById.ts` — generic `(existing, incoming) => T[]` merge-by-id with `JSON.stringify` equality short-circuit. **Directly reusable** for WS: wrap a single incoming `message.created`/`note.created` payload as `[data]` and call `mergeById(prev, [data])`. No adapter needed.
- `AuthProvider.tsx`/`RequireStaff.tsx` — context+hook precedent (`useAuth()`), staff-gated at the route level (`App.tsx`: `/login` outside guard, everything else behind `<RequireStaff/>` → `<AppShell/>` → `<Outlet/>`).
- `main.tsx` — `QueryClientProvider` wraps everything above `App`, so `useQueryClient()` is available anywhere, including inside a future WS provider placed in the staff-gated subtree.
- **Zero `import.meta.env` usage in `src/`** — confirmed via grep. `VITE_API_PROXY` is read only inside `vite.config.ts` (Node/build-time), never shipped to the client bundle. A `VITE_WS_URL` would be this app's **first-ever client-exposed env var**.
- ~~README references a `.env.example` that does not exist in the repo (pre-existing drift).~~ **CORRECTION (2026-09-19, verified during apply)**: `.env.example` was committed since the initial scaffold commit (`807baef`) and has always existed. This was a false claim repeated by explore/proposal/design — the actual root cause: `.env.example` matches a sandbox permission rule that denies Read/Grep/Bash content access to `.env*` paths for these agents, and it was misread as "file doesn't exist" instead of "access denied." Nothing was missing; the file just needed extending (adding `VITE_WS_URL`), which the apply phase did correctly (`git status` shows it as modified, not created).
- `vercel.json` only rewrites `/api/(.*)`; no `/ws` rewrite — consistent with the handoff doc's "Vercel can't proxy WebSockets" statement.
- `package.json` has no WS library and no test runner at all (no vitest/jest) — confirms Strict TDD is off here.
- `Message`, `ConversationNote`, and `ConversationListItem` types in `src/api/types.ts` match the handoff doc's `message.created`/`note.created`/`conversation.updated` `data` shapes field-for-field — no mapping/adapter layer needed.

## Affected Areas

- `src/features/conversations/hooks.ts` — new hook(s) bridging WS events into TanStack Query cache writes and/or an event-subscription API for `ChatPanel`.
- `src/features/conversations/ChatPanel.tsx` — consume `message.created`/`note.created` for the open conversation, merge via existing `mergeById` into local state (same mechanism poll already uses).
- `src/features/conversations/mergeById.ts` — reusable unchanged.
- `src/api/types.ts` — new WS envelope types (discriminated union over `type`).
- New module needed (doesn't exist): WS client/manager, e.g. `src/features/conversations/websocket/` or `src/realtime/`.
- `AuthProvider.tsx`/`RequireStaff.tsx` — precedent pattern; a `WebSocketProvider` should live in the staff-gated subtree (e.g. wrapping `AppShell`'s `<Outlet/>`), connecting only when `isStaff === true`, disconnecting on logout.
- `vite.config.ts`, `README.md` — dev-time WS URL handling and env var docs.

## Approaches

1. **Native `WebSocket` + hand-rolled Context singleton (mirrors `AuthProvider`)** — own reconnect/backoff, subscription bookkeeping, `queryClient.setQueryData` for sidebar rows.
   - Pros: zero new deps; full control matching the handoff doc's exact close-code/backoff spec; consistent with existing context+hook conventions.
   - Cons: reconnect/backoff/dedupe-on-reconnect is exactly the timing-sensitive logic that most needs tests — and there's no test runner yet, so it ships unverified.
   - Effort: Medium.

2. **Small reconnecting-WebSocket library (partysocket/reconnecting-websocket) + thin Context wrapper** — delegate backoff timers to a maintained lib.
   - Pros: battle-tested reconnect loop; less untested in-house code for the trickiest part.
   - Cons: new dependency to vet; still need custom close-code (`4401`/`4403`) and resubscribe logic on top.
   - Effort: Low-Medium.

3. **Query-cache-centric refactor** — move `ChatPanel`'s messages/notes from local `useState` into the query cache entirely, unify poll+WS writes.
   - Pros: architecturally cleaner, single source of truth.
   - Cons: large diff, refactors working polling code, higher regression risk — belongs in a follow-up, not the first WS cut.
   - Effort: High.

## Recommendation

**Option 1**, additive only (no `ChatPanel` refactor): reuse `mergeById` into the existing local state for messages/notes, and introduce the app's first `setQueriesData` (partial-key match, not exact — the list key includes `{search}`) for sidebar row replacement. Keep diff small per the 400-line PR budget; defer Option 3's cache unification to a later change.

## Risks

- No test runner exists — reconnect/backoff/resubscribe/dedupe logic risks silent regressions. Flag to proposal: add a minimal vitest scoped only to the connection-manager module.
- List query key includes `{search}` — naive `setQueryData` on one exact key misses other cached search variants; needs `setQueriesData` with partial key matching.
- Backend closes with `4401`/`4403` on auth/staff failure — must NOT backoff-retry on these (terminal), only on network drops.
- `ChatPanel` remounts per conversation (keyed by `conversationId`) — subscription state must live in the app-wide provider, not inside `ChatPanel`, to avoid leak/miss during rapid conversation switching.
- `VITE_WS_URL` is the first client-exposed env var ever in this repo — naming and per-environment (dev/Vercel preview/prod) resolution is undecided.
- README references a nonexistent `.env.example` — pre-existing drift, likely worth fixing in the same PR.

## Open Questions for Proposal

- Env var naming for the WS URL — host is now known for prod (`wss://agente.luisacoy.me/ws/chat/`), but dev/Vercel-preview values and the variable name itself (e.g. `VITE_WS_URL`) still need deciding.
- Whether to add a minimal vitest setup scoped to the connection-manager module, given Strict TDD is off project-wide.
- Whether to ship a connection-status UI indicator now or defer to a follow-up.
- `setQueryData` (exact key) vs `setQueriesData` (partial key match) for the sidebar list cache.
- Whether to restore the missing `.env.example` in this same change.

## Backend Coordination Dependency

- **Not a frontend task, but blocks local dev testing**: the backend must add `http://localhost:5173` to its allowed WS origins (`.env`) before the socket will handshake from a local dev server. Flag this in tasks/apply as an external dependency, not something to "fix" in this repo.

## Ready for Proposal

Yes.
