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
