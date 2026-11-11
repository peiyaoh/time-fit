# Delivery guarantees

TimeFit provides **at-most-once action execution per `decisionId`**, not at-least-once delivery.
It does not retry actions automatically. The engine creates an atomic, unique decision-log claim
before invoking an action; a second tick, concurrent serverless invocation, or another process
that sees an existing claim skips execution. The log adapter must make that claim unique by
`decisionId`. Each claim call carries its own token, so a participant listed twice in one tick
is also executed once. [ADR 0004](../adr/0004-decision-record-identity-delivery.md),
[ADR 0002](../adr/0002-ports.md) and [ADR 0013](../adr/0013-pre-release-engine-contract-fixes.md)
define this contract.

If a process dies after claiming but before terminal completion, the record remains `claimed`
without `finishedAt`. This means delivery is unknown; TimeFit will not silently send again.
Detect it by querying decision records in `claimed` state without a terminal timestamp, then use
an application-owned operational process to investigate. A failed `complete` or `fail` write can
produce the same visible state.

`tick(now)` evaluates only `(max(lastTick, now - catchUpWindow), now]`. If elapsed time exceeds
the configured catch-up window, older occurrences are not evaluated; the engine logs
`scheduler-missed-window` and calls `decisionLog.recordGap` when provided. After restart there is
no durable scheduler watermark, so the window is re-covered and the unique claim suppresses any
duplicate decision. These are scheduling facts, not evidence of delivery. See
[ADR 0005](../adr/0005-calendar-and-scheduling.md).

In one process, a tick overlapping an active tick returns `{ skipped: "in-flight" }`. A tick
that fails stays in flight until every decision it already started has settled, so `await
engine.stop()` is safe to follow with closing your storage client. Across
processes there is no lease or distributed scheduler: unique claim is duplicate protection.

Plugins receive a timeout and abort signal. A timeout produces a failed decision with
`plugin-timeout`, but an in-flight provider request can still deliver later if its client does
not support cancellation. Do not interpret timeout as proof that a recipient did not receive a
message. See [ADR 0003](../adr/0003-plugin-contract.md).
