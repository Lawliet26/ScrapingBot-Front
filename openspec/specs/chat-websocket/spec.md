# Chat WebSocket Consumer Specification

## Purpose

Frontend consumer for the already-deployed backend chat WebSocket (`wss://agente.luisacoy.me/ws/chat/`). Purely additive: reduces perceived latency for staff viewing conversations without replacing the existing 8s detail poll / 15s list poll, which remain the correctness backstop.

## Requirements

### Requirement: Conditional Connection

The system MUST open exactly one app-wide WebSocket connection, only while the user is authenticated AND `isStaff === true`, and MUST close it on logout or loss of staff status.

#### Scenario: Connect and disconnect gated by staff session
- GIVEN a staff-gated subtree mounts for an authenticated staff user
- WHEN `WebSocketProvider` mounts
- THEN it opens a connection to `VITE_WS_URL` (or the same-origin fallback)
- AND WHEN the user logs out, the connection closes and no reconnect is scheduled

### Requirement: Reconnection Backoff

On a non-terminal close, the system MUST automatically reconnect using exponential backoff starting at 1s, doubling each attempt, capped at 30s.

#### Scenario: Backoff schedule on repeated failures
- GIVEN the socket closes with a non-terminal code (e.g. network drop)
- WHEN reconnection is retried repeatedly without success
- THEN delays follow 1s, 2s, 4s, 8s, 16s, 30s, 30s... never exceeding 30s

### Requirement: Close Code Classification

The system MUST classify close codes `4401` and `4403` as terminal (no retry) and MUST treat every other close code as retryable, including `1000`.

#### Scenario: Terminal codes stop retrying
- GIVEN the socket closes with `4401` or `4403`
- WHEN the close handler runs
- THEN no reconnect is scheduled, AND `4401` redirects to login while `4403` shows a "no permissions" notice

#### Scenario: Non-terminal codes retry, including 1000
- GIVEN the socket closes with any code other than `4401`/`4403` (e.g. `1006`, `1000`)
- WHEN the close handler runs
- THEN backoff reconnection is scheduled per the Reconnection Backoff requirement

### Requirement: Connection Status Exposure

The system MUST expose a connection `status` value from the WebSocket hook/context reflecting lifecycle transitions, without rendering any visible indicator for it in this change.

#### Scenario: Status updates without UI
- GIVEN the connection transitions between connecting, open, and reconnecting
- WHEN each transition occurs
- THEN the exposed `status` updates accordingly and no status UI is rendered

### Requirement: Subscribe on Conversation Open

While `ChatPanel` is open for a conversation, the system MUST send `{"type":"subscribe","conversation_id":"<id>"}`, and repeat sends for an already-subscribed id MUST NOT create duplicate client-side subscription state.

#### Scenario: Subscribe once per open conversation
- GIVEN `ChatPanel` mounts for conversation `X` on a connected socket
- WHEN the subscribe message for `X` is sent
- THEN `X` is marked subscribed, and resending it for `X` is a no-op

### Requirement: Resubscribe After Reconnect

Immediately after a successful reconnect, the system MUST resend subscribe messages for every conversation that was subscribed before the drop.

#### Scenario: Subscriptions restored after reconnect
- GIVEN conversations `X` and `Y` were subscribed before a drop
- WHEN the socket reconnects
- THEN subscribe messages for both `X` and `Y` are sent before any other action

### Requirement: Invalid Conversation Rejection

When the server responds to a subscribe with an error frame (`invalid_conversation_id` or `conversation_not_found`), the system MUST NOT mark that `conversation_id` as subscribed.

#### Scenario: Server rejects an unknown conversation
- GIVEN a subscribe is sent for a nonexistent `conversation_id`
- WHEN the server replies `{"type":"error","error":"conversation_not_found","conversation_id":"<id>"}`
- THEN the id is not marked subscribed and is not resent after a future reconnect

Backend confirmed and deployed (2026-09-19): `invalid_conversation_id` and `conversation_not_found` echo `conversation_id`; `invalid_json`, `unknown_type`, and `missing_conversation_id` do not (no id is parseable/available in those cases). Implemented in `connectionManager.ts`: on a rejection error carrying `conversation_id`, the id is deleted from the subscription map outright (not merely decremented), so it is never resent after a reconnect regardless of local ref count.

