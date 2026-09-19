# Proposal: Push real-time chat events into the panel without touching the polling backstop

**Change**: `chat-websocket` · **Project**: `scrapingbot-front` · **Phase**: propose · **Artifact store**: hybrid

## Summary

The backend chat WebSocket is built, deployed and verified in production (`wss://agente.luisacoy.me/ws/chat/`, nginx → daphne, staff-only, session-cookie auth). This change adds the **frontend consumer**: a single app-wide WebSocket connection, opened only inside the staff-gated subtree, that pushes `message.created` / `note.created` into the open `ChatPanel` and `conversation.updated` / `conversation.read` into the sidebar list cache. It is **purely additive** — the existing 8s detail poll and 15s list poll stay exactly as they are and remain the correctness backstop. Success = a staff user sees an inbound WhatsApp message appear in under ~1s instead of up to 8s, with zero regression if the socket never connects.

**Why now**: the backend side is already paid for and live; every day without the frontend consumer is latency the users feel and a deployed capability earning nothing.

## Key decisions

| # | Question | Decision | Why |
|---|---|---|---|
| 0 | Can the prod front even authenticate over this socket? | **RESOLVED by backend (2026-09-19)** — `SESSION_COOKIE_DOMAIN=.luisacoy.me` + `SameSite=None; Secure` in prod, dev unchanged. E2E verified: `101` + real event received. Devtools spike kept as a non-blocking sanity check. | New finding, not raised by exploration, confirmed and fixed by backend. See [resolution](#blocking-risk-cross-site-cookie-on-the-production-handshake--resolved-backend-2026-09-19). |
| 1 | Env var name + per-env values | **`VITE_WS_URL`**, full absolute URL, optional with a `window.location`-derived fallback | See [Decision 1](#decision-1-vite_ws_url) |
| 2 | Minimal Vitest for the connection manager? | **Yes** — node-env Vitest, scoped to one pure module only | See [Decision 2](#decision-2-minimal-vitest-yes-tightly-fenced) |
| 3 | Connection-status UI indicator? | **Defer the visible indicator, ship the state** | See [Decision 3](#decision-3-defer-the-indicator-expose-the-state) |
| 4 | `setQueryData` vs `setQueriesData` for the sidebar | **`setQueriesData`** with partial key + **update-only-if-present** over `Paginated.results` | See [Decision 4](#decision-4-setqueriesdata-update-only-never-insert) |
| 5 | Restore the missing `.env.example`? | **Yes**, plus the README env section | See [Decision 5](#decision-5-restore-envexample) |
| 6 | Scope boundary | Receive-only; HTTP POST stays authoritative for sending | See [Out of scope](#out-of-scope-explicit) |

## Intent

| | |
|---|---|
| **Problem** | Chat updates arrive only on a poll tick — up to 8s for an open conversation, up to 15s for the sidebar. Staff answering WhatsApp in real time feel that lag as "the panel is slow". |
| **Why now** | The backend WS is deployed and verified end-to-end. The capability exists and is unused. |
| **Success looks like** | (1) An inbound message lands in the open `ChatPanel` in ~1s. (2) Sidebar rows update without waiting for the 15s refetch. (3) If the socket fails to connect or drops, behaviour is *identical to today* — no error UI, no lost messages, polling covers it. (4) No change to how messages are sent. |
| **Non-goal** | Removing or slowing the polls. They stay as-is; this change earns its keep on latency only, not on request volume. |

## In scope

- `VITE_WS_URL` env plumbing (first client-exposed env var in this repo) + `.env.example` + README env docs.
- WS protocol types in `src/api/` — a discriminated union over `type` for the inbound envelopes.
- A framework-free connection manager module: connect, exponential backoff, terminal close-code classification (`4401`/`4403` never retry), subscription bookkeeping, resubscribe-on-reconnect.
- Minimal Vitest config + unit tests for **that module only**.
- A `WebSocketProvider` + hook, mounted inside the staff-gated subtree, connecting only when `status === 'authenticated' && isStaff`, disconnecting on logout.
- `ChatPanel` consumes `message.created` / `note.created` for the open conversation via the existing `mergeById`.
- Sidebar list cache push-update for `conversation.updated` / `conversation.read`.

## Out of scope (explicit)

| Excluded | Reason |
|---|---|
| Sending messages over WS | HTTP `POST /api/conversations/{id}/messages/` stays authoritative per the handoff doc. `useSendMessage` is untouched. |
| Per-staff unread counts | Backend-decided out of scope. |
| WhatsApp delivery-status push | Backend-decided out of scope. |
| `mark_address_modified` / `mark_pending_modify` / `clear_pending_modify` events | Backend-decided out of scope. |
| Removing or reducing the 8s / 15s polls | They are the backstop that makes decision 3 safe. Revisit only after the socket has proven itself in prod. |
| Moving `ChatPanel` messages/notes into the query cache (exploration Option 3) | Large diff, refactors working code, unrelated regression risk. Follow-up change. |
| Fixing README's references to nonexistent `docs/api-frontend.md` / `docs/frontend-react-plan.md` | Pre-existing drift unrelated to this change. Noted, not fixed here. |
| React component tests, jsdom, `@testing-library`, a CI test gate | See decision 2 — the fence is deliberate. |

## Approach

Native `WebSocket` wrapped in a React Context singleton, mirroring the existing `AuthProvider` / `RequireStaff` pattern. No new runtime dependency. Additive only.

```
main.tsx  QueryClientProvider
  App.tsx  AuthProvider
    <RequireStaff>            ← isStaff guaranteed true below this line
      <WebSocketProvider>     ← NEW: owns the single socket + subscription registry
        <AppShell><Outlet/>
          ChatPanel           ← subscribes to its conversationId, merges via mergeById
```

Three reasons this shape and not another:

1. **Zero new deps, and the tricky part is the part we'd have to write anyway.** A reconnecting-websocket library buys us the backoff timer but we'd still hand-roll close-code `4401`/`4403` classification and resubscribe-on-reconnect — the actual risk. Decision 2 covers that risk directly with tests instead of with a dependency.
2. **The provider must outlive `ChatPanel`.** `ChatPanel` is keyed by `conversationId` and remounts on every conversation switch. Subscription state living in the component would leak or drop events during rapid switching. App-wide provider, component-level subscribe/unsubscribe.
3. **`mergeById` already is the dedupe contract.** Poll ticks and WS pushes become indistinguishable to `ChatPanel`: wrap the incoming payload as `[data]` and call `mergeById(prev, [data])`. No adapter, no new dedupe logic, and the two paths can't diverge.

### Decision 1: `VITE_WS_URL`

Name: **`VITE_WS_URL`**. Holds a **full absolute URL including the path**, not a host fragment — string concatenation of protocol/host/path across three environments is exactly where this kind of config breaks silently.

The var is **optional**. When unset, derive same-origin: `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/chat/`. This keeps the repo's existing "prod needs no env var" philosophy intact for any future same-origin deployment, and makes local dev work without a `.env` when the Vite proxy path is used.

| Environment | Value | Note |
|---|---|---|
| Local dev | *unset* → `ws://localhost:5173/ws/chat/` via a new Vite dev proxy entry (`ws: true`) | Preferred; see cross-team dependency below |
| Local dev (direct) | `ws://localhost:8000/ws/chat/` | Requires the backend origin allowance |
| Vercel preview | `wss://agente.luisacoy.me/ws/chat/` | Same as prod — preview has no separate backend |
| Production | `wss://agente.luisacoy.me/ws/chat/` | Confirmed live |

Two consequences to record: `import.meta.env` values are **inlined at build time**, so changing this requires a redeploy, not an env toggle. And this introduces `src/vite-env.d.ts` typing for the var, since the repo has zero `import.meta.env` usage today.

### Decision 2: minimal Vitest — yes, tightly fenced

**Yes.** This is the app's first test infrastructure and that deserves justification rather than reflex.

Arguments for: the connection manager is pure timer-and-state logic — exponential backoff intervals, "is this close code terminal", resubscribe set reconciliation after reconnect. You cannot manually verify that by clicking; you'd have to kill the network repeatedly and stopwatch the retries. It is simultaneously the highest-risk and the least observable code in the change. Vitest is roughly one devDependency and ten lines of config on a repo that already runs Vite 8 — no new toolchain, no new mental model.

Arguments against, and why they lose: "scope creep" is real, so the fence is explicit — **node environment, no jsdom, no `@testing-library`, no component tests, no CI gate**. Tests cover one module and nothing else. If that fence is ever crossed it should be a separate, deliberate change.

**This decision shapes the design**: the connection manager must be written as a pure factory with injected dependencies — `createConnectionManager({ url, socketFactory, setTimeout })` — so it is testable without a DOM `WebSocket`. That is a design constraint `sdd-design` must honour, not an afterthought.

### Decision 3: defer the indicator, expose the state

**Do not ship a visible connected/disconnected indicator in v1. Do expose `status` from the context hook** so a follow-up can render it with zero refactor.

Rationale: the 8s and 15s polls stay running. A dropped socket is therefore *not* a broken app — it is today's app. Painting a red "disconnected" banner would tell users something is wrong when nothing user-facing is, and would train them to ignore it. Ship the degradation silently; the poll is the contract.

One deliberate exception: close codes **`4401` / `4403` are not degradation** — they mean the session died or staff status was lost, and polling will fail too. Those get the existing pattern (a `sonner` toast plus letting the existing auth guard redirect to `/login`), not a new UI surface.

### Decision 4: `setQueriesData`, update-only, never insert

Confirmed — `setQueryData` on an exact key is wrong here because `['conversations','list',{search}]` carries a variable `search`, so any cached search variant other than the active one would silently go stale.

Two corrections to the exploration's assumed shape, both verified against the source:

1. The cached value is **`Paginated<ConversationListItem>`** (`fetchConversations`, `src/api/conversations.ts:19-27`), not a bare array. The updater must map `prev.results`, not `prev`.
2. `mergeById` at the list level would **append unknown rows**. That is wrong when a `search` filter is active: a conversation that does not match the filter would be injected into that filtered cache entry. So the list updater is **update-if-present only** — never insert.

```ts
queryClient.setQueriesData<Paginated<ConversationListItem>>(
  { queryKey: ['conversations', 'list'] },        // partial match: every {search} variant
  (prev) => {
    if (!prev?.results.some((r) => r.id === data.id)) return prev   // never insert
    return { ...prev, results: mergeById(prev.results, [data]) }
  },
)
```

Newly created conversations and row **ordering** are deliberately left to the existing 15s `refetchInterval`, which respects the server-side search filter and sort. `mergeById` preserves insertion order, so a pushed update will not jump a row to the top — accepted for v1, and the reason the list poll stays.

### Decision 5: extend `.env.example`

**Yes.** ~~README already instructs `cp .env.example .env` against a file that does not exist — pre-existing drift.~~ **Correction (2026-09-19, verified during apply)**: `.env.example` already exists and is committed (since `807baef`) with `VITE_API_PROXY` documented — the "missing file" claim was wrong, caused by a sandbox rule that blocks these agents from reading `.env*` content and got misread as absence. The actual, smaller task: extend the existing file with `VITE_WS_URL`, and update the README "Conectar con el backend" section to document the WS var and the dev proxy. Unrelated README drift stays out (see out-of-scope table).

## Blocking risk: cross-site cookie on the production handshake — RESOLVED (backend, 2026-09-19)

**Original finding, not surfaced during exploration, confirmed accurate by the backend team. Now fixed and deployed.**

Backend implemented Option A (env-driven), commit `701ce1f`:

```python
SESSION_COOKIE_DOMAIN = os.getenv("DJANGO_SESSION_COOKIE_DOMAIN", "")          # dev: host-only
SESSION_COOKIE_SAMESITE = os.getenv("DJANGO_SESSION_COOKIE_SAMESITE", "Lax")   # dev: Lax
CSRF_COOKIE_SAMESITE = os.getenv("DJANGO_CSRF_COOKIE_SAMESITE", "Lax")
```

- **Dev (localhost) unchanged**: host-only + `Lax` — nothing for this repo to do differently locally.
- **Prod**: `SESSION_COOKIE_DOMAIN=.luisacoy.me`, `SameSite=None`, `Secure=True`. `CSRF_TRUSTED_ORIGINS` already included both `panel.luisacoy.me` and `agente.luisacoy.me`, no change needed there.
- Backend added 13 tests (`TestCookieCrossSiteWebSocket`), full suite 1125 passed, verified in prod containers (`DOMAIN='.luisacoy.me'`, `SESSION_SAMESITE=None`) and with a real E2E handshake: cookie emitted with `Domain=.luisacoy.me` + `Secure=True`, handshake returns `101`, event received in real time.
- **Security tradeoff, accepted by backend as a deliberate decision**: the session cookie is now shared across every `*.luisacoy.me` subdomain. An XSS on any one of them exposes the session on all of them. This is the standard cost of multi-subdomain-plus-direct-WS and is documented, not something the frontend can mitigate — noted here for awareness, no frontend action required.

**Remaining verification** (kept as a lightweight step, no longer blocking planning): run `new WebSocket('wss://agente.luisacoy.me/ws/chat/')` in devtools against the deployed panel before `sdd-apply` starts, to catch the one thing the backend's server-side test can't: real browser behavior (e.g. third-party-cookie blocking in the staff user's actual browser). This is now Task 0's acceptance check rather than a go/no-go gate on the whole change.

<details>
<summary>Original finding (for the record — kept for traceability, superseded by the resolution above)</summary>

The evidence, all verified in this repo:

- `vercel.json:3` rewrites `/api/(.*)` → `https://productos.luisacoy.me/api/$1`. The browser only ever sees **same-origin** `/api` calls against the front's own origin, so the Django `sessionid` cookie is scoped to the **front origin**, not to a backend host.
- The WS host is **`agente.luisacoy.me`** — a different host from both the front origin and the API host `productos.luisacoy.me`.
- `README.md:77` states the deployment relies on `SameSite=Lax` cookies.

`new WebSocket('wss://agente.luisacoy.me/ws/chat/')` from the front origin is a **cross-site** handshake. A `SameSite=Lax`, host-scoped cookie will **not** be attached to it — the handshake is not a top-level navigation. Expected outcome: the backend sees an anonymous connection and closes with `4401`, in production, regardless of how correct our client code is. Vercel rewrites cannot proxy WebSockets, so we cannot make it same-origin the way `/api` is. The backend's "verified end-to-end in production" was very plausibly exercised from an origin that *does* share the cookie — not from this front.

**Task 0 of this change** (before writing any feature code): open the deployed front, run `new WebSocket('wss://agente.luisacoy.me/ws/chat/')` in devtools, and observe whether the handshake authenticates or closes `4401`.

If it closes `4401`, this becomes a second cross-team dependency and the backend must do some combination of: set `SESSION_COOKIE_DOMAIN=.luisacoy.me` with `SameSite=None; Secure`, **and** the front must be served from a `*.luisacoy.me` subdomain rather than a `*.vercel.app` domain. Changing the session cookie's SameSite policy is a security-relevant decision affecting the whole product, not a frontend toggle — it belongs to the backend team, and it may push the prod path of this change behind an infra change.

</details>

## Cross-team dependency: local dev origin

**Not fixable in this repo.** The backend must add `http://localhost:5173` to its allowed WS origins (backend-side `.env`). Until then the socket will not handshake from `npm run dev`, which blocks local development and verification.

Two fallbacks, in preference order, so this does not stall:

1. **Vite dev proxy with `ws: true`** — add a `/ws` entry to `server.proxy` in `vite.config.ts` targeting `VITE_API_PROXY`, rewriting the `Origin` header on `proxyReqWs` to the backend's own origin. The dev socket then becomes same-origin at `ws://localhost:5173/ws/chat/` and no backend change is needed. This is the recommended unblock and is already reflected in decision 1's dev row.
2. **Develop against the deployed backend** using `VITE_WS_URL=wss://agente.luisacoy.me/ws/chat/` — only viable once the blocking risk above is resolved, since it has the same cross-site cookie problem.

**Recommended action**: raise both the localhost origin allowance and the `4401` cross-site question with the backend team **now**, in parallel with `sdd-spec` / `sdd-design`, so neither blocks `sdd-apply`.

## Rough shape of the work (not the task breakdown — that's `sdd-tasks`)

| # | Work unit | Touches | Est. lines |
|---|---|---|---|
| 0 | Prod handshake verification spike | none (manual) | 0 |
| 1 | Env config + WS protocol types | `vite.config.ts`, `src/vite-env.d.ts`, `.env.example`, `README.md`, new WS types module | ~80 |
| 2 | Connection manager + Vitest setup + tests | new pure module, `vitest.config.ts`, `package.json`, one test file | ~200 |
| 3 | `WebSocketProvider` + subscription hook | new provider/hook, `App.tsx` mount | ~120 |
| 4 | Wire into `ChatPanel` + sidebar cache | `ChatPanel.tsx`, `hooks.ts` | ~60 |

**Diff budget warning for `sdd-tasks`**: the total lands around **~460 changed lines including tests, which exceeds the 400-line review budget.** The natural split is two chained PRs — **units 1+2** (plumbing and pure logic, zero behaviour change, independently reviewable and mergeable) then **units 3+4** (the behaviour). `sdd-tasks` should plan for chaining; per the cached `ask-on-risk` delivery strategy the orchestrator will confirm with the user at that point.

## Checklist before `sdd-apply`

- [x] Blocking cross-site cookie risk — resolved and deployed by backend (2026-09-19), server-side E2E verified
- [ ] Task 0 devtools spike — non-blocking sanity check of the real browser handshake (third-party-cookie blocking, etc.)
- [ ] Backend has allowed `http://localhost:5173`, **or** the Vite `ws: true` proxy fallback is confirmed working
- [ ] `sdd-spec` has pinned the exact inbound envelope shapes against the backend handoff doc
- [ ] `sdd-design` has honoured the injectable-dependencies constraint on the connection manager (decision 2)
- [ ] Chaining decision made for the ~460-line diff

## Next step

Both backend blockers are cleared (cross-site cookie resolved 2026-09-19; local-dev origin has a frontend-only fallback via the Vite `ws: true` proxy either way). Proceed to `sdd-spec` and `sdd-design` in parallel — nothing gates them anymore.
