## Verification Report

**Change**: chat-websocket
**Scope**: PR#1 only (Work Units 1+2 -- env config, WS protocol types, connection manager, Vitest setup+tests). PR#2 (WebSocketProvider, ChatPanel wiring, sidebar cache sync) does not exist yet and is correctly out of scope.
**Version**: N/A
**Mode**: Standard (Strict TDD off -- no test runner existed before this change; confirmed via sdd/scrapingbot-front/testing-capabilities)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 20 |
| Tasks complete | 11 (1.1-1.6, 2.1-2.5) |
| Tasks incomplete | 9 (0.1 manual spike, 3.1-3.4, 4.1-4.4 -- all correctly deferred to PR#2) |

Checked tasks.md on disk against the actual filesystem: no task is marked done that isn't actually done, and no completed work is left unmarked. src/realtime/WebSocketProvider.tsx and src/features/conversations/useConversationListSync.ts confirmed absent, matching the unchecked 3.x/4.x tasks.

### Build & Tests Execution
Build: PASSED (independently re-run, not trusted from apply-progress)

    npm run build
    > tsc -b and vite build
    4732 modules transformed.
    built in 474ms
    (pre-existing >500kB chunk-size warning, unrelated to this PR)

Tests: 10 passed / 0 failed / 0 skipped (independently re-run)

    npm test
    > vitest run
    Test Files  1 passed (1)
         Tests  10 passed (10)
      Duration  173ms

Coverage: not configured -- not available (acceptable for Standard Mode at this project stage).

### Vite proxy hook verification
Installed Vite version: 8.3.0 (checked node_modules/vite/package.json directly). Confirmed proxyReqWs is a real, emitted event in Vite bundled proxy code:

    node_modules/vite/dist/node/chunks/node.js:
      if (server) server.emit("proxyReqWs", proxyReq, req, socket, options, head);

vite.config.ts configure hook using proxy.on("proxyReqWs", ...) is correct for the installed version -- not just the apply agent's unverified claim. Task 1.1's stated outcome (no fallback needed) is confirmed accurate.

### PR#1 boundary verification (zero runtime behavior change)
Grepped across src/ for references to connectionManager and the api/ws module. Matches were found only inside src/realtime/connectionManager.ts and src/realtime/connectionManager.test.ts (both import from ../api/ws, and the test file imports connectionManager itself). No file outside src/realtime/ or src/api/ws.ts references either module. This independently confirms the size:exception justification ("new pure module with tests; app behaviour byte-identical") holds.

### Spec Compliance Matrix (testable-at-this-stage requirements only)
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Reconnection Backoff | Backoff schedule on repeated failures | connectionManager.test.ts: backs off 1s,2s,4s,8s,16s,30s,30s and resets to 1s after a successful open | COMPLIANT -- exact sequence [1000,2000,4000,8000,16000,30000,30000] asserted, plus reset-to-1000 after onopen, resolving Spec Gap #1 (backoff reset-on-success) |
| Close Code Classification | Terminal codes stop retrying | it.each([4401,4403]) treats close code as terminal | COMPLIANT -- asserts zero timers scheduled and onTerminal fires with the exact code |
| Close Code Classification | Non-terminal codes retry, including 1000 | schedules exactly one timer for a non-terminal close code, including server-sent 1000 | COMPLIANT -- this is the literal spec example (1000 retryable), asserted precisely (1 timer, 1000ms delay) |
| Subscribe on Conversation Open | Subscribe once per open conversation | resends exactly one subscribe frame per tracked id after a reconnect + ref-counts subscriptions | COMPLIANT -- exact JSON frame payload asserted; ref-count test confirms double-subscribe/single-unsubscribe leaves it subscribed |
| Resubscribe After Reconnect | Subscriptions restored after reconnect | resends exactly one subscribe frame per tracked id after a reconnect | COMPLIANT -- asserts the exact two-frame payload is resent on the new socket after onopen |
| Message Event Consumption (infra precondition only -- full dedupe is PR#2 scope) | Manager must not throw/crash on bad input | never throws and never emits a ChatEvent for malformed JSON, an unknown type, or an error frame | COMPLIANT -- malformed JSON, unknown type, and error frame all assert no throw and zero emitted events |
| Invalid Conversation Rejection | Server rejects an unknown conversation | none | UNRESOLVED -- not a PR#1 defect, see Issues below |
| Conditional Connection | -- | n/a | NOT YET IMPLEMENTED -- correctly deferred to PR#2 |
| Connection Status Exposure | -- | n/a | NOT YET IMPLEMENTED -- correctly deferred to PR#2 (status plumbing exists in the manager; context exposure is PR#2) |
| Note Event Consumption | -- | n/a | NOT YET IMPLEMENTED -- correctly deferred to PR#2 |
| Sidebar Row Replacement | -- | n/a | NOT YET IMPLEMENTED -- correctly deferred to PR#2 |
| Polling Independence | -- | n/a | NOT YET IMPLEMENTED -- nothing to regress yet, PR#1 makes zero runtime changes |
| Outbound Send Prohibition | -- | n/a | NOT YET IMPLEMENTED -- no send path exists yet, trivially true |

Compliance summary: 6/7 testable-at-this-stage scenarios compliant; 1 unresolved (flagged, not a code defect); 6 requirements correctly deferred to PR#2.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| src/api/ws.ts discriminated union shapes | Implemented | MessageCreatedEvent.data is Message, NoteCreatedEvent.data is ConversationNote, ConversationUpdatedEvent/ConversationReadEvent.data is ConversationRowPatch = Partial<ConversationListItem> and {id} -- checked field-by-field against src/api/types.ts and against design D7; exact match, no drift |
| connectionManager.ts state machine | Implemented | Matches design's state table row-for-row: idle to connecting to open on onopen (attempt reset + replay), onclose non-terminal to closed + scheduleReconnect, onclose 4401/4403 to closed + onTerminal, disconnect() clears timer + close(1000) + never retries |
| onmessage never throws | Implemented | Outer try/catch wraps JSON.parse and type dispatch; malformed/unknown/error paths all return before reaching listener dispatch |
| .env.example diff | Not independently verifiable | Sandbox rule blocks .env* content reads for all agents -- user already informed, explicitly deferred. Not re-flagged as a new item. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 Ref-counting inside connection manager | Yes | subscriptions Map<string, number>, subscribe/unsubscribe increment/decrement, only send on count 0 to 1 / 1 to 0 transitions |
| D2 Single replay-on-open code path | Yes | handleOpen is the only place iterating tracked ids to send subscribe frames; subscribe() only sends directly when already open |
| D3 Terminal only 4401/4403, server 1000 retries | Yes | isTerminalCode checks only CLOSE_UNAUTHORIZED/CLOSE_FORBIDDEN; test explicitly asserts 1000 schedules a retry timer |
| D4 Deterministic backoff, no jitter, reset on open | Yes | delay = min(baseDelayMs times 2^attempt, maxDelayMs), attempt reset to 0 in handleOpen |
| D5 Error frames to dev-only warn/callback, no throw | Yes | onProtocolError callback invoked, no UI/state change inside the manager itself |
| D9 Vitest without globals, explicit imports | Yes | connectionManager.test.ts imports describe/it/expect from vitest; vitest.config.ts has no globals:true |
| Chaining: PR#1 = units 1+2, zero runtime behavior change | Yes | Confirmed via grep -- no external importer of connectionManager or api/ws |

### Issues Found

CRITICAL: None.

WARNING:
1. Invalid Conversation Rejection requirement has no implementable path with the current protocol shape. The spec's own literal example error frame is type=error, error=conversation_not_found -- it carries no conversation_id. ProtocolErrorFrame in src/api/ws.ts (type: error, error: string) faithfully matches that literal spec example, so this is NOT a PR#1 implementation defect -- the connection manager cannot correlate a generic error frame to a specific pending conversation_id because the documented protocol does not provide one. This needs resolution (spec amendment confirming the backend actually includes conversation_id in error frames, or a documented fallback such as tracking the single most-recent unconfirmed subscribe) before PR#2 attempts to wire rejection handling, since as currently typed the requirement is unsatisfiable. Recommend routing this back through sdd-spec or backend confirmation before Phase 3 work begins, or explicitly re-flagging it as an accepted spec gap (it is currently not listed in spec.md's own Spec Gaps section, unlike backoff-reset, status-enum, close-1000, and malformed-payload, which were flagged).
2. .env.example's actual diff content remains unverified by any agent due to the sandboxed .env* read restriction. This is a carried-over, user-deferred item, not new -- flagging again only so it is not lost before merge. A human must eyeball the +12/-2 diff before this PR is merged.

SUGGESTION:
1. The Subscribe once per open conversation scenario is currently covered only incidentally (inside the resubscribe-after-reconnect test setup and the separate ref-counting test) rather than by one dedicated test asserting the single-conversation no-op-resend behavior end-to-end. Not required, existing coverage is sufficient, but a dedicated test would make intent clearer for future maintainers.
2. package-lock.json's diff (+288/-0 lines) inflates PR#1's raw diff-stat well past the ~450-line estimate in tasks.md. Reviewers should be told upfront that the lockfile diff is mechanical (single vitest devDependency addition) and does not need line-by-line review, so the accepted size:exception is not second-guessed on a misleading line count.
3. Once the backend confirms whether conversation.updated/.read send full rows or deltas (open question already tracked in design.md), tighten ConversationRowPatch to ConversationListItem if full rows are confirmed -- no code change needed now, Partial plus {id} is safe under both interpretations per D7.

### Verdict
PASS WITH WARNINGS -- PR#1's connection-manager module, protocol types, Vitest setup, and Vite proxy config are correctly and completely implemented per design/spec for the scope in force; build and tests are independently confirmed green; the zero-runtime-change boundary is independently confirmed via grep. One genuine spec-level gap (Invalid Conversation Rejection has no implementable protocol path) should be resolved before PR#2 wires subscription-rejection handling, but does not block merging PR#1 as a standalone, behavior-inert unit.

---

## Verification Report — PR#2

**Change**: chat-websocket
**Scope**: PR#2 only (Work Units 3+4 -- WebSocketProvider, App.tsx mount, useConversationListSync, AppShell/ChatPanel wiring). Base branch: feat/chat-websocket-pr1 (already committed, already verified PASS WITH WARNINGS). Working branch: feat/chat-websocket-pr2. With PR#2 done, all automatable tasks (1.1-4.3) are complete; only manual tasks 0.1 and 4.4 remain.
**Version**: N/A
**Mode**: Standard (Strict TDD off). Design deliberately fences automated tests to the connection-manager module only (PR#1) -- no new tests exist or are expected for PR#2's React wiring (no jsdom, no testing-library). Verification here is build/typecheck + close code reading against spec/design, not new test execution.

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 20 |
| Tasks complete | 18 (1.1-1.6, 2.1-2.5, 3.1-3.4, 4.1-4.3) |
| Tasks incomplete | 2 (0.1 devtools spike, 4.4 two-browser check -- both manual-only, not executable by any agent) |

Checked tasks.md on disk: 3.1-3.4 and 4.1-4.3 are checked, PR#1's marks (1.1-1.6, 2.1-2.5) are preserved, 0.1/4.4 remain unchecked. Matches filesystem state exactly.

### Build and Tests Execution
Build: PASSED (independently re-run)

    npm run build
    tsc -b and vite build
    4736 modules transformed.
    built in 418ms
    (pre-existing >500kB chunk-size warning, unrelated)

Tests: 10 passed / 0 failed / 0 skipped (independently re-run -- same connectionManager suite, unmodified by PR#2)

    npm test
    vitest run
    Test Files  1 passed (1)
         Tests  10 passed (10)
      Duration  176ms

Coverage: not configured -- not applicable (no new tests expected for this PR, per design's explicit test-scope fence).

### Diff size verification
git diff --stat feat/chat-websocket-pr1 for App.tsx, AppShell.tsx, ChatPanel.tsx gives 33 changed lines (3 files, 33 insertions, 7 deletions). Plus 2 new files: WebSocketProvider.tsx (90 lines), useConversationListSync.ts (34 lines). Total is about 157 lines -- well within the 400-line budget and close to tasks.md's ~140-line estimate. No size:exception needed for PR#2.

### Code Review -- WebSocketProvider.tsx
- useWebSocket() throw message: "useWebSocket debe usarse dentro de WebSocketProvider", compared literally against useAuth()'s "useAuth debe usarse dentro de AuthProvider" (AuthProvider.tsx:59) -- identical Spanish imperative pattern. CONFIRMED matches exactly.
- subscribe/on are built inside useMemo with a literal empty dependency array, stronger than merely "effectively empty". Both close over stable refs (managerRef, eventListenersRef), so their identity never changes across status-driven re-renders. CONFIRMED -- this is what keeps ChatPanel's effect (keyed on conversationId, subscribe, on) from re-running on every WS status flip.
- Lifecycle effect condition mirrors the design's status === 'authenticated' && isStaff gate via an early return. CONFIRMED.
- onTerminal wiring: CLOSE_UNAUTHORIZED -> toast.error + queryClient.setQueryData(['auth','me'], null) (NOT queryClient.clear()); else -> toast.error + queryClient.invalidateQueries. Cross-checked against the actual AuthProvider.tsx on this branch: logout() (line 48) does queryClient.setQueryData(['auth','me'], null) before its own queryClient.clear() (line 49) -- the provider's terminal handler reuses only the setQueryData line, exactly as the design specified, correctly omitting clear(). CONFIRMED accurate.

### Code Review -- useConversationListSync.ts
- Imports mergeById from the existing shared util file -- not reimplemented. CONFIRMED.
- setQueriesData targets the queryKey prefix ['conversations','list'] via an object filter (prefix match), not an exact array key with search. CONFIRMED it correctly targets every cached list variant.
- Updater returns prev unchanged (no insert) when the row isn't found in that cached page. When found, it spreads the full existing row and overlays the (possibly partial) event data on top before calling mergeById. Since the "found" branch requires the row to already exist, a new row can never be inserted; since the existing row's fields are spread underneath the incoming partial payload, a delta payload cannot blank any field it doesn't include. CONFIRMED safe against both full-row and delta payloads, and matches the design's own code snippet byte-for-byte.

### Code Review -- wiring diffs (git diff against feat/chat-websocket-pr1)
- App.tsx: WebSocketProvider wrapping an Outlet is mounted as a route element strictly nested below the RequireStaff route and strictly above the existing AppShell route (which itself wraps ConversationsPage/ChatPanel via its own nested Outlet and route children). Traced the actual JSX/route nesting rather than assuming from the design doc: RequireStaff (isStaff guaranteed true by RequireStaff.tsx:11-13, which renders a redirect instead of the Outlet when anonymous or non-staff, unmounting the whole subtree) -> WebSocketProvider -> AppShell -> ConversationsPage/ChatPanel. CONFIRMED: ChatPanel and AppShell are genuine React-tree descendants of WebSocketProvider, not siblings, so useWebSocket() can never throw at runtime in this route tree, and isStaff is guaranteed true whenever the provider's lifecycle effect runs.
- AppShell.tsx: useConversationListSync() is called unconditionally at the top of the component body (+3 lines), not from inside WebSocketProvider itself -- matches design decision D8 (infra folder stays free of features/ imports). CONFIRMED.
- ChatPanel.tsx: new effect added after the existing poll effect. Searched the full diff and surrounding file for any write to sinceRef inside or near the new effect -- none exists; the only sinceRef.current assignment remains inside the pre-existing, untouched poll effect. CONFIRMED -- design decision D6 honored, a WS-delivered message can never cause the poll to permanently skip a not-yet-fetched message.
- Dependency array is conversationId, subscribe, on: since subscribe/on are identity-stable, this effect only meaningfully re-runs when conversationId changes, i.e. exactly on conversation switch. Event handlers close over conversationId from the same render as the effect that registered them, further guarded by an explicit conversation_id equality check, so there is no stale-closure risk. Cleanup order (message-listener off, note-listener off, subscribe off) matches the design's own snippet exactly. CONFIRMED correct.

### StrictMode dev-only frame triplication (orchestrator-flagged item, independently confirmed)
Traced the actual call sequence through connectionManager.ts's subscribe/unsubscribe: React 18 StrictMode (confirmed active at src/main.tsx lines 2 and 20) double-invokes ChatPanel's new effect in dev. Sequence: mount -> effect runs subscribe(id) (ref count 0 to 1, sends a subscribe frame since the manager is already open) -> StrictMode's synchronous cleanup runs unsubscribe(id) (ref count 1 to 0, deletes from the map, sends an unsubscribe frame) -> effect re-runs subscribe(id) (ref count 0 to 1, sends a subscribe frame again). Net: 3 wire frames instead of 1, ending correctly subscribed. This is dev-only -- production builds do not double-invoke effects, so it never happens in the built artifact. CONFIRMED accurate. Classification: SUGGESTION (dev-only noise, no functional or spec impact, not a WARNING or CRITICAL).

### Spec Compliance -- requirements newly satisfied by PR#2 (static-code-review level; no automated tests exist for these, so "compliant" means the code correctly implements the documented behavior, not "a test asserts it")
| Requirement | Result | Notes |
|---|---|---|
| Conditional Connection | COMPLIANT (static) | Lifecycle effect gated on authenticated-and-staff; RequireStaff guarantees the gate is only reachable when both hold, and unmounts the whole subtree (running disconnect via effect cleanup) on logout or loss of staff status. |
| Connection Status Exposure | COMPLIANT (static) | status is exposed via the context value, fed by the manager's onStatusChange; no status UI is rendered anywhere in the diff. |
| Message Event Consumption | COMPLIANT (static) | ChatPanel's message.created listener filters by conversation_id match (proxy for "ignore if unsubscribed", since only the open conversation's ChatPanel instance exists) and merges via the shared mergeById. |
| Note Event Consumption | COMPLIANT (static) | Same shape as above for note.created into notes. |
| Sidebar Row Replacement | COMPLIANT (static) | useConversationListSync update-only logic verified above; cannot insert, cannot blank fields on a partial payload. |
| Polling Independence | COMPLIANT (static); runtime confirmation is manual task 4.4 | The existing 8s/15s poll effects are untouched by this diff; the new WS effect is fully independent and does not gate, block, or short-circuit the polls. No error/broken-UI state is introduced for a down or reconnecting socket. Live-socket confirmation deferred to manual task 4.4 per instructions. |
| Outbound Send Prohibition | COMPLIANT (static) | No new code path sends over the WS; ChatPanel's new effect only subscribes/listens (inbound). The existing useSendMessage HTTP flow is untouched. |
| Invalid Conversation Rejection | still UNRESOLVED (unchanged from PR#1) | Not attempted in PR#2, per instructions -- the documented error frame still lacks conversation_id to correlate against. Remains an open backend/spec question, not a PR#2 defect. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D6 no sinceRef write from WS path | Yes | Confirmed by direct inspection -- no such write exists in or near the new effect. |
| D7 tolerant Partial-plus-id patch, spread-merge | Yes | useConversationListSync spreads the current row under the incoming event data, byte-for-byte match to the design's snippet. |
| D8 sidebar sync called from AppShell, not the provider | Yes | Confirmed via diff -- the call lives in AppShell.tsx, not WebSocketProvider.tsx. |
| D10 provider mounted as inline layout route element, no new wrapper file | Yes | Confirmed via App.tsx diff -- no new file added; diff is slightly larger than the design's "about 2 lines" note purely due to JSX re-indentation of existing child routes, not new logic. |
| useWebSocket() throw matches useAuth() pattern | Yes | Confirmed literal string-pattern match. |
| subscribe/on identity-stable via empty-dep useMemo | Yes | Confirmed literal empty dependency array. |

### Issues Found (PR#2-specific)

CRITICAL: None.

WARNING: None new. Carried forward, not re-flagged as new: PR#1's "Invalid Conversation Rejection has no implementable protocol path" remains open and is correctly untouched by PR#2; the .env.example diff-unverifiable-by-sandbox item remains a pre-merge human action item from PR#1, not a PR#2 concern.

SUGGESTION:
1. StrictMode dev-only triple wire-frame send on ChatPanel mount (subscribe, unsubscribe, subscribe) -- confirmed accurate, net ref-count ends correct, production is unaffected since React does not double-invoke effects outside StrictMode dev builds. No action required; noted for awareness only.
2. WebSocketProvider's eventListenersRef map retains an empty listener set for an event type after its last listener unsubscribes (cleanup deletes the listener but never removes the now-empty set from the outer map). Harmless (bounded by the 4 known event types, never grows unbounded), but could be tightened for hygiene in a future pass.

### Verdict (PR#2)
PASS -- PR#2 correctly wires the connection manager into the React tree exactly per design (D6, D7, D8, D10, the useAuth-mirroring throw pattern, and the identity-stable subscribe/on contract). Build and tests are independently confirmed green, PR#1's connection-manager suite is unmodified and still 10 of 10. Route-tree descendant relationship (WebSocketProvider strictly above AppShell/ChatPanel, strictly below RequireStaff) is independently traced and confirmed, not assumed from the design doc. Zero CRITICAL issues, zero new WARNING issues; two dev-only/hygiene SUGGESTIONs.

---

## Overall Verdict -- Whole Change (PR#1 + PR#2 combined)

Cross-referencing PR#1's compliance matrix above against PR#2's newly-implemented requirements:

| Requirement | PR#1 status | PR#2 status | Combined |
|---|---|---|---|
| Conditional Connection | not yet implemented | implemented (static) | SATISFIED |
| Reconnection Backoff | test-verified | n/a (unchanged) | SATISFIED |
| Close Code Classification | test-verified | n/a (unchanged) | SATISFIED |
| Connection Status Exposure | not yet implemented | implemented (static) | SATISFIED |
| Subscribe on Conversation Open | test-verified (manager) | wired (ChatPanel calls subscribe) | SATISFIED |
| Resubscribe After Reconnect | test-verified | n/a (unchanged) | SATISFIED |
| Invalid Conversation Rejection | unresolved (spec gap) | not attempted (by design) | STILL OPEN -- needs sdd-spec/backend follow-up |
| Message Event Consumption | infra precondition only | implemented (static) | SATISFIED |
| Note Event Consumption | not yet implemented | implemented (static) | SATISFIED |
| Sidebar Row Replacement | not yet implemented | implemented (static) | SATISFIED |
| Polling Independence | trivially true (no changes yet) | implemented (static); live confirmation is manual task 4.4 | SATISFIED (pending user's manual 4.4) |
| Outbound Send Prohibition | trivially true (no send path yet) | implemented (static) | SATISFIED |

11 of 12 spec requirements are satisfied by the combined PR#1+PR#2 implementation, at least at the level of evidence available to an automated verifier (runtime test for the connection-manager layer, static code review for the React wiring layer, since the design deliberately fences automated tests away from the latter).

1 of 12 (Invalid Conversation Rejection) remains a genuine, unresolved spec-level gap -- not a code defect in either PR, but a protocol/spec design hole: the documented server error frame carries no conversation_id, so no implementation (in PR#1's manager or PR#2's UI layer) can correlate the rejection back to a specific pending subscribe. This was correctly left unattempted in both PRs rather than papered over with a client-side heuristic.

Manual-only tasks 0.1 and 4.4 remain unchecked and are, by design, not executable by any agent (devtools handshake spike against the deployed backend; two-browser live verification). These do not block a code-level PASS but should be run by the user before the feature is considered fully validated end-to-end in production conditions.

### Whole-change readiness for sdd-archive
Ready for archive with one carried-forward open item. All 18 automatable tasks (1.1-4.3) are complete and verified across both PRs; both PRs independently PASS (PR#1: PASS WITH WARNINGS, PR#2: PASS) with zero CRITICAL issues in either. The Invalid Conversation Rejection spec gap does not block archiving -- it is a documented, correctly-scoped-out limitation, not an incomplete task -- but it should be carried into the archive record as a known follow-up (route back through sdd-spec or backend confirmation in a future change) rather than silently dropped. Tasks 0.1 and 4.4 should remain flagged as user-owned manual verification, not blocking archive.
