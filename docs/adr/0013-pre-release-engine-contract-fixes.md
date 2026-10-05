# ADR 0013: Pre-release engine contract fixes

**Status:** Accepted (2026-10-05). **Supersedes:** the clause of ADR 0002 that says the
engine passes `tickId` as the claim token. The rest of ADR 0002 stands.

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

## Consequences
- Adapter authors: nothing changes if the adapter already compares tokens as ADR 0002 says.
- The conformance suite's same-token and different-token claim checks stay as they are.
