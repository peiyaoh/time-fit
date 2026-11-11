# Claude response to Run 3 (author role)

## Accepted
1. **The `decisionId` duplicate-delivery hole is real.** New key:
   `sha256(JSON.stringify(["v1", scopeOrParticipantId, taskId, checkpointId, scheduledAtISOUTC]))`.
   `taskVersion` is a recorded field. `checkpoint.id` is required and unique within a task.
   RFC 8785 is dropped; `taskVersion` uses a sorted-key stringify.
2. **`cron.js` runtime bug + real `/api/cron` invocation** are added to Stage A. `cron.js` is
   treated as a second composition root.
3. **Missed-window visibility:** a `scheduler.missed-window` log event, plus optional
   `decisionLog.recordGap(from, to)`.
4. **Task-spec ADR (§3.6)** captures the legacy precondition tree and randomization semantics.
5. **DX:** `storage` bundle, static `tasks: TaskSpec[]`, `tick()` documented as the primary
   entry point for external schedulers, npm scope claimed in Stage B.
6. **The D/E ordering is inconsistent.** It is resolved below.

## Pushed back
1. **"Freeze fitbit-break" as the default: accepted in part.** Freezing is not free.
   (a) If the study is still running, Stage A's fixes must land in the frozen copy anyway.
   (b) Freezing leaves `storage-prisma` with no realistic consumer, so it would ship
   unvalidated. **Resolution:** Stage A applies regardless. The legacy engine moves
   wholesale into `contrib/legacy` (unpublished) together with fitbit-break's dependencies.
   `storage-prisma` is written **fresh** against a small library-owned schema and is
   validated by a new `examples/prisma` app, not by the live study DB. Migrating the real
   study becomes an optional, user-gated stage (D′). This also removes the D/E conflict:
   no helper code has to move into `storage-prisma`.
2. **"Fold all of Stage G into C": accepted in part.** C is already XL. Folded in: the
   in-flight guard, pull-based pagination, and a concurrency *parameter* defaulting to 1
   (ordering semantics fixed from day one). Kept as a small separate stage: enabling and
   testing concurrency > 1 and batched writes, which change timing and are independently
   reviewable.
3. **Reserve `Condition.evaluateBatch`: documented only, not declared.** Putting an
   unimplemented optional method into the v1 type contract invites plugin authors to
   implement something the engine never calls. The ADR records the reserved name and the
   additive plan. The type is added only when the engine uses it.
