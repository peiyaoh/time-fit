# ADR 0013: Pre-release engine contract fixes

**Status:** Accepted (2026-10-05). **Supersedes:** in ADR 0002, the clause that says the
engine passes `tickId` as the claim token, and the `listActive(at)` signature. The rest of
ADR 0002 stands.

## Context
A pre-release review of PR #30 found places where the engine's port and lifecycle rules let a
documented guarantee fail. This ADR records each corrected rule. Accepted ADRs are not
rewritten.

## Decision

### 1. Claim token: one per logical claim
The engine passes a new random token (`randomUUID()`) on **each** `decisionLog.claim` call. It
no longer passes the tick's `tickId`.
- An adapter that retries a lost-response claim **inside one `claim` call** reuses the token it
  was given, so ADR 0002's retry safety is unchanged: a same-token re-claim still returns
  `claimed: true`.
- Any second claim of the same `decisionId` by the engine gets a different token and therefore
  `claimed: false`. This includes a duplicate participant row, the same participant on two
  pages, or any other repeated evaluation within one tick.
- Records still carry `tickId`, which is used for correlation in logs and analysis.

*Why:* with `tickId` as the token, every claim in a tick shared one token. A repeated
evaluation in the same tick looked like an adapter retry, and the action ran twice under one
record.

### 2. A failing decision does not release the tick early
When one decision's work rejects unexpectedly (a bug, or a faulty injected `random`), the
engine:
1. starts no further decisions in that tick;
2. waits for every decision already started to settle;
3. then rejects the tick with the first observed failure, even when that failure is
   `undefined`, `null` or `false`.

Until then the tick is still in flight. `stop()` keeps waiting, and an overlapping `tick()`
returns `{ skipped: "in-flight" }`. Actions that already timed out (ADR 0003) are detached by
design and are not awaited.

*Why:* the tick used to reject while sibling actions were still running. `stop()` then
resolved, so a host could close its storage client under a running action, and the next tick
could exceed `options.concurrency`.

### 3. The tasks port receives the evaluation window
The tasks port signature becomes `listActive(at: Date, { windowFrom: Date }) → Promise<TaskSpec[]>`.
The engine passes a detached `windowFrom` equal to the start of the tick's evaluation window
(ADR 0005: `max(lastTick, now − catchUpWindow)`).
- An adapter that filters by end date should return tasks with `activeUntil > windowFrom`,
  and still `activeFrom ≤ at`. Every occurrence in the window is later than `windowFrom`, so this
  never drops a due occurrence. Core still applies the exact per-occurrence `activeFrom` /
  `activeUntil` check (ADR 0001).
- The argument is additive. An adapter that ignores it keeps working, but if it filters
  `activeUntil > at`, it keeps the old gap until it adopts `windowFrom`.
- `@time-fit/storage-prisma` uses it. Its `maxTasks` option (default 500, at most 10,000) bounds
  the candidate tasks one call may return. More matching rows make the call throw
  `task-capacity-exceeded`, so the tick aborts at stage `tasks` instead of silently dropping
  tasks. That candidate cap is configured separately from the engine's `options.maxTasks`.

*Why:* the Prisma adapter filtered `activeUntil > now`. A task ending at 09:01 with an
occurrence at 09:00 was never evaluated by a tick at 09:02, although the memory store evaluated
it. A fixed lookback (the 24-hour maximum catch-up window) would also work, but it would count
long-expired tasks against the adapter's capacity.

### 4. A non-terminal participant page must contain at least one participant
`participants.iterate` may return an empty page only as the last page (`nextCursor: null`). An
empty page with a non-null `nextCursor` aborts the tick at stage `participants`.

*Why:* an empty page does not count toward `maxParticipants`, so an adapter returning empty
non-terminal pages made the engine page without bound. With this rule, every accepted page adds
at least one participant, so paging stops at `maxParticipants`, and no cursor bookkeeping is
needed. The supplied adapters already behave this way.

### 5. Plugin payloads are stored as their JSON form
`evidence`, `delivery` and `snapshot` values are stored as a detached copy of their JSON
serialization: `JSON.parse(JSON.stringify(value))`, the same text that the 8 KB cap of ADR 0003
measures. Functions and symbols are dropped, `Date`s become ISO strings, and the stored value
shares no references with the plugin's object. A value with no JSON form is stored as absent.
The `truncated` and `unserializable` markers are unchanged.

*Why:* the cap measured the JSON form but stored the original object. A delivery containing a
function passed the cap, then failed the store's structured clone, and left a completed send
recorded as `claimed`.

## Consequences
- Adapter authors: nothing changes if the adapter already compares tokens as ADR 0002 says.
- The conformance suite's same-token and different-token claim checks stay as they are.