### Requirement: Message Event Consumption

On `message.created`, the system MUST merge the message into the matching open, subscribed conversation's list by `id` via the existing `mergeById`, and MUST ignore events for conversations not currently subscribed.

#### Scenario: Append and dedupe against HTTP-sent message
- GIVEN `ChatPanel` is open and subscribed for conversation `X`, and a message `id = m1` already exists from the sender's own POST response
- WHEN a `message.created` event for `X` with `id = m1` arrives
- THEN `mergeById` produces no duplicate; a genuinely new `id` is appended instead

#### Scenario: Ignore event for unsubscribed conversation
- GIVEN the client is not subscribed to conversation `Z`
- WHEN a `message.created` event for `Z` arrives
- THEN it is discarded and does not affect any panel state

### Requirement: Note Event Consumption

On `note.created` for the open, subscribed conversation, the system MUST merge the note into that conversation's notes panel by `id` via `mergeById`.

#### Scenario: New note appears deduped
- GIVEN `ChatPanel` is open for conversation `X`
- WHEN a `note.created` event for `X` arrives
- THEN the note appears in `X`'s notes panel, deduped by `id`

### Requirement: Sidebar Row Replacement

On `conversation.updated` or `conversation.read`, the system MUST update the matching row (by `id`) inside `Paginated.results` for every cached query entry matched by the partial key `['conversations','list']`, updating only if the row is already present — never inserting a new row.

#### Scenario: Update propagates to every cached search variant that has the row
- GIVEN cached list entries exist for two different `search` values, both containing row `c1`
- WHEN a `conversation.updated` event for `c1` arrives
- THEN both entries' `c1` row is replaced with the pushed data

#### Scenario: Filtered-out cache entry is not modified
- GIVEN a cached entry for `search="foo"` does NOT contain row `c2`
- WHEN a `conversation.updated` event for `c2` arrives
- THEN that entry is left unchanged; `c2` is not inserted

### Requirement: Polling Independence

The existing 8s detail poll and 15s list poll MUST continue functioning identically regardless of WebSocket connection state, and no error or broken-UI state MUST be shown for a down or reconnecting socket, except the terminal-close notices defined above.

#### Scenario: Polling unaffected by a down socket
- GIVEN the WebSocket has failed to connect or is mid-backoff
- WHEN the 8s and 15s poll intervals elapse
- THEN both polls execute and update state exactly as without the WebSocket feature, with no error UI shown

### Requirement: Outbound Send Prohibition

The system MUST NOT send outgoing chat messages over the WebSocket; sending MUST remain the existing HTTP `POST` flow.

#### Scenario: Sending stays HTTP-only
- GIVEN a staff user sends a message via `useSendMessage`
- WHEN the send executes
- THEN the message is sent via HTTP POST only and no WS frame is emitted for it

## Resolution Status (as of archive, 2026-09-19)

Resolved during design/implementation:

1. **Backoff reset-on-success**: resolved. The connection manager's `attempt` counter resets to `0` on every successful `open`, confirmed by `connectionManager.test.ts`'s explicit "resets to 1s after a successful open" assertion.
2. **`status` enum values**: resolved. `ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed'` (`src/realtime/connectionManager.ts`).
3. **Close code `1000`**: accepted design decision, not a gap. The handoff doc calls a server-sent `1000` a backend config issue, but this spec's binary 4401/4403-only terminal rule (Close Code Classification) makes it retryable by design — a clean server close (e.g. a daphne redeploy) should reconnect, not give up. Documented, accepted operational tradeoff.
4. **Malformed pushed-event payload**: resolved. `connectionManager.ts`'s `onmessage` handler never throws — malformed JSON or an unrecognized `type` triggers a dev-only `console.warn` and is swallowed, with no `ChatEvent` emitted. Covered by a dedicated test.

5. **Invalid Conversation Rejection**: resolved 2026-09-19. Backend confirmed the original handoff doc was accurate (the error frame did NOT carry `conversation_id`) and shipped a fix: `invalid_conversation_id`/`conversation_not_found` now echo `conversation_id`. Frontend implemented the correlation in `connectionManager.ts` (branch `fix/chat-websocket-invalid-conversation-rejection`, stacked on PR#2) with dedicated unit tests. All 12 requirements in this spec are now satisfied.
